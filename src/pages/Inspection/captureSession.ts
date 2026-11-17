import { apiShotOf, closeUpSlot, DAMAGE_SHOT } from "./flow";
import { UploadQueue, type Sleep } from "./uploadQueue";

/** What one upload sends: the photo and/or its note (all optional, like the API). */
export interface UploadRequest {
  /** A shot id, or `DAMAGE` for a close-up. */
  shotId: string;
  /** For a close-up: the shot it belongs to (D112). */
  parentShotId?: string;
  /** 1 for a required shot; 1 to 5 for a close-up. */
  position: number;
  /** Present when a new photo (or a retake) is being sent; absent when only the note changed. */
  file?: Blob;
  /** The note; an empty text clears it. */
  note?: string;
  /** When the phone took the photo (ISO 8601). */
  capturedAt?: string;
}

/** A photo the server already holds (from the state of the link), for resuming. */
export interface ServerPhoto {
  shotId: string;
  parentShotId: string | null;
  position: number;
  note: string | null;
  thumbUrl: string | null;
}

/** A damage answer the server already holds. */
export interface ServerAnswer {
  shotId: string;
  hasDamage: boolean;
}

/** What the screens need to know about one photo slot. */
export type SlotStatus = "none" | "saved" | "uploading" | "failed";

export interface SlotView {
  hasPhoto: boolean;
  /** A picture to show: the photo just taken on this phone, or the server's thumbnail after a reload. */
  previewUrl: string | null;
  note: string;
  status: SlotStatus;
}

interface Slot {
  shotId: string;
  position: number;
  blob: Blob | null;
  previewUrl: string | null;
  /** True while `previewUrl` is an object URL we made (to be released), false for a server link. */
  ownsPreview: boolean;
  capturedAt: string | null;
  /** Counts the photos taken on this phone for this slot. */
  version: number;
  /** The `version` the server holds. */
  uploadedVersion: number;
  /** The server holds a photo for this slot (from before a reload, or sent in this visit). */
  hasServerPhoto: boolean;
  note: string;
  uploadedNote: string;
}

export interface SessionDeps {
  /** Sends one request to the server. Throws on failure; an error with a numeric `status` is read by `isPermanentFailure`. */
  send: (request: UploadRequest) => Promise<unknown>;
  /** Called once when the server says the link is no longer usable (410 expired or revoked, 409 submitted). */
  onLinkClosed?: () => void;
  /**
   * Keeps a photo that has not reached the server on the phone's own storage (IndexedDB), so closing the page or losing the signal
   * for a long time does not lose it. `save` is called when a photo is accepted; `remove` once the server holds that very photo.
   * Both are fire-and-forget: a storage problem is logged by the store and never stops the upload.
   */
  persist?: {
    save: (
      shotId: string,
      position: number,
      blob: Blob,
      capturedAt: string | null,
    ) => void;
    remove: (shotId: string, position: number) => void;
  };
  createPreviewUrl?: (blob: Blob) => string;
  revokePreviewUrl?: (url: string) => void;
  sleep?: Sleep;
  backoffMs?: number[];
}

/** The key of a photo slot. `shotId` is the page's slot name: a shot id, or `DAMAGE@<shot>` for a close-up (see `closeUpSlot`). */
export const slotKey = (shotId: string, position: number) =>
  `${shotId}:${position}`;

/**
 * Everything the capture page keeps about the photos of one inspection, and the uploading of them in the background (spec
 * p. 4 and 12): each photo is queued the moment it is accepted, sent one at a time, retried when the signal drops, and the note
 * follows the photo it belongs to. It also keeps the driver's damage answers (D112), which are sent at once, not queued. The
 * server is the source of truth after a reload: `hydrate` rebuilds the slots and answers from what it already holds, so a
 * reopened link resumes.
 *
 * Plain TypeScript, no React: `subscribe` and `version` let a screen redraw when anything changes (`useSyncExternalStore`).
 */
export class CaptureSession {
  private readonly deps: SessionDeps;
  private readonly queue: UploadQueue;
  private readonly slots = new Map<string, Slot>();
  /** The damage answer of each shot the driver answered, as the server holds it. */
  private readonly answers = new Map<string, boolean>();
  private listeners = new Set<() => void>();
  private changeCount = 0;
  private closedReported = false;

  constructor(deps: SessionDeps) {
    this.deps = deps;
    this.queue = new UploadQueue({
      onChange: () => this.emit(),
      sleep: deps.sleep,
      backoffMs: deps.backoffMs,
    });
  }

  // ----------------------------------------------------------------- watching

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  /** Changes every time anything does: the value a screen watches. */
  get version(): number {
    return this.changeCount;
  }

  private emit(): void {
    this.changeCount += 1;
    for (const listener of this.listeners) listener();
  }

  // ------------------------------------------------------------------ loading

