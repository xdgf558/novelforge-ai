import { describe, expect, it } from "vitest";
import { resolveFanqieLayoutInitialChapterId } from "./fanqie-layout-selection";

describe("resolveFanqieLayoutInitialChapterId", () => {
  const chapters = [
    {
      id: "chapter-1",
    },
    {
      id: "chapter-2",
    },
    {
      id: "chapter-3",
    },
  ];

  it("uses the requested chapter when it exists in the panel chapter list", () => {
    expect(resolveFanqieLayoutInitialChapterId(chapters, "chapter-2")).toBe(
      "chapter-2",
    );
  });

  it("falls back to the latest chapter when the request is missing or stale", () => {
    expect(resolveFanqieLayoutInitialChapterId(chapters, undefined)).toBe(
      "chapter-3",
    );
    expect(resolveFanqieLayoutInitialChapterId(chapters, "missing")).toBe(
      "chapter-3",
    );
  });

  it("uses the first repeated query param value when multiple chapter ids are provided", () => {
    expect(
      resolveFanqieLayoutInitialChapterId(chapters, [
        "chapter-2",
        "chapter-1",
      ]),
    ).toBe("chapter-2");
  });

  it("returns an empty id when no chapters are available", () => {
    expect(resolveFanqieLayoutInitialChapterId([], "chapter-2")).toBe("");
  });
});
