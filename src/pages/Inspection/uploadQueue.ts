/** Where a queued job is. */
export type JobStatus = "queued" | "uploading" | "failed";

/** Waits `ms` milliseconds; a test passes one that returns at once. */
export type Sleep = (ms: number) => Promise<void>;

/** How long to wait before each retry of a job that failed for a reason that may pass (no signal, a server hiccup). */
export const DEFAULT_BACKOFF_MS = [2_000, 4_000, 8_000, 16_000, 30_000];

/**
 * True when retrying cannot help: the server understood the request and refused it (400, 404, 409, 410 and the like). A
 * dropped connection, a timeout (408), too many requests (429) and any 5xx are worth another try. The error is read by shape
 * (a numeric `status`), so this file knows nothing about HTTP clients.
 */
export function isPermanentFailure(error: unknown): boolean {
  const status =
    typeof error === "object" && error !== null
      ? (error as { status?: unknown }).status
      : undefined;
  return (
    typeof status === "number" &&
    status >= 400 &&
    status < 500 &&
    status !== 408 &&
    status !== 429
  );
}

interface Job {
  run: () => Promise<void>;
  status: JobStatus;
  error: unknown;
  /** True from the first attempt until the job succeeds or is refused, including the waits between retries. */
  inFlight: boolean;
}

interface QueueOptions {
  /** Called after every change of any job, so the screen can redraw. */
  onChange?: () => void;
  sleep?: Sleep;
  backoffMs?: number[];
}

/**
 * A line of uploads, one at a time, that does not give up on a weak signal.
 * - A job that fails for a reason that may pass is tried again after 2, 4, 8, 16 and then every 30 seconds, for as long as the
 *   page is open; `retryNow()` skips the wait (the phone says it is back online).
 * - A job the server refused (see `isPermanentFailure`) stops as `failed` and waits for `retry(key)`, the driver's tap.
 * - A job with the same key as one still waiting replaces it (the newest data wins). One already in flight is left to finish and
 *   the new one follows it.
 *
 * Express comparison: a tiny job queue with concurrency 1, like `p-queue`, but with retry built in.
 */
export class UploadQueue {
  private readonly options: QueueOptions;
  private readonly jobs = new Map<string, Job>();
  /** New jobs for keys whose job was in flight when they came in. */
  private readonly followUps = new Map<string, () => Promise<void>>();
  private order: string[] = [];
  private pumping = false;
  private wake: (() => void) | null = null;
  private settledWaiters: ((failed: string[]) => void)[] = [];

  constructor(options: QueueOptions = {}) {
    this.options = options;
  }

  /** Puts a job in line (or replaces the waiting job of the same key). */
  enqueue(key: string, run: () => Promise<void>): void {
    const existing = this.jobs.get(key);
    if (existing?.inFlight) {
      this.followUps.set(key, run);
    } else {
      this.jobs.set(key, {
        run,
        status: "queued",
        error: null,
        inFlight: false,
      });
      if (!this.order.includes(key)) this.order.push(key);
    }
    this.changed();
    void this.pump();
  }

  /** Tries a failed job again now (the driver tapped it). */
  retry(key: string): void {
    const job = this.jobs.get(key);
    if (!job || job.status !== "failed") return;
    job.status = "queued";
    job.error = null;
    this.changed();
    void this.pump();
  }

  /** Cuts the wait before the next retry short. */
  retryNow(): void {
    this.wake?.();
  }

  status(key: string): JobStatus | undefined {
    return this.jobs.get(key)?.status;
  }

  /** The last error of a job, for showing a reason. */
  errorOf(key: string): unknown {
    return this.jobs.get(key)?.error ?? null;
  }

  /** Jobs not finished yet (waiting, running, retrying or failed). */
  get pending(): number {
    return this.jobs.size;
  }

  /**
   * Resolves when nothing is waiting, running or retrying any more, with the keys of the jobs the server refused (they wait for
   * `retry`). An empty list means everything went through.
   */
  settled(): Promise<string[]> {
    if (this.isSettled()) return Promise.resolve(this.failedKeys());
    return new Promise((resolve) => this.settledWaiters.push(resolve));
  }

  private isSettled(): boolean {
    return [...this.jobs.values()].every((job) => job.status === "failed");
  }

  private failedKeys(): string[] {
    return [...this.jobs.entries()]
      .filter(([, job]) => job.status === "failed")
      .map(([key]) => key);
  }

  private changed(): void {
    this.options.onChange?.();
  }

  private async pump(): Promise<void> {
    if (this.pumping) return;
    this.pumping = true;
    try {
      for (;;) {
        const key = this.order.find(
          (k) => this.jobs.get(k)?.status === "queued",
        );
        if (key === undefined) break;
        await this.runOne(key);
      }
    } finally {
      this.pumping = false;
    }
    if (this.isSettled()) {
      const waiters = this.settledWaiters;
      this.settledWaiters = [];
      const failed = this.failedKeys();
      for (const resolve of waiters) resolve(failed);
    }
  }

  private async runOne(key: string): Promise<void> {
    const job = this.jobs.get(key)!;
    const backoff = this.options.backoffMs ?? DEFAULT_BACKOFF_MS;
    const sleep = this.options.sleep ?? this.interruptibleSleep;
    job.inFlight = true;
    job.status = "uploading";
    this.changed();
    for (let attempt = 0; ; attempt += 1) {
      try {
        await job.run();
        break;
      } catch (error) {
        job.error = error;
        if (isPermanentFailure(error)) {
          job.status = "failed";
          job.inFlight = false;
          this.changed();
          return;
        }
        // Waiting to try again: still in line, still "uploading" as far as the screen is concerned.
        await sleep(backoff[Math.min(attempt, backoff.length - 1)]);
      }
    }
    // Done: take it out of line, then start the job that arrived while it ran, if any.
    job.inFlight = false;
    this.jobs.delete(key);
    this.order = this.order.filter((k) => k !== key);
    const followUp = this.followUps.get(key);
    if (followUp) {
      this.followUps.delete(key);
      this.jobs.set(key, {
        run: followUp,
        status: "queued",
        error: null,
        inFlight: false,
      });
      this.order.push(key);
    }
    this.changed();
  }

  /** A sleep that `retryNow()` can cut short. */
  private readonly interruptibleSleep: Sleep = (ms) =>
    new Promise<void>((resolve) => {
      const finish = () => {
        clearTimeout(timer);
        this.wake = null;
        resolve();
      };
      const timer = setTimeout(finish, ms);
      this.wake = finish;
    });
}
