import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  generateShortStoryWholeReview,
  resolveShortStoryWholeReviewReport,
} from "./actions";

const mocks = vi.hoisted(() => ({
  redirect: vi.fn(),
  notFound: vi.fn(),
  revalidatePath: vi.fn(),
  assertShortStoryProject: vi.fn(),
  expireTasks: vi.fn(),
  findActiveTask: vi.fn(),
  loadContext: vi.fn(),
  ensureTemplate: vi.fn(),
  startTask: vi.fn(),
  createReports: vi.fn(),
  findReport: vi.fn(),
  resolveReport: vi.fn(),
  reopenReport: vi.fn(),
}));

vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));
vi.mock("next/navigation", () => ({
  redirect: mocks.redirect,
  notFound: mocks.notFound,
}));
vi.mock("@/lib/server-actions/project-guards", () => ({
  assertShortStoryProject: mocks.assertShortStoryProject,
}));
vi.mock("@/lib/ai/short-story-whole-review-task-maintenance", () => ({
  expireStaleShortStoryWholeReviewTasks: mocks.expireTasks,
}));
vi.mock("@/lib/ai/prompt-template-store", () => ({
  ensureDefaultPromptTemplate: mocks.ensureTemplate,
}));
vi.mock("@/lib/ai/task-logger", () => ({
  startLoggedOpenAITextTask: mocks.startTask,
}));
vi.mock("@/lib/short-stories/whole-review-records", () => ({
  createShortStoryWholeReviewReportsFromTask: mocks.createReports,
  findActiveShortStoryWholeReviewTask: mocks.findActiveTask,
  findShortStoryWholeReviewReport: mocks.findReport,
  loadShortStoryWholeReviewContext: mocks.loadContext,
}));
vi.mock("@/lib/continuity/records", () => ({
  resolveContinuityReportRecord: mocks.resolveReport,
  reopenContinuityReportRecord: mocks.reopenReport,
}));

const reviewContext = {
  project: {
    title: "倒计时来信",
    genre: "悬疑",
    totalWordTarget: 30000,
  },
  setting: null,
  blueprint: {
    premise: "主角收到未来来信。",
    openingHook: "来信预告死亡。",
    coreConflict: "主角必须找出寄信人。",
    ending: "主角承担真相的代价。",
  },
  characters: [],
  foreshadows: [],
  timelineEvents: [],
  units: [
    {
      id: "unit_1",
      chapterNumber: 1,
      title: "来信",
      status: "final",
      finalText: "主角收到来信。",
    },
    {
      id: "unit_2",
      chapterNumber: 2,
      title: "选择",
      status: "final",
      finalText: "主角作出选择。",
    },
  ],
};

describe("short-story whole review actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.redirect.mockImplementation((url: string) => {
      const error = new Error("NEXT_REDIRECT");
      Object.assign(error, { url });
      throw error;
    });
    mocks.notFound.mockImplementation(() => {
      throw new Error("NEXT_NOT_FOUND");
    });
    mocks.assertShortStoryProject.mockResolvedValue({
      id: "project_1",
      workType: "short_story",
    });
    mocks.expireTasks.mockResolvedValue(undefined);
    mocks.findActiveTask.mockResolvedValue(null);
    mocks.loadContext.mockResolvedValue(reviewContext);
    mocks.ensureTemplate.mockResolvedValue({
      id: "template_1",
      taskType: "short_story_whole_review",
      systemPrompt: "system",
      userPrompt: "user",
      contextNotes: "notes",
      responseSchema: "{}",
    });
    mocks.startTask.mockResolvedValue({ id: "task_1" });
    mocks.createReports.mockResolvedValue({ count: 1 });
  });

  it("logs one project-level review task and persists completed suggestions", async () => {
    await expect(
      generateShortStoryWholeReview("project_1"),
    ).rejects.toThrow("NEXT_REDIRECT");

    expect(mocks.startTask).toHaveBeenCalledWith(
      expect.objectContaining({
        projectId: "project_1",
        taskType: "short_story_whole_review",
        inputJson: expect.objectContaining({
          units: expect.arrayContaining([
            expect.objectContaining({ id: "unit_1" }),
          ]),
        }),
      }),
      expect.objectContaining({
        input: expect.stringContaining("整篇闭环审校"),
      }),
      expect.objectContaining({ onCompleted: expect.any(Function) }),
    );

    const options = mocks.startTask.mock.calls[0][2];
    await options.onCompleted({ id: "task_1", outputText: '{"issues":[]}' });
    expect(mocks.createReports).toHaveBeenCalledWith({
      outputText: '{"issues":[]}',
      projectId: "project_1",
      taskId: "task_1",
      units: reviewContext.units,
    });
  });

  it("does not duplicate an active whole-story review", async () => {
    mocks.findActiveTask.mockResolvedValue({ id: "task_active" });

    await expect(
      generateShortStoryWholeReview("project_1"),
    ).rejects.toThrow("NEXT_REDIRECT");
    expect(mocks.startTask).not.toHaveBeenCalled();
    expect(mocks.redirect).toHaveBeenCalledWith(
      "/projects/project_1/story-review?review=active",
    );
  });

  it("requires a formal blueprint and at least two confirmed units", async () => {
    mocks.loadContext.mockResolvedValue({
      ...reviewContext,
      blueprint: null,
    });

    await expect(
      generateShortStoryWholeReview("project_1"),
    ).rejects.toThrow("NEXT_REDIRECT");
    expect(mocks.startTask).not.toHaveBeenCalled();
    expect(mocks.redirect).toHaveBeenCalledWith(
      "/projects/project_1/story-review?review=missing-blueprint",
    );
  });

  it("resolves only a scoped whole-story review report", async () => {
    mocks.findReport.mockResolvedValue({
      id: "report_1",
      chapterId: "unit_2",
      status: "open",
    });
    const formData = new FormData();
    formData.set("resolutionNote", "已补足选择动机");

    await expect(
      resolveShortStoryWholeReviewReport("project_1", "report_1", formData),
    ).rejects.toThrow("NEXT_REDIRECT");

    expect(mocks.findReport).toHaveBeenCalledWith({
      projectId: "project_1",
      reportId: "report_1",
    });
    expect(mocks.resolveReport).toHaveBeenCalledWith({
      reportId: "report_1",
      resolutionNote: "已补足选择动机",
    });
  });
});
