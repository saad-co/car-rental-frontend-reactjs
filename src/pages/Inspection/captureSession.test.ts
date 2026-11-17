import { describe, expect, it } from "vitest";
import { CaptureSession, type UploadRequest } from "./captureSession";

const blob = (text: string) => new Blob([text], { type: "image/jpeg" });
const httpError = (status: number) =>
  Object.assign(new Error(`HTTP ${status}`), { status });

/** A session whose "server" records every request and can be told to fail. */
function setup() {
  const sent: UploadRequest[] = [];
  const state = {
    failWith: null as unknown,
    closed: 0,
    urls: [] as string[],
    revoked: [] as string[],
  };
  const session = new CaptureSession({
    send: async (request) => {
      if (state.failWith) throw state.failWith;
      sent.push(request);
    },
    onLinkClosed: () => {
      state.closed += 1;
    },
    createPreviewUrl: () => {
      const url = `blob:local-${state.urls.length + 1}`;
      state.urls.push(url);
      return url;
    },
    revokePreviewUrl: (url) => {
      state.revoked.push(url);
    },
    // A real (tiny) pause, so a retry loop cannot starve the test's own timers.
    sleep: () => new Promise<void>((resolve) => setTimeout(resolve, 1)),
  });
  return { session, sent, state };
}

