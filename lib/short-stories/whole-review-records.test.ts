import { beforeEach, describe, expect, it, vi } from "vitest";
import { chapterFinalTextHash } from "@/lib/chapters/source-text";
import {
  createShortStoryWholeReviewReportsFromTask,
  loadShortStoryWholeReviewContext,
} from "./whole-review-records";

const mocks = vi.hoisted(() => ({
  prisma: {
    continuityReport: {
      createMany: vi.fn(),
      findMany: vi.fn(),
    },
    project: {
      findFirst: vi.fn(),
    },
    chapter: {
      findMany: vi.fn(),
    },
    character: {
      findMany: vi.fn(),
    },
    foreshadow: {
      findMany: vi.fn(),
    },
    timelineEvent: {
      findMany: vi.fn(),
    },
    shortStorySeriesEntry: {
      findUnique: vi.fn(),
    },
  },
}));

vi.mock("@/lib/prisma", () => ({ prisma: mocks.prisma }));

describe("short-story whole review records", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.prisma.continuityReport.createMany.mockResolvedValue({ count: 1 });
    mocks.prisma.continuityReport.findMany.mockResolvedValue([]);
    mocks.prisma.project.findFirst.mockResolvedValue({
      id: "project_1",
      title: "短故事",
      setting: null,
      shortStoryBlueprint: { premise: "核心前提" },
    });
    mocks.prisma.chapter.findMany.mockResolvedValue([]);
    mocks.prisma.character.findMany.mockResolvedValue([]);
    mocks.prisma.foreshadow.findMany.mockResolvedValue([]);
    mocks.prisma.timelineEvent.findMany.mockResolvedValue([]);
    mocks.prisma.shortStorySeriesEntry.findUnique.mockResolvedValue(null);
  });

  it("persists only suggestions that target a confirmed input unit", async () => {
    const outputText = JSON.stringify({
      overallRiskLevel: "medium",
      summary: "存在一处节奏缺口。",
      strengths: [],
      priority: "补足选择过程。",
      issues: [
        {
          targetUnitId: "unit_2",
          relatedUnitIds: ["unit_1"],
          category: "pacing_gap",
          severity: "medium",
          title: "关键选择跳跃",
          description: "主角从犹豫直接跳到行动。",
          evidence: "第二单元开头已经执行计划。",
          reviewBasis: "第一单元结尾仍在犹豫。",
          suggestedFix: "在第二单元补一个受压后的决定时刻。",
        },
        {
          targetUnitId: "unknown_unit",
          category: "timeline",
          severity: "high",
          title: "无效目标",
          description: "模型引用了不存在的单元。",
        },
      ],
    });
    const units = [
      {
        id: "unit_1",
        chapterNumber: 1,
        title: "犹豫",
        status: "final",
        finalText: "主角尚未决定。",
      },
      {
        id: "unit_2",
        chapterNumber: 2,
        title: "行动",
        status: "final",
        finalText: "主角开始执行计划。",
      },
    ];

    await expect(
      createShortStoryWholeReviewReportsFromTask({
        outputText,
        projectId: "project_1",
        taskId: "task_1",
        units,
      }),
    ).resolves.toEqual({ count: 1 });

    expect(mocks.prisma.continuityReport.createMany).toHaveBeenCalledWith({
      data: [
        expect.objectContaining({
          projectId: "project_1",
          chapterId: "unit_2",
          aiTaskId: "task_1",
          category: "pacing_gap",
          sourceTextHash: chapterFinalTextHash("主角开始执行计划。"),
          conflictingMemory:
            "第一单元结尾仍在犹豫。\n关联单元：单元 1《犹豫》",
        }),
      ],
    });
  });

  it("does not create reports when every model target is invalid", async () => {
    await expect(
      createShortStoryWholeReviewReportsFromTask({
        outputText: JSON.stringify({
          issues: [
            {
              targetUnitId: "missing",
              description: "无效建议",
            },
          ],
        }),
        projectId: "project_1",
        taskId: "task_1",
        units: [],
      }),
    ).resolves.toEqual({ count: 0 });
    expect(mocks.prisma.continuityReport.createMany).not.toHaveBeenCalled();
  });

  it("does not duplicate an open issue for unchanged confirmed text", async () => {
    const finalText = "主角开始执行计划。";
    mocks.prisma.continuityReport.findMany.mockResolvedValue([
      {
        chapterId: "unit_2",
        sourceTextHash: chapterFinalTextHash(finalText),
        category: "pacing_gap",
        title: " 关键选择  跳跃 ",
      },
    ]);

    await expect(
      createShortStoryWholeReviewReportsFromTask({
        outputText: JSON.stringify({
          issues: [
            {
              targetUnitId: "unit_2",
              category: "pacing_gap",
              severity: "medium",
              title: "关键选择跳跃",
              description: "新一轮审校重复了已有问题。",
            },
          ],
        }),
        projectId: "project_1",
        taskId: "task_2",
        units: [
          {
            id: "unit_2",
            chapterNumber: 2,
            title: "行动",
            status: "final",
            finalText,
          },
        ],
      }),
    ).resolves.toEqual({ count: 0 });

    expect(mocks.prisma.continuityReport.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          projectId: "project_1",
          status: "open",
          chapterId: { in: ["unit_2"] },
          sourceTextHash: { in: [chapterFinalTextHash(finalText)] },
          aiTask: {
            is: {
              taskType: "short_story_whole_review",
            },
          },
        }),
      }),
    );
    expect(mocks.prisma.continuityReport.createMany).not.toHaveBeenCalled();
  });

  it("loads the complete unresolved payoff pool before prompt prioritization", async () => {
    await expect(
      loadShortStoryWholeReviewContext("project_1"),
    ).resolves.toMatchObject({
      project: { title: "短故事" },
      units: [],
      foreshadows: [],
    });

    expect(mocks.prisma.foreshadow.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          projectId: "project_1",
          status: {
            in: ["planted", "advancing", "needs_attention"],
          },
        },
      }),
    );
    expect(mocks.prisma.foreshadow.findMany.mock.calls[0][0]).not.toHaveProperty(
      "take",
    );
  });
});