  /**
   * Fills in what the server already holds (a reopened link). Slots that already exist here are left alone: a photo taken in
   * this visit is newer than the server's thumbnail.
   */
  hydrate(photos: ServerPhoto[], answers: ServerAnswer[] = []): void {
    for (const photo of photos) {
      // A damage photo from before D112 belongs to no shot: the server keeps it, the page has no place for it.
      if (photo.shotId === DAMAGE_SHOT && !photo.parentShotId) continue;
      const shotId =
        photo.shotId === DAMAGE_SHOT && photo.parentShotId
          ? closeUpSlot(photo.parentShotId)
          : photo.shotId;
      const key = slotKey(shotId, photo.position);
      if (this.slots.has(key)) continue;
      this.slots.set(key, {
        shotId,
        position: photo.position,
        blob: null,
        previewUrl: photo.thumbUrl,
        ownsPreview: false,
        capturedAt: null,
        version: 0,
        uploadedVersion: 0,
        hasServerPhoto: true,
        note: photo.note ?? "",
        uploadedNote: photo.note ?? "",
      });
    }
    for (const answer of answers) {
      if (!this.answers.has(answer.shotId)) {
        this.answers.set(answer.shotId, answer.hasDamage);
      }
    }
    this.emit();
  }

  // ------------------------------------------------------------------- change

  /** A photo was taken (or retaken) on this phone: keep it, save it on the phone's storage and put it in line. */
  setPhoto(
    shotId: string,
    position: number,
    blob: Blob,
    capturedAt: string | null,
  ): void {
    this.placePhoto(shotId, position, blob, capturedAt);
    this.deps.persist?.save(shotId, position, blob, capturedAt);
  }

  /**
   * Puts back a photo the phone's storage still held from an earlier visit (it never reached the server). Skipped when a photo
   * was already taken for that slot in this visit: the newer one wins.
   */
  restorePhoto(
    shotId: string,
    position: number,
    blob: Blob,
    capturedAt: string | null,
  ): void {
    // A free-standing damage photo kept by the page before D112: the server now refuses a close-up without its shot.
    if (shotId === DAMAGE_SHOT) {
      console.warn(
        "An old damage photo kept on this phone was not uploaded: damage photos now belong to a shot.",
      );
      return;
    }
    if (this.slots.get(slotKey(shotId, position))?.blob) return;
    this.placePhoto(shotId, position, blob, capturedAt);
  }

  private placePhoto(
    shotId: string,
    position: number,
    blob: Blob,
    capturedAt: string | null,
  ): void {
    const slot = this.slotFor(shotId, position);
    this.release(slot);
    slot.blob = blob;
    slot.capturedAt = capturedAt;
    slot.version += 1;
    slot.previewUrl = (this.deps.createPreviewUrl ?? defaultCreateUrl)(blob);
    slot.ownsPreview = true;
    this.enqueue(slot);
  }

  /** The "+ Damage note" text of a photo. Works before the photo exists: the note waits for it. */
  setNote(shotId: string, position: number, note: string): void {
    const slot = this.slotFor(shotId, position);
    slot.note = note;
    if (this.hasPhoto(slot)) this.enqueue(slot);
    else this.emit();
  }

  /** The server saved the driver's damage answer for a shot. */
  recordAnswer(shotId: string, hasDamage: boolean): void {
    this.answers.set(shotId, hasDamage);
    this.emit();
  }

  // ------------------------------------------------------------------ reading

  /** The damage answer of a shot: true, false, or undefined when not answered yet. */
  answerOf(shotId: string): boolean | undefined {
    return this.answers.get(shotId);
  }

  /** Every answer given so far (shot id → has damage). */
  answerMap(): ReadonlyMap<string, boolean> {
    return this.answers;
  }

  /** The photo slot as the screens show it; a slot nobody touched reads as "none". */
  view(shotId: string, position = 1): SlotView {
    const slot = this.slots.get(slotKey(shotId, position));
    if (!slot)
      return { hasPhoto: false, previewUrl: null, note: "", status: "none" };
    const hasPhoto = this.hasPhoto(slot);
    const queued = this.queue.status(slotKey(shotId, position));
    const status: SlotStatus = !hasPhoto
      ? "none"
      : queued === "failed"
        ? "failed"
        : queued !== undefined
          ? "uploading"
          : "saved";
    return {
      hasPhoto,
      previewUrl: slot.previewUrl,
      note: slot.note,
      status,
    };
  }

  /** Ids of the shots (position 1) that have a photo, here or on the server: where the walk-around stands. */
  shotsWithPhoto(): Set<string> {
    const have = new Set<string>();
    for (const slot of this.slots.values()) {
      if (
        !slot.shotId.startsWith(DAMAGE_SHOT) &&
        slot.position === 1 &&
        this.hasPhoto(slot)
      ) {
        have.add(slot.shotId);
      }
    }
    return have;
  }

  /** The numbers (1 to 5) of the close-ups of one shot that exist, in order. They are always added one after another. */
  closeUpPositions(parentShotId: string): number[] {
    const slotShot = closeUpSlot(parentShotId);
    const positions: number[] = [];
    for (const slot of this.slots.values()) {
      if (slot.shotId === slotShot && this.hasPhoto(slot)) {
        positions.push(slot.position);
      }
    }
    return positions.sort((a, b) => a - b);
  }

