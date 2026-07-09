import { describe, expect, it } from "vitest";
import {
  foreshadowRecoveryReason,
  selectForeshadowRecoveryReminders,
  type ForeshadowRecoveryReminder,
} from "./recovery-reminders";

function foreshadow(
  overrides: Partial<ForeshadowRecoveryReminder>,
): ForeshadowRecoveryReminder {
  return {
    id: overrides.id ?? "foreshadow_1",
    content: overrides.content ?? "伏笔内容",
    status: overrides.status ?? "planted",
    importance: overrides.importance ?? "medium",
    expectedResolveChapter: overrides.expectedResolveChapter ?? null,
    ...overrides,
  };
}

describe("foreshadow recovery reminders", () => {
  it("selects due or attention-needed foreshadows without resolved items", () => {
    const reminders = selectForeshadowRecoveryReminders({
      currentChapterNumber: 8,
      foreshadows: [
        foreshadow({
          id: "future",
          content: "未来才该处理",
          expectedResolveChapter: 9,
        }),
        foreshadow({
          id: "resolved",
          status: "resolved",
          expectedResolveChapter: 8,
        }),
        foreshadow({
          id: "due",
          content: "本章预计回收",
          expectedResolveChapter: 8,
        }),
        foreshadow({
          id: "attention",
          status: "needs_attention",
          expectedResolveChapter: null,
        }),
        foreshadow({
          id: "advancing",
          status: "advancing",
          expectedResolveChapter: 5,
        }),
        foreshadow({
          id: "abandoned",
          status: "abandoned",
          expectedResolveChapter: 1,
        }),
      ],
    });

    expect(reminders.map((item) => item.id)).toEqual([
      "attention",
      "advancing",
      "due",
    ]);
  });

  it("prioritizes attention, overdue progress, earlier due chapter, and importance", () => {
    const reminders = selectForeshadowRecoveryReminders({
      currentChapterNumber: 10,
      foreshadows: [
        foreshadow({
          id: "later-overdue",
          content: "稍晚的高优先级伏笔",
          importance: "high",
          expectedResolveChapter: 8,
        }),
        foreshadow({
          id: "overdue-low",
          content: "同章低优先级伏笔",
          importance: "low",
          expectedResolveChapter: 7,
        }),
        foreshadow({
          id: "attention",
          content: "人工标记需要处理",
          status: "needs_attention",
        }),
        foreshadow({
          id: "advancing",
          content: "推进中的过期伏笔",
          status: "advancing",
          importance: "high",
          expectedResolveChapter: 9,
        }),
        foreshadow({
          id: "overdue-high",
          content: "同章高优先级伏笔",
          importance: "high",
          expectedResolveChapter: 7,
        }),
      ],
    });

    expect(reminders.map((item) => item.id)).toEqual([
      "attention",
      "advancing",
      "overdue-high",
      "overdue-low",
      "later-overdue",
    ]);
  });

  it("explains why a foreshadow is suggested for the current chapter", () => {
    expect(
      foreshadowRecoveryReason(
        foreshadow({
          status: "needs_attention",
        }),
        9,
      ),
    ).toBe("已标记需要处理");
    expect(
      foreshadowRecoveryReason(
        foreshadow({
          expectedResolveChapter: 9,
        }),
        9,
      ),
    ).toBe("预计本章回收");
    expect(
      foreshadowRecoveryReason(
        foreshadow({
          expectedResolveChapter: 6,
        }),
        9,
      ),
    ).toBe("已超过预计第 6 章");
  });
});
