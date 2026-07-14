import { beforeEach, describe, expect, it, vi } from "vitest";
import { generateShortStoryUnitPlanDraft } from "./unit-plan-actions";

const mocks = vi.hoisted(() => ({
  assertShortStoryProject: vi.fn(),
  ensureDefaultPromptTemplate: vi.fn(),
  expireStaleTasks: vi.fn(),
  loadSeriesContext: vi.fn(),
  notFound: vi.fn(),
  redirect: vi.fn(),
  revalidatePath: vi.fn(),
  startLoggedOpenAITextTask: vi.fn(),
  prisma: {
    aiTask: {
      findFirst: vi.fn(),
    },
    project: {
      findFirst: vi.fn(),
    },
    character: {
      findMany: vi.fn(),
    },
    chapter: {
      findMany: vi.fn(),
    },
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

vi.mock("@/lib/server-actions/project-guards", () => ({
  assertShortStoryProject: mocks.assertShortStoryProject,
}));

vi.mock("@/lib/ai/prompt-template-store", () => ({
  ensureDefaultPromptTemplate: mocks.ensureDefaultPromptTemplate,
}));

vi.mock("@/lib/ai/short-story-unit-plan-task-maintenance", () => ({
  expireStaleShortStoryUnitPlanTasks: mocks.expireStaleTasks,
}));

vi.mock("@/lib/ai/task-logger", () => ({
  startLoggedOpenAITextTask: mocks.startLoggedOpenAITextTask,
}));

vi.mock("@/lib/short-story-series/context", () => ({
  loadShortStorySeriesContext: mocks.loadSeriesContext,
}));

function buildFormData() {
  const formData = new FormData();

  formData.set("chapterNumber", "2");
  formData.set("unitWordTarget", "5000");
  formData.set("title", "单元 2");
  formData.set("unitSceneMovement", "");
  formData.set("unitConflict", "保住安瓿并救下同僚");
  formData.set("unitTurn", "");
  formData.set("unitPayoffMovement", "");
  formData.set("goal", "");

  return formData;
}

describe("short-story unit plan actions", () => {
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
    mocks.prisma.aiTask.findFirst.mockResolvedValue(null);
    mocks.prisma.project.findFirst.mockResolvedValue({
      id: "project_1",
      title: "永生者档案：坠星瓶",
      workType: "short_story",
      genre: "架空历史科幻",
      totalWordTarget: 30000,
      chapterWordMin: 5000,
      chapterWordMax: 5000,
      setting: {
        worldviewRules: "中世纪人物不能使用现代术语。",
      },
      shortStoryBlueprint: {
        premise: "阿德里安在追杀中误服外星再生剂。",
        coreConflict: "公开坠毁物会引发战争。",
        ending: "阿德里安焚毁舱体并藏下罗盘。",
      },
    });
    mocks.prisma.character.findMany.mockResolvedValue([]);
    mocks.prisma.chapter.findMany.mockResolvedValue([
      {
        chapterNumber: 1,
        title: "荒原测绘",
        goal: "建立坠毁现场。",
      },
    ]);
    mocks.loadSeriesContext.mockResolvedValue("系列规则：长期谜团只推进一步。");
    mocks.ensureDefaultPromptTemplate.mockResolvedValue({
      id: "unit_plan_template",
      taskType: "short_story_unit_plan_generation",
      systemPrompt: "system prompt",
      userPrompt: "user prompt",
      contextNotes: "context notes",
      responseSchema: "schema",
    });
    mocks.startLoggedOpenAITextTask.mockResolvedValue({
      id: "task_1",
    });
  });

  it("starts a logged current-unit planning draft with series and prior-unit context", async () => {
    await expect(
      generateShortStoryUnitPlanDraft("project_1", buildFormData()),
    ).rejects.toThrow("NEXT_REDIRECT");

    expect(mocks.prisma.chapter.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          projectId: "project_1",
          chapterNumber: {
            lt: 2,
          },
        },
      }),
    );
    expect(mocks.startLoggedOpenAITextTask).toHaveBeenCalledWith(
      expect.objectContaining({
        projectId: "project_1",
        taskType: "short_story_unit_plan_generation",
        inputJson: expect.objectContaining({
          target: {
            chapterNumber: 2,
            totalUnitCount: 6,
            unitWordTarget: 5000,
          },
          seriesContext: "系列规则：长期谜团只推进一步。",
          authorHints: {
            unitConflict: "保住安瓿并救下同僚",
          },
        }),
      }),
      expect.objectContaining({
        input: expect.stringContaining("已有前序写作单元"),
      }),
    );
    expect(mocks.redirect).toHaveBeenCalledWith(
      "/projects/project_1/chapters/new?unitPlanTarget=2",
    );
  });

  it("does not call the model before a usable formal blueprint exists", async () => {
    mocks.prisma.project.findFirst.mockResolvedValueOnce({
      id: "project_1",
      workType: "short_story",
      totalWordTarget: 30000,
      chapterWordMin: 5000,
      chapterWordMax: 5000,
      setting: null,
      shortStoryBlueprint: {
        premise: "只有前提",
      },
    });

    await expect(
      generateShortStoryUnitPlanDraft("project_1", buildFormData()),
    ).rejects.toThrow("NEXT_REDIRECT");

    expect(mocks.startLoggedOpenAITextTask).not.toHaveBeenCalled();
    expect(mocks.redirect).toHaveBeenCalledWith(
      "/projects/project_1/chapters/new?unitPlanError=missing-blueprint&unitPlanTarget=2",
    );
  });
});
