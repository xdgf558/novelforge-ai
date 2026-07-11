import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  applyContinuityReportReplacementFix,
  findActiveContinuityFixPatchTask,
  updateContinuityFixPatchTaskAdoptionState,
} from "./records";

const mocks = vi.hoisted(() => ({
  prisma: {
    aiTask: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      updateMany: vi.fn(),
    },
    continuityReport: {
      findFirst: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

vi.mock("@/lib/prisma", () => ({
  prisma: mocks.prisma,
}));

describe("continuity record services", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.prisma.aiTask.findFirst.mockResolvedValue(null);
    mocks.prisma.aiTask.findMany.mockResolvedValue([]);
    mocks.prisma.aiTask.updateMany.mockResolvedValue({
      count: 1,
    });
  });

  it("finds an active continuity fix patch task by report id inside inputJson", async () => {
    mocks.prisma.aiTask.findMany.mockResolvedValue([
      {
        id: "task_other",
        inputJson: JSON.stringify({
          report: {
            id: "report_other",
          },
        }),
      },
      {
        id: "task_1",
        inputJson: JSON.stringify({
          report: {
            id: "report_1",
          },
        }),
      },
    ]);

    await expect(
      findActiveContinuityFixPatchTask("project_1", "report_1"),
    ).resolves.toEqual({
      id: "task_1",
      inputJson: JSON.stringify({
        report: {
          id: "report_1",
        },
      }),
    });
    expect(mocks.prisma.aiTask.findMany).toHaveBeenCalledWith({
      where: {
        projectId: "project_1",
        taskType: "continuity_fix_patch_generation",
        status: {
          in: ["pending", "running"],
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      select: {
        id: true,
        inputJson: true,
      },
    });
  });

  it("updates a completed fix patch task adoption state once", async () => {
    mocks.prisma.aiTask.findFirst.mockResolvedValue({
      chapterId: "chapter_1",
      id: "task_1",
      inputJson: JSON.stringify({
        report: {
          id: "report_1",
        },
      }),
    });

    await expect(
      updateContinuityFixPatchTaskAdoptionState({
        adoptionState: "adopted",
        projectId: "project_1",
        taskId: "task_1",
      }),
    ).resolves.toEqual({
      chapterId: "chapter_1",
      reportId: "report_1",
      status: "updated",
    });
    expect(mocks.prisma.aiTask.updateMany).toHaveBeenCalledWith({
      where: {
        adoptionState: "not_reviewed",
        id: "task_1",
        projectId: "project_1",
        status: "completed",
        taskType: "continuity_fix_patch_generation",
      },
      data: {
        adoptionState: "adopted",
      },
    });
  });

  it("refuses to apply a report after the chapter final text changes", async () => {
    const { chapterFinalTextHash } = await import("@/lib/chapters/source-text");

    mocks.prisma.continuityReport.findFirst.mockResolvedValue({
      id: "report_1",
      projectId: "project_1",
      chapterId: "chapter_1",
      sourceTextHash: chapterFinalTextHash("生成报告时的定稿"),
      status: "open",
      chapter: {
        id: "chapter_1",
        finalText: "作者修改后的定稿",
      },
    });

    await expect(
      applyContinuityReportReplacementFix({
        projectId: "project_1",
        reportId: "report_1",
      }),
    ).resolves.toEqual({
      status: "stale-report",
    });
    expect(mocks.prisma.$transaction).not.toHaveBeenCalled();
  });

  it("never applies automatic replacements to whole-story review suggestions", async () => {
    mocks.prisma.continuityReport.findFirst.mockResolvedValue({
      id: "report_1",
      status: "open",
      aiTask: {
        taskType: "short_story_whole_review",
      },
      chapter: {
        id: "unit_1",
        finalText: "作者确认的定稿。",
      },
    });

    await expect(
      applyContinuityReportReplacementFix({
        projectId: "project_1",
        reportId: "report_1",
      }),
    ).resolves.toEqual({ status: "unsupported" });
    expect(mocks.prisma.$transaction).not.toHaveBeenCalled();
  });
});
