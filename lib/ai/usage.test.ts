import { describe, expect, it } from "vitest";
import { aiBudgetWarning, aiUsageDateKey, formatUsageNumber } from "./usage";

describe("AI usage helpers", () => {
  it("formats a local daily usage key", () => {
    expect(aiUsageDateKey(new Date(2026, 5, 24, 9, 30))).toBe("2026-06-24");
  });

  it("does not warn when no budget is configured or usage is low", () => {
    expect(
      aiBudgetWarning({
        budget: null,
        tokenTotal: 1000,
      }),
    ).toBeNull();
    expect(
      aiBudgetWarning({
        budget: 10000,
        tokenTotal: 7000,
      }),
    ).toBeNull();
  });

  it("warns near and over the configured daily token budget", () => {
    expect(
      aiBudgetWarning({
        budget: 10000,
        tokenTotal: 8000,
      }),
    ).toContain("已接近提醒阈值");
    expect(
      aiBudgetWarning({
        budget: 10000,
        tokenTotal: 12000,
      }),
    ).toContain("已超过提醒阈值");
  });

  it("formats usage numbers for Chinese locale display", () => {
    expect(formatUsageNumber(1234567)).toBe("1,234,567");
  });
});
