import { describe, expect, it } from "vitest";
import {
  aiTaskFinalTextIsStale,
  chapterFinalTextHash,
  chapterSourceMatches,
} from "./source-text";

describe("chapter source text fingerprint", () => {
  it("ignores outer whitespace but changes when the final text changes", () => {
    expect(chapterFinalTextHash("  正文\n")).toBe(chapterFinalTextHash("正文"));
    expect(chapterFinalTextHash("正文 A")).not.toBe(
      chapterFinalTextHash("正文 B"),
    );
  });

  it("marks fingerprinted AI tasks stale while keeping legacy tasks readable", () => {
    const inputJson = JSON.stringify({
      finalTextHash: chapterFinalTextHash("旧定稿"),
    });

    expect(aiTaskFinalTextIsStale(inputJson, "新定稿")).toBe(true);
    expect(aiTaskFinalTextIsStale(inputJson, "旧定稿")).toBe(false);
    expect(aiTaskFinalTextIsStale(null, "新定稿")).toBe(false);
  });

  it("only matches a non-empty current final text", () => {
    const hash = chapterFinalTextHash("当前定稿");

    expect(chapterSourceMatches(hash, "当前定稿")).toBe(true);
    expect(chapterSourceMatches(hash, "已修改定稿")).toBe(false);
    expect(chapterSourceMatches(null, "当前定稿")).toBe(false);
  });
});
