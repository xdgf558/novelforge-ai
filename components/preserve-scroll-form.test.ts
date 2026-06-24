import { describe, expect, it, vi } from "vitest";
import {
  restorePreservedScroll,
  safeReadScroll,
  safeRemoveScroll,
  safeWriteScroll,
  submitPreserveScrollForm,
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

describe("PreserveScrollForm", () => {
  it("records scroll position, marks submitted, and calls submit handler", () => {
    const event = {
      preventDefault: vi.fn(),
    };
    const onSubmit = vi.fn((submittedEvent: typeof event) =>
      submittedEvent.preventDefault(),
    );
    const setSubmitted = vi.fn();
    const storage = {
      getItem: vi.fn(),
      removeItem: vi.fn(),
      setItem: vi.fn(),
    };

    submitPreserveScrollForm({
      event,
      onSubmit,
      position: {
        left: 12,
        top: 34,
      },
      setSubmitted,
      storage,
      storageKey: "scroll-key",
    });

    expect(storage.setItem).toHaveBeenCalledWith(
      "scroll-key",
      JSON.stringify({
        left: 12,
        top: 34,
      }),
    );
    expect(setSubmitted).toHaveBeenCalledWith(true);
    expect(onSubmit).toHaveBeenCalledWith(event);
    expect(event.preventDefault).toHaveBeenCalledTimes(1);
  });

  it("restores a previously saved scroll position", () => {
    let saved: string | null = JSON.stringify({
      left: 56,
      top: 78,
    });
    const storage = {
      getItem: vi.fn(() => saved),
      removeItem: vi.fn(() => {
        saved = null;
      }),
      setItem: vi.fn(),
    };
    const requestAnimationFrame = vi.fn((callback: FrameRequestCallback) => {
      callback(0);
      return 1;
    });
    const scrollTo = vi.fn();

    const restored = restorePreservedScroll({
      requestAnimationFrame,
      scrollTo,
      storage,
      storageKey: "scroll-key",
    });

    expect(restored).toBe(true);
    expect(storage.getItem).toHaveBeenCalledWith("scroll-key");
    expect(storage.removeItem).toHaveBeenCalledWith("scroll-key");
    expect(requestAnimationFrame).toHaveBeenCalledTimes(1);
    expect(scrollTo).toHaveBeenCalledWith(56, 78);
  });
});