describe("CaptureSession", () => {
  it("uploads a photo in the background with its capture time", async () => {
    const { session, sent } = setup();
    session.setPhoto("EXT_FRONT", 1, blob("a"), "2026-11-17T10:00:00.000Z");
    expect(session.view("EXT_FRONT").status).toBe("uploading");
    expect(await session.settled()).toEqual([]);
    expect(sent).toHaveLength(1);
    expect(sent[0]).toMatchObject({
      shotId: "EXT_FRONT",
      position: 1,
      capturedAt: "2026-11-17T10:00:00.000Z",
    });
    expect(sent[0].file).toBeInstanceOf(Blob);
    expect(session.view("EXT_FRONT")).toMatchObject({
      hasPhoto: true,
      status: "saved",
      previewUrl: "blob:local-1",
    });
  });

  it("shows nothing for a shot nobody touched", () => {
    expect(setup().session.view("EXT_REAR")).toEqual({
      hasPhoto: false,
      previewUrl: null,
      note: "",
      status: "none",
    });
  });

  it("knows which shots have a photo, wherever it is", async () => {
    const { session } = setup();
    session.hydrate([
      {
        shotId: "EXT_FRONT",
        parentShotId: null,
        position: 1,
        note: null,
        thumbUrl: "https://t/1",
      },
    ]);
    session.setPhoto("EXT_REAR", 1, blob("b"), null);
    expect([...session.shotsWithPhoto()].sort()).toEqual([
      "EXT_FRONT",
      "EXT_REAR",
    ]);
    await session.settled();
  });

  it("leaves close-ups out of the list of shots", async () => {
    const { session } = setup();
    session.setPhoto("DAMAGE@EXT_FRONT", 1, blob("d"), null);
    expect(session.shotsWithPhoto().size).toBe(0);
    await session.settled();
  });

  it("sends a note typed after the photo without sending the picture again", async () => {
    const { session, sent } = setup();
    session.setPhoto("EXT_FRONT", 1, blob("a"), null);
    await session.settled();
    session.setNote("EXT_FRONT", 1, "small chip");
    await session.settled();
    expect(sent).toHaveLength(2);
    expect(sent[1]).toEqual({
      shotId: "EXT_FRONT",
      position: 1,
      note: "small chip",
    });
  });

  it("sends a note typed before the photo together with it", async () => {
    const { session, sent } = setup();
    session.setNote("EXT_FRONT", 1, "scratch");
    expect(sent).toHaveLength(0); // nothing to attach it to yet
    session.setPhoto("EXT_FRONT", 1, blob("a"), null);
    await session.settled();
    expect(sent).toHaveLength(1);
    expect(sent[0]).toMatchObject({ note: "scratch" });
    expect(sent[0].file).toBeDefined();
  });

  it("clears a note by sending it empty", async () => {
    const { session, sent } = setup();
    session.setPhoto("EXT_FRONT", 1, blob("a"), null);
    session.setNote("EXT_FRONT", 1, "x");
    await session.settled();
    session.setNote("EXT_FRONT", 1, "");
    await session.settled();
    expect(sent.at(-1)).toEqual({ shotId: "EXT_FRONT", position: 1, note: "" });
  });

  it("sends a close-up as DAMAGE with its shot and number, and counts it as a yes for that shot (D112)", async () => {
    const { session, sent } = setup();
    session.setPhoto("DAMAGE@EXT_LEFT_MIRROR", 2, blob("c"), null);
    session.setNote("DAMAGE@EXT_LEFT_MIRROR", 2, "cracked glass");
    await session.settled();
    // The photo, then (if it had already left) the note on its own trip: every trip names the shot and the number.
    for (const request of sent) {
      expect(request).toMatchObject({
        shotId: "DAMAGE",
        parentShotId: "EXT_LEFT_MIRROR",
        position: 2,
      });
    }
    expect(sent[0].file).toBeInstanceOf(Blob);
    expect(sent.at(-1)!.note).toBe("cracked glass");
    expect(session.answerOf("EXT_LEFT_MIRROR")).toBe(true);
  });

  it("sends a normal shot with no parent and no reading", async () => {
    const { session, sent } = setup();
    session.setPhoto("INT_FUEL", 1, blob("f"), null);
    await session.settled();
    expect(Object.keys(sent[0]).sort()).toEqual(["file", "position", "shotId"]);
  });

  it("keeps the close-ups of each shot apart, in order", async () => {
    const { session } = setup();
    session.setPhoto("DAMAGE@EXT_FRONT", 2, blob("b"), null);
    session.setPhoto("DAMAGE@EXT_FRONT", 1, blob("a"), null);
    session.setPhoto("DAMAGE@EXT_REAR", 1, blob("r"), null);
    session.setNote("DAMAGE@EXT_FRONT", 3, "a note with no photo yet");
    expect(session.closeUpPositions("EXT_FRONT")).toEqual([1, 2]);
    expect(session.closeUpPositions("EXT_REAR")).toEqual([1]);
    expect(session.closeUpPositions("EXT_WINDSHIELD")).toEqual([]);
    await session.settled();
  });

  it("records an answer the server saved", () => {
    const { session } = setup();
    expect(session.answerOf("EXT_FRONT")).toBeUndefined();
    session.recordAnswer("EXT_FRONT", false);
    expect(session.answerOf("EXT_FRONT")).toBe(false);
    expect([...session.answerMap()]).toEqual([["EXT_FRONT", false]]);
  });

  it("treats a second photo for the same shot as a retake: it is sent again and the old preview is released", async () => {
    const { session, sent, state } = setup();
    session.setPhoto("EXT_FRONT", 1, blob("one"), null);
    await session.settled();
    session.setPhoto("EXT_FRONT", 1, blob("two"), null);
    await session.settled();
    expect(sent.filter((r) => r.file)).toHaveLength(2);
    expect(state.revoked).toEqual(["blob:local-1"]);
    expect(session.view("EXT_FRONT").previewUrl).toBe("blob:local-2");
  });

  it("sends the newest photo when a retake comes before the first one went", async () => {
    const { session, sent } = setup();
    session.setPhoto("EXT_FRONT", 1, blob("one"), null);
    session.setPhoto("EXT_FRONT", 1, blob("two"), null);
    await session.settled();
    const files = sent.filter((r) => r.file).map((r) => r.file as Blob);
    expect(await files.at(-1)!.text()).toBe("two");
  });

  it("keeps trying through a bad signal and ends with the photo saved", async () => {
    const { session, sent, state } = setup();
    state.failWith = new TypeError("Failed to fetch");
    session.setPhoto("EXT_FRONT", 1, blob("a"), null);
    await new Promise((r) => setTimeout(r, 20));
    expect(session.view("EXT_FRONT").status).toBe("uploading");
    state.failWith = null;
    await session.settled();
    expect(sent).toHaveLength(1);
    expect(session.view("EXT_FRONT").status).toBe("saved");
  });

  it("marks a photo the server refused as failed, and sends it again on retry", async () => {
    const { session, sent, state } = setup();
    state.failWith = httpError(400);
    session.setPhoto("EXT_FRONT", 1, blob("a"), null);
    expect(await session.settled()).toEqual(["EXT_FRONT:1"]);
    expect(session.view("EXT_FRONT").status).toBe("failed");
    expect(state.closed).toBe(0);
    state.failWith = null;
    session.retry("EXT_FRONT");
    expect(await session.settled()).toEqual([]);
    expect(sent).toHaveLength(1);
    expect(session.view("EXT_FRONT").status).toBe("saved");
  });

  it("says once that the link is closed when the server answers 410 or 409", async () => {
    const { session, state } = setup();
    state.failWith = httpError(410);
    session.setPhoto("EXT_FRONT", 1, blob("a"), null);
    session.setPhoto("EXT_REAR", 1, blob("b"), null);
    await session.settled();
    expect(state.closed).toBe(1);
  });

  it("rebuilds from what the server holds, so a reopened link resumes", () => {
    const { session, sent } = setup();
    session.hydrate(
      [
        {
          shotId: "EXT_FRONT",
          parentShotId: null,
          position: 1,
          note: "chip",
          thumbUrl: "https://t/front",
        },
        {
          shotId: "DAMAGE",
          parentShotId: "EXT_FRONT",
          position: 2,
          note: null,
          thumbUrl: null,
        },
        // A free-standing damage photo from before D112: the server keeps it, the page has no place for it.
        {
          shotId: "DAMAGE",
          parentShotId: null,
          position: 1,
          note: "old",
          thumbUrl: null,
        },
      ],
      [
        { shotId: "EXT_FRONT", hasDamage: true },
        { shotId: "EXT_REAR", hasDamage: false },
      ],
    );
    expect(session.view("EXT_FRONT")).toEqual({
      hasPhoto: true,
      previewUrl: "https://t/front",
      note: "chip",
      status: "saved",
    });
    expect(session.view("DAMAGE@EXT_FRONT", 2).hasPhoto).toBe(true);
    expect(session.view("DAMAGE", 1).hasPhoto).toBe(false);
    expect(session.closeUpPositions("EXT_FRONT")).toEqual([2]);
    expect(session.answerOf("EXT_FRONT")).toBe(true);
    expect(session.answerOf("EXT_REAR")).toBe(false);
    expect(sent).toHaveLength(0); // nothing to send: the server has it all
    expect(session.progress()).toEqual({ done: 2, total: 2 });
  });

  it("does not let the server's thumbnail overwrite a photo taken in this visit", async () => {
    const { session } = setup();
    session.setPhoto("EXT_FRONT", 1, blob("a"), null);
    session.hydrate([
      {
        shotId: "EXT_FRONT",
        parentShotId: null,
        position: 1,
        note: null,
        thumbUrl: "https://t/old",
      },
    ]);
    expect(session.view("EXT_FRONT").previewUrl).toBe("blob:local-1");
    await session.settled();
  });

  it("counts progress: photos fully on the server out of photos on the page", async () => {
    const { session, state } = setup();
    state.failWith = httpError(400);
    session.setPhoto("EXT_FRONT", 1, blob("a"), null);
    await session.settled();
    expect(session.progress()).toEqual({ done: 0, total: 1 });
    state.failWith = null;
    session.retryAll();
    await session.settled();
    expect(session.progress()).toEqual({ done: 1, total: 1 });
  });

  it("tells watchers whenever something changes", async () => {
    const { session } = setup();
    let calls = 0;
    session.subscribe(() => {
      calls += 1;
    });
    const before = session.version;
    session.setPhoto("EXT_FRONT", 1, blob("a"), null);
    await session.settled();
    expect(calls).toBeGreaterThan(0);
    expect(session.version).toBeGreaterThan(before);
  });

  it("releases its preview pictures when the page is left", async () => {
    const { session, state } = setup();
    session.setPhoto("EXT_FRONT", 1, blob("a"), null);
    await session.settled();
    session.dispose();
    expect(state.revoked).toEqual(["blob:local-1"]);
  });
});

