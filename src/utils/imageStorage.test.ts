import { beforeEach, describe, expect, it, vi } from "vitest";

const openDBMock = vi.hoisted(() => vi.fn());
const generateUUIDMock = vi.hoisted(() => vi.fn());

vi.mock("./indexedDB", () => ({
  openDB: openDBMock,
  IMAGES_STORE: "images",
}));

vi.mock("./uuid", () => ({
  generateUUID: generateUUIDMock,
}));

import {
  clearAllImages,
  deleteImage,
  deleteImagesBySaveId,
  getAllImages,
  getImage,
  getImageStorageStats,
  getImagesBySaveId,
  saveImage,
} from "./imageStorage";

type RequestLike = {
  result?: any;
  error?: any;
  onsuccess?: (() => void) | null;
  onerror?: (() => void) | null;
};

const successRequest = (result: any): RequestLike => {
  const req: RequestLike = {
    result: undefined,
    error: null,
    onsuccess: null,
    onerror: null,
  };
  queueMicrotask(() => {
    req.result = result;
    req.onsuccess?.();
  });
  return req;
};

const errorRequest = (error: any): RequestLike => {
  const req: RequestLike = {
    result: undefined,
    error,
    onsuccess: null,
    onerror: null,
  };
  queueMicrotask(() => {
    req.onerror?.();
  });
  return req;
};

const keyCursorRequest = (keys: string[]): RequestLike => {
  const req: RequestLike = {
    result: null,
    error: null,
    onsuccess: null,
    onerror: null,
  };
  let idx = 0;

  const emit = () => {
    if (idx < keys.length) {
      const cursor = {
        primaryKey: keys[idx],
        continue: () => {
          idx += 1;
          queueMicrotask(emit);
        },
      };
      req.result = cursor;
    } else {
      req.result = null;
    }
    req.onsuccess?.();
  };

  queueMicrotask(emit);
  return req;
};

describe("imageStorage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal("IDBKeyRange", {
      only: vi.fn((value: string) => `only:${value}`),
    } as any);
  });

  it("saves new image when no existing segment image is found", async () => {
    generateUUIDMock.mockReturnValue("img-new");
    vi.spyOn(Date, "now").mockReturnValue(1111);

    const store = {
      index: vi.fn(() => ({ get: vi.fn(() => successRequest(undefined)) })),
      add: vi.fn(() => successRequest(undefined)),
      delete: vi.fn(),
    };

    openDBMock.mockResolvedValue({
      transaction: vi.fn(() => ({ objectStore: vi.fn(() => store) })),
    });

    const id = await saveImage(new Blob(["x"]), {
      saveId: "save-1",
      forkId: 2,
      turnIdx: 3,
      imagePrompt: "moon",
    });

    expect(id).toBe("img-new");
    expect(store.add).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "img-new",
        saveId: "save-1",
        forkId: 2,
        turnIdx: 3,
        imagePrompt: "moon",
        timestamp: 1111,
      }),
    );
  });

  it("replaces existing image for same segment", async () => {
    generateUUIDMock.mockReturnValue("img-replaced");

    const store = {
      index: vi.fn(() => ({
        get: vi.fn(() => successRequest({ id: "img-old" })),
      })),
      delete: vi.fn(() => successRequest(undefined)),
      add: vi.fn(() => successRequest(undefined)),
    };

    openDBMock.mockResolvedValue({
      transaction: vi.fn(() => ({ objectStore: vi.fn(() => store) })),
    });

    const id = await saveImage(new Blob(["new"]), {
      saveId: "save-2",
      forkId: 0,
      turnIdx: 7,
    });

    expect(id).toBe("img-replaced");
    expect(store.delete).toHaveBeenCalledWith("img-old");
    expect(store.add).toHaveBeenCalledTimes(1);
  });

  it("rejects when initial segment lookup fails", async () => {
    const store = {
      index: vi.fn(() => ({
        get: vi.fn(() => errorRequest(new Error("lookup failed"))),
      })),
    };

    openDBMock.mockResolvedValue({
      transaction: vi.fn(() => ({ objectStore: vi.fn(() => store) })),
    });

    await expect(
      saveImage(new Blob(["x"]), { saveId: "save", forkId: 1, turnIdx: 1 }),
    ).rejects.toThrow("lookup failed");
  });

  it("reads image blob and returns null when missing", async () => {
    const store = {
      get: vi
        .fn()
        .mockImplementationOnce(() => successRequest({ blob: new Blob(["a"]) }))
        .mockImplementationOnce(() => successRequest(undefined)),
    };

    openDBMock.mockResolvedValue({
      transaction: vi.fn(() => ({ objectStore: vi.fn(() => store) })),
    });

    const found = await getImage("img-1");
    const missing = await getImage("img-none");

    expect(found).toBeInstanceOf(Blob);
    expect(missing).toBeNull();
  });

  it("deletes image by id", async () => {
    const store = {
      delete: vi.fn(() => successRequest(undefined)),
    };

    openDBMock.mockResolvedValue({
      transaction: vi.fn(() => ({ objectStore: vi.fn(() => store) })),
    });

    await deleteImage("img-9");

    expect(store.delete).toHaveBeenCalledWith("img-9");
  });

  it("deletes all images by save id using key cursor", async () => {
    const store = {
      index: vi.fn(() => ({
        openKeyCursor: vi.fn(() => keyCursorRequest(["img-1", "img-2"])),
      })),
      delete: vi.fn(),
    };

    openDBMock.mockResolvedValue({
      transaction: vi.fn(() => ({ objectStore: vi.fn(() => store) })),
    });

    await deleteImagesBySaveId("save-77");

    expect((IDBKeyRange as any).only).toHaveBeenCalledWith("save-77");
    expect(store.delete).toHaveBeenNthCalledWith(1, "img-1");
    expect(store.delete).toHaveBeenNthCalledWith(2, "img-2");
  });

  it("returns storage stats and sorted image lists", async () => {
    const images = [
      { id: "older", timestamp: 10, blob: new Blob(["ab"]) },
      { id: "newer", timestamp: 30, blob: new Blob(["abc"]) },
    ];

    const store = {
      getAll: vi
        .fn()
        .mockImplementationOnce(() => successRequest(images))
        .mockImplementationOnce(() => successRequest([...images]))
        .mockImplementationOnce(() => successRequest([...images])),
      index: vi.fn(() => ({
        getAll: vi.fn(() => successRequest([...images])),
      })),
    };

    openDBMock.mockResolvedValue({
      transaction: vi.fn(() => ({ objectStore: vi.fn(() => store) })),
    });

    const stats = await getImageStorageStats();
    const all = await getAllImages();
    const bySave = await getImagesBySaveId("save-abc");

    expect(stats).toEqual({ count: 2, size: 5 });
    expect(all.map((item) => item.id)).toEqual(["newer", "older"]);
    expect(bySave.map((item) => item.id)).toEqual(["newer", "older"]);
    expect((IDBKeyRange as any).only).toHaveBeenCalledWith("save-abc");
  });

  it("clears all images", async () => {
    const store = {
      clear: vi.fn(() => successRequest(undefined)),
    };

    openDBMock.mockResolvedValue({
      transaction: vi.fn(() => ({ objectStore: vi.fn(() => store) })),
    });

    await clearAllImages();

    expect(store.clear).toHaveBeenCalled();
  });
});
