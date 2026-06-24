import { describe, expect, it, vi } from "vitest";
import {
  safeReadScroll,
  safeRemoveScroll,
  safeWriteScroll,
} from "./preserve-scroll-storage";

describe("PreserveScrollForm storage helpers", () => {
  it("treats session storage reads as best-effort", () => {
    const storage = {
      getItem: vi.fn(() => {
        throw new Error("storage blocked");
      }),
      removeItem: vi.fn(),
      setItem: vi.fn(),
    };

    expect(() => safeReadScroll(storage, "scroll-key")).not.toThrow();
    expect(safeReadScroll(storage, "scroll-key")).toBeNull();
  });

  it("does not block submit when session storage writes fail", () => {
    const storage = {
      getItem: vi.fn(),
      removeItem: vi.fn(),
      setItem: vi.fn(() => {
        throw new Error("storage blocked");
      }),
    };

    expect(() =>
      safeWriteScroll(storage, "scroll-key", {
        left: 12,
        top: 34,
      }),
    ).not.toThrow();
  });

  it("does not block rendering when session storage cleanup fails", () => {
    const storage = {
      getItem: vi.fn(),
      removeItem: vi.fn(() => {
        throw new Error("storage blocked");
      }),
      setItem: vi.fn(),
    };

    expect(() => safeRemoveScroll(storage, "scroll-key")).not.toThrow();
  });

  it("stores scroll coordinates when storage is available", () => {
    const storage = {
      getItem: vi.fn(),
      removeItem: vi.fn(),
      setItem: vi.fn(),
    };

    safeWriteScroll(storage, "scroll-key", {
      left: 12,
      top: 34,
    });

    expect(storage.setItem).toHaveBeenCalledWith(
      "scroll-key",
      JSON.stringify({
        left: 12,
        top: 34,
      }),
    );
  });
});