  /** How many photos (close-ups included) are on the page, and how many of those the server has with everything that goes with them. */
  progress(): { done: number; total: number } {
    let total = 0;
    let done = 0;
    for (const [key, slot] of this.slots) {
      if (!this.hasPhoto(slot)) continue;
      total += 1;
      if (this.queue.status(key) === undefined && !this.isDirty(slot))
        done += 1;
    }
    return { done, total };
  }

  // ----------------------------------------------------------------- the line

  /** Resolves when nothing is being uploaded or retried; the keys of photos the server refused are returned. */
  settled(): Promise<string[]> {
    return this.queue.settled();
  }

  /** Tries a refused photo again (the driver tapped it). */
  retry(shotId: string, position = 1): void {
    const slot = this.slots.get(slotKey(shotId, position));
    if (slot && this.hasPhoto(slot)) {
      this.queue.retry(slotKey(shotId, position));
      if (this.queue.status(slotKey(shotId, position)) === undefined) {
        this.enqueue(slot);
      }
    }
  }

  /** Tries every failed photo again. */
  retryAll(): void {
    for (const [key, slot] of this.slots) {
      if (this.queue.status(key) === "failed") {
        this.queue.retry(key);
      } else if (
        this.hasPhoto(slot) &&
        this.isDirty(slot) &&
        this.queue.status(key) === undefined
      ) {
        this.enqueue(slot);
      }
    }
  }

  /** The phone is back online: do not wait out the pause before the next retry. */
  wake(): void {
    this.queue.retryNow();
  }

  /** The reason a photo failed, for the screen; null when it did not. */
  failureOf(shotId: string, position = 1): unknown {
    return this.queue.errorOf(slotKey(shotId, position));
  }

  /** Releases the preview pictures. */
  dispose(): void {
    for (const slot of this.slots.values()) this.release(slot);
    this.listeners.clear();
  }

  // ----------------------------------------------------------------- internal

  private slotFor(shotId: string, position: number): Slot {
    const key = slotKey(shotId, position);
    let slot = this.slots.get(key);
    if (!slot) {
      slot = {
        shotId,
        position,
        blob: null,
        previewUrl: null,
        ownsPreview: false,
        capturedAt: null,
        version: 0,
        uploadedVersion: 0,
        hasServerPhoto: false,
        note: "",
        uploadedNote: "",
      };
      this.slots.set(key, slot);
    }
    return slot;
  }

  private hasPhoto(slot: Slot): boolean {
    return slot.blob !== null || slot.hasServerPhoto;
  }

  private release(slot: Slot): void {
    if (slot.ownsPreview && slot.previewUrl) {
      (this.deps.revokePreviewUrl ?? defaultRevokeUrl)(slot.previewUrl);
    }
    slot.previewUrl = null;
    slot.ownsPreview = false;
  }

  /** Whether the server is missing something for this slot: the photo or its note. */
  private isDirty(slot: Slot): boolean {
    if (!this.hasPhoto(slot)) return false;
    if (slot.blob !== null && slot.version !== slot.uploadedVersion)
      return true;
    return slot.note !== slot.uploadedNote;
  }

  private enqueue(slot: Slot): void {
    this.queue.enqueue(slotKey(slot.shotId, slot.position), () =>
      this.upload(slot),
    );
  }

  /** One trip to the server for this slot: builds the request from what is current NOW, so later edits ride along. */
  private async upload(slot: Slot): Promise<void> {
    if (!this.isDirty(slot)) return;
    const request: UploadRequest = {
      ...apiShotOf(slot.shotId),
      position: slot.position,
    };
    const sendingVersion = slot.version;
    const includesFile =
      slot.blob !== null && slot.version !== slot.uploadedVersion;
    if (includesFile) {
      request.file = slot.blob!;
      if (slot.capturedAt) request.capturedAt = slot.capturedAt;
    }
    const sendingNote = slot.note;
    if (sendingNote !== slot.uploadedNote) request.note = sendingNote;
    try {
      await this.deps.send(request);
    } catch (error) {
      this.reportIfLinkClosed(error);
      throw error;
    }
    if (includesFile) {
      slot.uploadedVersion = sendingVersion;
      slot.hasServerPhoto = true;
      // Only when no newer photo has been taken meanwhile: its copy on the phone has the same key and must stay.
      if (slot.version === sendingVersion) {
        this.deps.persist?.remove(slot.shotId, slot.position);
      }
    }
    slot.uploadedNote = sendingNote;
    // The server records "yes, damage" for the shot of a close-up it stored.
    if (request.parentShotId) this.answers.set(request.parentShotId, true);
    // Something changed while this trip was on the road: the queue runs this slot once more, with the newest data.
    if (this.isDirty(slot)) this.enqueue(slot);
  }

  private reportIfLinkClosed(error: unknown): void {
    const status =
      typeof error === "object" && error !== null
        ? (error as { status?: unknown }).status
        : undefined;
    if ((status === 410 || status === 409) && !this.closedReported) {
      this.closedReported = true;
      this.deps.onLinkClosed?.();
    }
  }
}

const defaultCreateUrl = (blob: Blob) => URL.createObjectURL(blob);
const defaultRevokeUrl = (url: string) => URL.revokeObjectURL(url);
