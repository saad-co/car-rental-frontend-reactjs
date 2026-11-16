import { describe, expect, it } from "vitest";
import { isPermanentFailure, UploadQueue } from "./uploadQueue";

const httpError = (status: number) =>
  Object.assign(new Error(`HTTP ${status}`), { status });
const instant = () => Promise.resolve();

describe("isPermanentFailure()", () => {
  it("is true when the server understood and refused", () => {
    for (const status of [400, 404, 409, 410, 413]) {
      expect(isPermanentFailure(httpError(status))).toBe(true);
    }
  });

  it("is false when trying again can help", () => {
    for (const status of [408, 429, 500, 502, 503]) {
      expect(isPermanentFailure(httpError(status))).toBe(false);
    }
    expect(isPermanentFailure(new TypeError("Failed to fetch"))).toBe(false);
    expect(isPermanentFailure(undefined)).toBe(false);
    expect(isPermanentFailure("text")).toBe(false);
  });
});

describe("UploadQueue", () => {
  it("runs jobs one at a time, in the order they came", async () => {
    const log: string[] = [];
    let active = 0;
    const queue = new UploadQueue({ sleep: instant });
    for (const key of ["a", "b", "c"]) {
      queue.enqueue(key, async () => {
        active += 1;
        expect(active).toBe(1);
        log.push(`start ${key}`);
        await Promise.resolve();
        log.push(`end ${key}`);
        active -= 1;
      });
    }
    expect(await queue.settled()).toEqual([]);
    expect(log).toEqual([
      "start a",
      "end a",
      "start b",
      "end b",
      "start c",
      "end c",
    ]);
    expect(queue.pending).toBe(0);
  });

  it("retries a job that fails for a reason that may pass, with the backoff waits", async () => {
    const waits: number[] = [];
    let calls = 0;
    const queue = new UploadQueue({
      sleep: (ms) => {
        waits.push(ms);
        return Promise.resolve();
      },
    });
    queue.enqueue("a", async () => {
      calls += 1;
      if (calls < 4) throw new TypeError("Failed to fetch");
    });
    expect(await queue.settled()).toEqual([]);
    expect(calls).toBe(4);
    expect(waits).toEqual([2000, 4000, 8000]);
  });

  it("waits 30 seconds between tries once the backoff list runs out, and keeps trying", async () => {
    const waits: number[] = [];
    let calls = 0;
    const queue = new UploadQueue({
      sleep: (ms) => {
        waits.push(ms);
        return Promise.resolve();
      },
    });
    queue.enqueue("a", async () => {
      calls += 1;
      if (calls < 9) throw httpError(503);
    });
    await queue.settled();
    expect(waits).toEqual([
      2000, 4000, 8000, 16000, 30000, 30000, 30000, 30000,
    ]);
  });

  it("stops a job the server refused and reports it, without retrying", async () => {
    let calls = 0;
    const queue = new UploadQueue({ sleep: instant });
    queue.enqueue("a", async () => {
      calls += 1;
      throw httpError(400);
    });
    expect(await queue.settled()).toEqual(["a"]);
    expect(calls).toBe(1);
    expect(queue.status("a")).toBe("failed");
    expect((queue.errorOf("a") as Error).message).toBe("HTTP 400");
  });

  it("goes on with the other jobs after one is refused", async () => {
    const done: string[] = [];
    const queue = new UploadQueue({ sleep: instant });
    queue.enqueue("bad", async () => {
      throw httpError(410);
    });
    queue.enqueue("good", async () => {
      done.push("good");
    });
    expect(await queue.settled()).toEqual(["bad"]);
    expect(done).toEqual(["good"]);
  });

  it("runs a refused job again when told to retry it", async () => {
    let fail = true;
    const queue = new UploadQueue({ sleep: instant });
    queue.enqueue("a", async () => {
      if (fail) throw httpError(400);
    });
    expect(await queue.settled()).toEqual(["a"]);
    fail = false;
    queue.retry("a");
    expect(await queue.settled()).toEqual([]);
    expect(queue.pending).toBe(0);
  });

  it("replaces a job still waiting with a newer one of the same key", async () => {
    const log: string[] = [];
    const queue = new UploadQueue({ sleep: instant });
    queue.enqueue("a", async () => {
      log.push("a first");
      await Promise.resolve();
    });
    queue.enqueue("b", async () => {
      log.push("b old");
    });
    queue.enqueue("b", async () => {
      log.push("b new");
    });
    await queue.settled();
    expect(log).toEqual(["a first", "b new"]);
  });

  it("lets a running job finish and then runs the newer job of the same key", async () => {
    const log: string[] = [];
    let release!: () => void;
    const gate = new Promise<void>((resolve) => (release = resolve));
    const queue = new UploadQueue({ sleep: instant });
    queue.enqueue("a", async () => {
      log.push("old start");
      await gate;
      log.push("old end");
    });
    await Promise.resolve();
    queue.enqueue("a", async () => {
      log.push("new");
    });
    release();
    await queue.settled();
    expect(log).toEqual(["old start", "old end", "new"]);
    expect(queue.pending).toBe(0);
  });

  it("does not lose a newer job that arrives while the running one is waiting to retry", async () => {
    const log: string[] = [];
    let calls = 0;
    let wakeSleep!: () => void;
    const queue = new UploadQueue({
      sleep: () => new Promise<void>((resolve) => (wakeSleep = resolve)),
    });
    queue.enqueue("a", async () => {
      calls += 1;
      log.push(`old ${calls}`);
      if (calls === 1) throw new TypeError("offline");
    });
    await new Promise((r) => setTimeout(r, 0));
    queue.enqueue("a", async () => {
      log.push("new");
    });
    wakeSleep();
    await queue.settled();
    expect(log).toEqual(["old 1", "old 2", "new"]);
  });

  it("tells the screen about every change", async () => {
    let changes = 0;
    const queue = new UploadQueue({
      sleep: instant,
      onChange: () => (changes += 1),
    });
    queue.enqueue("a", async () => undefined);
    await queue.settled();
    expect(changes).toBeGreaterThanOrEqual(3); // queued, uploading, done
  });

  it("resolves settled() at once when there is nothing to do", async () => {
    expect(await new UploadQueue().settled()).toEqual([]);
  });

  it("can cut a retry wait short", async () => {
    let calls = 0;
    const queue = new UploadQueue({ backoffMs: [60_000] });
    queue.enqueue("a", async () => {
      calls += 1;
      if (calls === 1) throw new TypeError("offline");
    });
    await new Promise((r) => setTimeout(r, 10));
    expect(calls).toBe(1);
    queue.retryNow();
    expect(await queue.settled()).toEqual([]);
    expect(calls).toBe(2);
  });
});
