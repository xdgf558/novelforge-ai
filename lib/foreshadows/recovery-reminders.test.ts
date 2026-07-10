import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  findForeshadowRecoveryReminders,
  foreshadowRecoveryReason,
  selectForeshadowRecoveryReminders,
  type ForeshadowRecoveryReminder,
} from "./recovery-reminders";

const mocks = vi.hoisted(() => ({
  prisma: {
    foreshadow: {
      findMany: vi.fn(),
    },
  },
}));

vi.mock("@/lib/prisma", () => ({
  prisma: mocks.prisma,
}));

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
  beforeEach(() => {
    vi.clearAllMocks();
  });

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
        {
          status: "needs_attention",
        },
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
    expect(
      foreshadowRecoveryReason(
        foreshadow({
          expectedResolveChapter: 12,
        }),
        9,
      ),
    ).toBe("建议本章处理");
  });

  it("applies the final limit after priority sorting", () => {
    const reminders = selectForeshadowRecoveryReminders({
      currentChapterNumber: 12,
      limit: 8,
      foreshadows: Array.from({ length: 12 }, (_, index) =>
        foreshadow({
          id: `foreshadow_${index + 1}`,
          content: `第 ${index + 1} 条伏笔`,
          expectedResolveChapter: index + 1,
        }),
      ).reverse(),
    });

    expect(reminders).toHaveLength(8);
    expect(reminders.map((item) => item.id)).toEqual([
      "foreshadow_1",
      "foreshadow_2",
      "foreshadow_3",
      "foreshadow_4",
      "foreshadow_5",
      "foreshadow_6",
      "foreshadow_7",
      "foreshadow_8",
    ]);
  });

  it("keeps attention-needed items with expected chapters ahead of null chapter items", () => {
    const reminders = selectForeshadowRecoveryReminders({
      currentChapterNumber: 9,
      foreshadows: [
        foreshadow({
          id: "attention-null",
          status: "needs_attention",
          expectedResolveChapter: null,
        }),
        foreshadow({
          id: "attention-due",
          status: "needs_attention",
          expectedResolveChapter: 5,
        }),
      ],
    });

    expect(reminders.map((item) => item.id)).toEqual([
      "attention-due",
      "attention-null",
    ]);
  });

  it("does not pre-truncate database candidates before priority selection", async () => {
    const recentLowPriority = Array.from({ length: 40 }, (_, index) =>
      foreshadow({
        id: `recent_${index + 1}`,
        content: `最近编辑的低优先级伏笔 ${index + 1}`,
        importance: "low",
        expectedResolveChapter: 10 + index,
      }),
    );
    const oldCriticalForeshadow = foreshadow({
      id: "old-critical",
      content: "很久没动但已经严重逾期的高优先级伏笔",
      importance: "high",
      expectedResolveChapter: 1,
    });

    mocks.prisma.foreshadow.findMany.mockResolvedValue([
      ...recentLowPriority,
      oldCriticalForeshadow,
    ]);

    const reminders = await findForeshadowRecoveryReminders({
      projectId: "project_1",
      currentChapterNumber: 50,
      limit: 8,
    });

    expect(mocks.prisma.foreshadow.findMany).toHaveBeenCalledWith(
      expect.not.objectContaining({
        take: expect.any(Number),
      }),
    );
    expect(reminders[0]?.id).toBe("old-critical");
  });
});
