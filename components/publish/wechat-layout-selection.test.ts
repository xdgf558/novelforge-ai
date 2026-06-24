import { describe, expect, it } from "vitest";
import { resolveWechatLayoutInitialChapterId } from "./wechat-layout-selection";

describe("resolveWechatLayoutInitialChapterId", () => {
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
    expect(resolveWechatLayoutInitialChapterId(chapters, "chapter-2")).toBe(
      "chapter-2",
    );
  });

  it("falls back to the latest chapter when the request is missing or stale", () => {
    expect(resolveWechatLayoutInitialChapterId(chapters, undefined)).toBe(
      "chapter-3",
    );
    expect(resolveWechatLayoutInitialChapterId(chapters, "missing")).toBe(
      "chapter-3",
    );
  });

  it("returns an empty id when no chapters are available", () => {
    expect(resolveWechatLayoutInitialChapterId([], "chapter-2")).toBe("");
  });
});