describe("CaptureSession: the phone's storage", () => {
  /** A session with a recording stand-in for the phone's storage. */
  function withStorage() {
    const calls: string[] = [];
    const sent: UploadRequest[] = [];
    const state = { failWith: null as unknown };
    const session = new CaptureSession({
      send: async (request) => {
        if (state.failWith) throw state.failWith;
        sent.push(request);
      },
      persist: {
        save: (shotId, position) => calls.push(`save ${shotId}:${position}`),
        remove: (shotId, position) =>
          calls.push(`remove ${shotId}:${position}`),
      },
      createPreviewUrl: () => "blob:x",
      revokePreviewUrl: () => undefined,
      sleep: () => new Promise<void>((resolve) => setTimeout(resolve, 1)),
    });
    return { session, calls, sent, state };
  }

  it("does not put back an old free-standing damage photo kept on the phone (the server would refuse it)", async () => {
    const { session, sent } = withStorage();
    session.restorePhoto("DAMAGE", 1, blob("old"), null);
    session.restorePhoto("DAMAGE@EXT_FRONT", 1, blob("new"), null);
    await session.settled();
    expect(sent.map((r) => [r.shotId, r.parentShotId])).toEqual([
      ["DAMAGE", "EXT_FRONT"],
    ]);
  });

  it("keeps a photo on the phone from the moment it is taken until the server has it", async () => {
    const { session, calls } = withStorage();
    session.setPhoto("EXT_FRONT", 1, blob("a"), null);
    expect(calls).toEqual(["save EXT_FRONT:1"]);
    await session.settled();
    expect(calls).toEqual(["save EXT_FRONT:1", "remove EXT_FRONT:1"]);
  });

  it("keeps the copy on the phone while the server is out of reach", async () => {
    const { session, calls, state } = withStorage();
    state.failWith = new TypeError("Failed to fetch");
    session.setPhoto("EXT_FRONT", 1, blob("a"), null);
    await new Promise((r) => setTimeout(r, 20));
    expect(calls).toEqual(["save EXT_FRONT:1"]);
    state.failWith = null;
    await session.settled();
    expect(calls).toEqual(["save EXT_FRONT:1", "remove EXT_FRONT:1"]);
  });

  it("does not remove the phone's copy of a newer photo when an older one reaches the server", async () => {
    const { session, calls } = withStorage();
    session.setPhoto("EXT_FRONT", 1, blob("one"), null);
    session.setPhoto("EXT_FRONT", 1, blob("two"), null);
    await session.settled();
    // The copy of "two" is the last thing saved and the only removal comes after "two" was sent.
    expect(calls.filter((c) => c.startsWith("remove"))).toHaveLength(1);
    expect(calls.at(-1)).toBe("remove EXT_FRONT:1");
    expect(calls.indexOf("save EXT_FRONT:1")).toBeLessThan(calls.length - 1);
  });

  it("puts back a photo kept from an earlier visit and sends it, without saving it again", async () => {
    const { session, calls, sent } = withStorage();
    session.restorePhoto(
      "EXT_FRONT",
      1,
      blob("old"),
      "2026-11-17T09:00:00.000Z",
    );
    expect(session.view("EXT_FRONT").hasPhoto).toBe(true);
    await session.settled();
    expect(sent).toHaveLength(1);
    expect(sent[0].capturedAt).toBe("2026-11-17T09:00:00.000Z");
    expect(calls).toEqual(["remove EXT_FRONT:1"]);
  });

  it("does not let a restored photo replace one taken in this visit", async () => {
    const { session, sent } = withStorage();
    session.setPhoto("EXT_FRONT", 1, blob("new"), null);
    session.restorePhoto("EXT_FRONT", 1, blob("old"), null);
    await session.settled();
    const files = sent.filter((r) => r.file).map((r) => r.file as Blob);
    expect(await files.at(-1)!.text()).toBe("new");
  });
});
