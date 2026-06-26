import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  generateContinuityFixPatch,
  ignoreContinuityFixPatch,
  markContinuityFixPatchOrganized,
} from "./actions";

const mocks = vi.hoisted(() => ({
  notFound: vi.fn(),
  redirect: vi.fn(),
  revalidatePath: vi.fn(),
  ensureDefaultPromptTemplate: vi.fn(),
  startLoggedOpenAITextTask: vi.fn(),
  prisma: {
    aiTask: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      updateMany: vi.fn(),
    },
    continuityReport: {
      findFirst: vi.fn(),
      update: vi.fn(),
    },
    chapter: {
      findFirst: vi.fn(),
      update: vi.fn(),
    },
    chapterVersion: {
      count: vi.fn(),
      create: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

vi.mock("next/cache", () => ({
  revalidatePath: mocks.revalidatePath,
}));

vi.mock("next/navigation", () => ({
  notFound: mocks.notFound,
  redirect: mocks.redirect,
}));

vi.mock("@/lib/prisma", () => ({
  prisma: mocks.prisma,
}));

vi.mock("@/lib/ai/prompt-template-store", () => ({
  ensureDefaultPromptTemplate: mocks.ensureDefaultPromptTemplate,
}));

vi.mock("@/lib/ai/task-logger", () => ({
  startLoggedOpenAITextTask: mocks.startLoggedOpenAITextTask,
}));

const reportWithChapter = {
  id: "report_1",
  projectId: "project_1",
  chapterId: "chapter_6",
  severity: "high",
  category: "timeline",
  title: "时间线重复一天",
  description: "结尾日期不连续。",
  evidence: "1999年6月29日。早上七点零四分。",
  conflictingMemory: "时间线连贯性",
  suggestedFix: "将章节结尾日期从1999年6月29日修正为1999年6月30日。",
  status: "open",
  project: {
    title: "离线未来",
    genre: "穿越创业",
    targetAudience: "20-40岁读者",
    platform: "个人网站",
  },
  chapter: {
    id: "chapter_6",
    chapterNumber: 6,
    title: "查分方案",
    status: "final",
    goal: "修正时间线。",
    beats: "夜间复盘，次日来电。",
    draftText: "",
    polishedText: "",
    finalText: "1999年6月29日。早上七点零四分。\n电话响了。",
    notes: "",
  },
};

describe("continuity fix patch actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.notFound.mockImplementation(() => {
      throw new Error("NEXT_NOT_FOUND");
    });
    mocks.redirect.mockImplementation((url: string) => {
      const error = new Error("NEXT_REDIRECT");
      Object.assign(error, { url });
      throw error;
    });
    mocks.ensureDefaultPromptTemplate.mockResolvedValue({
      id: "template_patch_1",
      taskType: "continuity_fix_patch_generation",
      systemPrompt: "system",
      userPrompt: "user",
      contextNotes: "notes",
    });
    mocks.startLoggedOpenAITextTask.mockResolvedValue({
      id: "task_patch_1",
    });
    mocks.prisma.aiTask.findFirst.mockResolvedValue(null);
    mocks.prisma.aiTask.findMany.mockResolvedValue([]);
    mocks.prisma.aiTask.updateMany.mockResolvedValue({
      count: 1,
    });
    mocks.prisma.continuityReport.findFirst.mockResolvedValue(reportWithChapter);
  });

  it("starts a logged AI task for a candidate patch without editing chapter text", async () => {
    await expect(
      generateContinuityFixPatch("project_1", "report_1"),
    ).rejects.toThrow("NEXT_REDIRECT");

    expect(mocks.ensureDefaultPromptTemplate).toHaveBeenCalledWith(
      "project_1",
      "continuity_fix_patch_generation",
    );
    expect(mocks.startLoggedOpenAITextTask).toHaveBeenCalledWith(
      expect.objectContaining({
        projectId: "project_1",
        chapterId: "chapter_6",
        taskType: "continuity_fix_patch_generation",
        inputJson: expect.objectContaining({
          report: expect.objectContaining({
            id: "report_1",
          }),
          chapter: expect.objectContaining({
            sourceField: "finalText",
          }),
        }),
      }),
      expect.objectContaining({
        input: expect.stringContaining("修复候选补丁"),
      }),
    );
    expect(mocks.prisma.chapter.update).not.toHaveBeenCalled();
    expect(mocks.prisma.chapterVersion.create).not.toHaveBeenCalled();
    expect(mocks.redirect).toHaveBeenCalledWith(
      "/projects/project_1/continuity?patch=started#report-report_1",
    );
  });

  it("releases stale candidate patch tasks before checking active locks", async () => {
    await expect(
      generateContinuityFixPatch("project_1", "report_1"),
    ).rejects.toThrow("NEXT_REDIRECT");

    expect(mocks.prisma.aiTask.updateMany).toHaveBeenCalledWith({
      where: {
        projectId: "project_1",
        taskType: "continuity_fix_patch_generation",
        status: {
          in: ["pending", "running"],
        },
        OR: [
          {
            startedAt: {
              lt: expect.any(Date),
            },
          },
          {
            startedAt: null,
            createdAt: {
              lt: expect.any(Date),
            },
          },
        ],
      },
      data: {
        status: "failed",
        errorMessage:
          "AI 任务运行超过 15 分钟，已自动标记为失败。请重新生成。",
        completedAt: expect.any(Date),
      },
    });
    expect(mocks.startLoggedOpenAITextTask).toHaveBeenCalled();
  });

  it("does not start a second candidate patch task for the same open report", async () => {
    mocks.prisma.aiTask.findMany.mockResolvedValue([
      {
        id: "task_running_1",
        inputJson: JSON.stringify({
          report: {
            id: "report_1",
          },
        }),
      },
    ]);

    await expect(
      generateContinuityFixPatch("project_1", "report_1"),
    ).rejects.toThrow("NEXT_REDIRECT");

    expect(mocks.startLoggedOpenAITextTask).not.toHaveBeenCalled();
    expect(mocks.redirect).toHaveBeenCalledWith(
      "/projects/project_1/continuity?patch=active#report-report_1",
    );
  });

  it("marks a completed candidate patch as organized without writing formal chapter data", async () => {
    mocks.prisma.aiTask.findFirst.mockResolvedValue({
      id: "task_patch_1",
      chapterId: "chapter_6",
      inputJson: JSON.stringify({
        report: {
          id: "report_1",
        },
      }),
    });

    await expect(
      markContinuityFixPatchOrganized("project_1", "task_patch_1"),
    ).rejects.toThrow("NEXT_REDIRECT");

    expect(mocks.prisma.aiTask.updateMany).toHaveBeenCalledWith({
      where: {
        id: "task_patch_1",
        projectId: "project_1",
        taskType: "continuity_fix_patch_generation",
        status: "completed",
        adoptionState: "not_reviewed",
      },
      data: {
        adoptionState: "adopted",
      },
    });
    expect(mocks.prisma.chapter.update).not.toHaveBeenCalled();
    expect(mocks.prisma.chapterVersion.create).not.toHaveBeenCalled();
    expect(mocks.redirect).toHaveBeenCalledWith(
      "/projects/project_1/continuity?patch=organized#report-report_1",
    );
  });

  it("redirects stale review submissions when the candidate patch was already reviewed", async () => {
    mocks.prisma.aiTask.findFirst.mockResolvedValue({
      id: "task_patch_1",
      chapterId: "chapter_6",
      inputJson: JSON.stringify({
        report: {
          id: "report_1",
        },
      }),
    });
    mocks.prisma.aiTask.updateMany.mockResolvedValueOnce({
      count: 0,
    });

    await expect(
      markContinuityFixPatchOrganized("project_1", "task_patch_1"),
    ).rejects.toThrow("NEXT_REDIRECT");

    expect(mocks.redirect).toHaveBeenCalledWith(
      "/projects/project_1/continuity?patch=already-reviewed#report-report_1",
    );
  });

  it("marks a completed candidate patch as ignored without writing formal chapter data", async () => {
    mocks.prisma.aiTask.findFirst.mockResolvedValue({
      id: "task_patch_1",
      chapterId: "chapter_6",
      inputJson: JSON.stringify({
        report: {
          id: "report_1",
        },
      }),
    });

    await expect(
      ignoreContinuityFixPatch("project_1", "task_patch_1"),
    ).rejects.toThrow("NEXT_REDIRECT");

    expect(mocks.prisma.aiTask.updateMany).toHaveBeenCalledWith({
      where: {
        id: "task_patch_1",
        projectId: "project_1",
        taskType: "continuity_fix_patch_generation",
        status: "completed",
        adoptionState: "not_reviewed",
      },
      data: {
        adoptionState: "rejected",
      },
    });
    expect(mocks.prisma.chapter.update).not.toHaveBeenCalled();
    expect(mocks.prisma.chapterVersion.create).not.toHaveBeenCalled();
    expect(mocks.redirect).toHaveBeenCalledWith(
      "/projects/project_1/continuity?patch=ignored#report-report_1",
    );
  });
});
