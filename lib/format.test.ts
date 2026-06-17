import { describe, expect, it } from "vitest";
import { formatNumber, formatWordRange } from "./format";

describe("formatNumber", () => {
  it("formats missing values as unset", () => {
    expect(formatNumber(null)).toBe("未设置");
    expect(formatNumber(undefined)).toBe("未设置");
  });

  it("formats numbers with zh-CN grouping", () => {
    expect(formatNumber(1200000)).toBe("1,200,000");
  });
});

describe("formatWordRange", () => {
  it("formats complete ranges", () => {
    expect(formatWordRange(1800, 2800)).toBe("1,800-2,800 字");
  });

  it("does not treat zero-like values as missing", () => {
    expect(formatWordRange(0, 2800)).toBe("0-2,800 字");
    expect(formatWordRange(0, null)).toBe("至少 0 字");
  });

  it("formats one-sided ranges", () => {
    expect(formatWordRange(1800, null)).toBe("至少 1,800 字");
    expect(formatWordRange(null, 2800)).toBe("最多 2,800 字");
  });
});
