import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  buildPreviousChapterEndingContext,
  findActiveOutlineGenerationTask,
  findLatestEndingPlanningReference,
  inferNextTargetChapterNumber,
} from "./ai-tasks";

const mocks = vi.hoisted(() => ({
  prisma: {
    aiTask: {
      findFirst: vi.fn(),
    },
  },
}));

vi.mock("@/lib/prisma", () => ({
  prisma: mocks.prisma,
}));

describe("outline AI task helpers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.prisma.aiTask.findFirst.mockResolvedValue({
      id: "task_1",
    });
  });

  it("finds active outline-generation tasks by the shared task type", async () => {
    await findActiveOutlineGenerationTask("project_1");

    expect(mocks.prisma.aiTask.findFirst).toHaveBeenCalledWith({
      where: {
        projectId: "project_1",
        taskType: "outline_generation",
        status: {
          in: ["pending", "running"],
        },
      },
      select: {
        id: true,
      },
    });
  });

  it("returns the latest completed ending plan while it remains usable", async () => {
    const completedAt = new Date("2026-07-25T06:41:00.000Z");
    mocks.prisma.aiTask.findFirst.mockResolvedValue({
      id: "ending_plan_2",
      adoptionState: "not_reviewed",
      completedAt,
      outputText: "剩余八章，优先回收军饷底账伏笔。",
    });

    await expect(
      findLatestEndingPlanningReference("project_1"),
    ).resolves.toEqual({
      taskId: "ending_plan_2",
      adoptionState: "not_reviewed",
      completedAt,
      outputText: "剩余八章，优先回收军饷底账伏笔。",
    });
    expect(mocks.prisma.aiTask.findFirst).toHaveBeenCalledWith({
      where: {
        projectId: "project_1",
        taskType: "ending_planning_generation",
        status: "completed",
        outputText: {
          not: null,
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      select: {
        id: true,
        adoptionState: true,
        completedAt: true,
        outputText: true,
      },
    });
  });

  it("stops using ending planning after the latest completed plan is ignored", async () => {
    mocks.prisma.aiTask.findFirst.mockResolvedValue({
      id: "ending_plan_2",
      adoptionState: "rejected",
      completedAt: new Date("2026-07-25T06:41:00.000Z"),
      outputText: "这份规划已经被作者忽略。",
    });

    await expect(
      findLatestEndingPlanningReference("project_1"),
    ).resolves.toBeNull();
  });

  it("infers the next target chapter from existing chapters and chapter outlines", () => {
    expect(
      inferNextTargetChapterNumber(
        [
          {
            chapterNumber: 5,
          },
        ],
        [
          {
            level: "chapter",
            chapterNumber: 8,
          },
          {
            level: "unit",
            chapterNumber: 30,
          },
        ],
      ),
    ).toBe(9);
  });

  it("builds a bounded previous-chapter ending context from final text first", () => {
    const context = buildPreviousChapterEndingContext({
      chapterNumber: 2,
      title: "碎布暗隙",
      draftText: "draft",
      polishedText: "polished",
      finalText: `${"前文".repeat(1000)}结尾钩子`,
    });

    expect(context).toEqual({
      chapterNumber: 2,
      title: "碎布暗隙",
      endingText: expect.stringContaining("结尾钩子"),
    });
    expect(context?.endingText.length).toBeLessThanOrEqual(1800);
  });
});
