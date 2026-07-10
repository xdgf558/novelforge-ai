import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  adoptChapterPolish,
  createChapter,
  generateChapterBeats,
  generateChapterDraft,
  generateChapterPolish,
  updateChapter,
} from "./actions";

const mocks = vi.hoisted(() => {
  const tx = {
    chapter: {
      create: vi.fn(),
      update: vi.fn(),
    },
    chapterVersion: {
      count: vi.fn(),
      create: vi.fn(),
    },
    storyline: {
      findMany: vi.fn(),
    },
    storylineChapter: {
      findMany: vi.fn(),
      createMany: vi.fn(),
    },
    aiTask: {
      update: vi.fn(),
      updateMany: vi.fn(),
    },
  };

  return {
    notFound: vi.fn(),
    redirect: vi.fn(),
    revalidatePath: vi.fn(),
    prisma: {
      project: {
        findUnique: vi.fn(),
      },
      projectSetting: {
        findUnique: vi.fn(),
      },
      chapter: {
        create: vi.fn(),
        delete: vi.fn(),
        findFirst: vi.fn(),
        findMany: vi.fn(),
        update: vi.fn(),
      },
      character: {
        findMany: vi.fn(),
      },
      foreshadow: {
        findMany: vi.fn(),
      },
      chapterVersion: {
        create: vi.fn(),
      },
      aiTask: {
        findFirst: vi.fn(),
      },
      aiPromptTemplate: {
        findFirst: vi.fn(),
        upsert: vi.fn(),
        updateMany: vi.fn(),
      },
      outline: {
        findMany: vi.fn(),
        update: vi.fn(),
      },
      $transaction: vi.fn(),
    },
    tx,
    createOpenAITextResponse: vi.fn(),
    markAiTaskCompleted: vi.fn(),
    markAiTaskFailed: vi.fn(),
    taskLogger: {
      createAiTask: vi.fn(),
      markAiTaskCompleted: vi.fn(),
      markAiTaskFailed: vi.fn(),
      markAiTaskRunning: vi.fn(),
      startLoggedOpenAITextTask: vi.fn(),
    },
  };
});

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

vi.mock("@/lib/ai/openai-client", () => ({
  createOpenAITextResponse: mocks.createOpenAITextResponse,
}));

vi.mock("@/lib/ai/task-logger", () => ({
  createAiTask: mocks.taskLogger.createAiTask,
  markAiTaskCompleted: mocks.markAiTaskCompleted,
  markAiTaskFailed: mocks.markAiTaskFailed,
  markAiTaskRunning: mocks.taskLogger.markAiTaskRunning,
  startLoggedOpenAITextTask: mocks.taskLogger.startLoggedOpenAITextTask,
}));

const baseChapter = {
  id: "chapter_1",
  projectId: "project_1",
  chapterNumber: 1,
  title: "第一章",
  status: "draft",
  goal: "章节目标",
  beats: "章节节拍",
  draftText: "旧草稿正文",
  polishedText: "作者手改精修稿",
  finalText: "旧定稿正文",
  notes: "作者备注",
  wordCount: 5,
  createdAt: new Date("2026-06-20T00:00:00.000Z"),
  updatedAt: new Date("2026-06-20T00:00:00.000Z"),
};

const projectContext = {
  title: "离线未来",
  genre: "穿越创业",
  targetAudience: "公众号读者",
  platform: "wechat",
  totalWordTarget: 1200000,
  chapterWordMin: 5000,
  chapterWordMax: 8000,
  description: "失业程序员带着离线 AI 回到 1999 年。",
  wechatPositioning: "年代创业爽文",
};

const readerFeedbackChapter = {
  chapterNumber: 3,
  title: "罗文斌的警告",
  readerAnalytics: [
    {
      fetchedAt: new Date("2026-06-25T10:00:00.000Z"),
      views: 1280,
      likes: 42,
      comments: 8,
      favorites: 21,
      shares: 5,
      completionRate: 0.78,
      averageReadSeconds: 312,
      dropOffPoint: "中段解释货源链路时流失明显。",
      engagementScore: 73,
    },
  ],
  readerInsights: [
    {
      fetchedAt: new Date("2026-06-25T11:00:00.000Z"),
      summary: "读者认可压迫感，但希望下一章更快进入反击。",
      pacing: "开场少解释，多动作。",
      focus: "林巧和谢勇需要更清晰的行动分工。",
      hookStrategy: "章末保留罗文斌升级施压。",
      riskNotesJson: JSON.stringify(["技术解释偏长"]),
      characterPriorityJson: JSON.stringify({
        谢勇: "地面执行",
      }),
    },
  ],
};

function buildPromptTemplate(taskType: string) {
  return {
    id: `${taskType}_template`,
    taskType,
    systemPrompt: "system prompt",
    userPrompt: "user prompt",
    contextNotes: "context notes",
  };
}

function buildChapterFormData(
  overrides: Partial<Record<string, string | number>> = {},
) {
  const values = {
    chapterNumber: 1,
    title: "第一章",
    status: "draft",
    goal: "章节目标",
    beats: "章节节拍",
    draftText: "草稿正文",
    polishedText: "精修正文",
    finalText: "",
    notes: "作者备注",
    changeReason: "",
    ...overrides,
  };
  const formData = new FormData();

  Object.entries(values).forEach(([name, value]) => {
    formData.set(name, String(value));
  });

  return formData;
}

describe("chapter actions", () => {
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
    mocks.prisma.$transaction.mockImplementation(async (callback) =>
      callback(mocks.tx),
    );
    mocks.prisma.project.findUnique.mockResolvedValue({
      id: "project_1",
    });
    mocks.tx.chapter.create.mockResolvedValue({
      ...baseChapter,
      id: "chapter_new",
      chapterNumber: 7,
    });
    mocks.tx.chapterVersion.count.mockResolvedValue(3);
    mocks.tx.chapterVersion.create.mockResolvedValue({});
    mocks.tx.chapter.update.mockResolvedValue({});
    mocks.tx.storyline.findMany.mockResolvedValue([]);
    mocks.tx.storylineChapter.findMany.mockResolvedValue([]);
    mocks.tx.storylineChapter.createMany.mockResolvedValue({ count: 1 });
    mocks.tx.aiTask.updateMany.mockResolvedValue({
      count: 1,
    });
    mocks.prisma.aiTask.findFirst.mockResolvedValue(null);
    mocks.prisma.aiPromptTemplate.findFirst.mockResolvedValue(
      buildPromptTemplate("chapter_beat_generation"),
    );
    mocks.prisma.aiPromptTemplate.upsert.mockResolvedValue(
      buildPromptTemplate("chapter_beat_generation"),
    );
    mocks.prisma.aiPromptTemplate.updateMany.mockResolvedValue({
      count: 0,
    });
    mocks.prisma.projectSetting.findUnique.mockResolvedValue({});
    mocks.prisma.character.findMany.mockResolvedValue([]);
    mocks.prisma.foreshadow.findMany.mockResolvedValue([]);
    mocks.prisma.chapter.findMany.mockResolvedValue([]);
    mocks.prisma.outline.findMany.mockResolvedValue([]);
    mocks.prisma.outline.update.mockResolvedValue({});
    mocks.taskLogger.startLoggedOpenAITextTask.mockResolvedValue({});
    mocks.createOpenAITextResponse.mockReset();
    mocks.markAiTaskCompleted.mockReset();
    mocks.markAiTaskFailed.mockReset();
  });

  it("auto-links a newly created chapter to matching storyline ranges", async () => {
    mocks.tx.chapter.create.mockResolvedValueOnce({
      ...baseChapter,
      id: "chapter_7",
      chapterNumber: 7,
    });
    mocks.tx.storyline.findMany.mockResolvedValueOnce([
      {
        id: "storyline_main",
      },
      {
        id: "storyline_subplot",
      },
    ]);

    await expect(
      createChapter(
        "project_1",
        buildChapterFormData({
          chapterNumber: 7,
          title: "断供",
          status: "draft",
        }),
      ),
    ).rejects.toThrow("NEXT_REDIRECT");

    expect(mocks.tx.storyline.findMany).toHaveBeenCalledWith({
      where: {
        projectId: "project_1",
        status: {
          not: "archived",
        },
        startChapter: {
          lte: 7,
        },
        endChapter: {
          gte: 7,
        },
      },
      select: {
        id: true,
      },
    });
    expect(mocks.tx.storylineChapter.createMany).toHaveBeenCalledWith({
      data: [
        {
          projectId: "project_1",
          storylineId: "storyline_main",
          chapterId: "chapter_7",
        },
        {
          projectId: "project_1",
          storylineId: "storyline_subplot",
          chapterId: "chapter_7",
        },
      ],
    });
  });

  it("does not duplicate existing storyline chapter relations", async () => {
    mocks.prisma.chapter.findFirst.mockResolvedValue({
      id: "chapter_1",
      chapterNumber: 5,
    });
    mocks.tx.storyline.findMany.mockResolvedValueOnce([
      {
        id: "storyline_main",
      },
      {
        id: "storyline_subplot",
      },
    ]);
    mocks.tx.storylineChapter.findMany.mockResolvedValueOnce([
      {
        storylineId: "storyline_main",
      },
    ]);

    await expect(
      updateChapter(
        "project_1",
        "chapter_1",
        buildChapterFormData({
          chapterNumber: 7,
          title: "断供",
        }),
      ),
    ).rejects.toThrow("NEXT_REDIRECT");

    expect(mocks.tx.storylineChapter.createMany).toHaveBeenCalledWith({
      data: [
        {
          projectId: "project_1",
          storylineId: "storyline_subplot",
          chapterId: "chapter_1",
        },
      ],
    });
  });

  it("adopts a polish task into polishedText without touching finalText", async () => {
    mocks.prisma.chapter.findFirst.mockResolvedValue(baseChapter);
    mocks.prisma.aiTask.findFirst.mockResolvedValue({
      id: "task_1",
      outputText: "  AI 精修正文  ",
      adoptionState: "not_reviewed",
    });

    await expect(
      adoptChapterPolish("project_1", "chapter_1", "task_1"),
    ).rejects.toThrow("NEXT_REDIRECT");

    expect(mocks.tx.aiTask.updateMany).toHaveBeenCalledWith({
      where: {
        id: "task_1",
        adoptionState: "not_reviewed",
      },
      data: {
        adoptionState: "adopted",
      },
    });
    expect(mocks.tx.chapter.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          id: "chapter_1",
        },
        data: expect.objectContaining({
          polishedText: "AI 精修正文",
          finalText: "旧定稿正文",
          status: "revising",
        }),
      }),
    );
    expect(mocks.tx.chapterVersion.create).toHaveBeenCalledTimes(1);
  });

  it("does not create another version when the polish task was already adopted", async () => {
    mocks.prisma.chapter.findFirst.mockResolvedValue(baseChapter);
    mocks.prisma.aiTask.findFirst.mockResolvedValue({
      id: "task_1",
      outputText: "AI 精修正文",
      adoptionState: "adopted",
    });

    await expect(
      adoptChapterPolish("project_1", "chapter_1", "task_1"),
    ).rejects.toThrow("NEXT_REDIRECT");

    expect(mocks.prisma.$transaction).not.toHaveBeenCalled();
    expect(mocks.tx.chapter.update).not.toHaveBeenCalled();
    expect(mocks.tx.chapterVersion.create).not.toHaveBeenCalled();
  });

  it("does not adopt excerpt-only polish tasks", async () => {
    mocks.prisma.chapter.findFirst.mockResolvedValue(baseChapter);
    mocks.prisma.aiTask.findFirst.mockResolvedValue({
      id: "task_1",
      inputJson: JSON.stringify({
        chapter: {
          sourceTextPromptWasExcerpted: true,
        },
      }),
      outputText: "这只是摘录精修预览。",
      adoptionState: "not_reviewed",
    });

    await expect(
      adoptChapterPolish("project_1", "chapter_1", "task_1"),
    ).rejects.toThrow("NEXT_REDIRECT");

    expect(mocks.redirect).toHaveBeenCalledWith(
      "/projects/project_1/chapters/chapter_1?polishError=excerptedTaskCannotAdopt",
    );
    expect(mocks.prisma.$transaction).not.toHaveBeenCalled();
    expect(mocks.tx.aiTask.updateMany).not.toHaveBeenCalled();
    expect(mocks.tx.chapter.update).not.toHaveBeenCalled();
    expect(mocks.tx.chapterVersion.create).not.toHaveBeenCalled();
  });

  it("keeps polish adoption idempotent when the transaction loses the race", async () => {
    mocks.prisma.chapter.findFirst.mockResolvedValue(baseChapter);
    mocks.prisma.aiTask.findFirst.mockResolvedValue({
      id: "task_1",
      outputText: "AI 精修正文",
      adoptionState: "not_reviewed",
    });
    mocks.tx.aiTask.updateMany.mockResolvedValue({
      count: 0,
    });

    await expect(
      adoptChapterPolish("project_1", "chapter_1", "task_1"),
    ).rejects.toThrow("NEXT_REDIRECT");

    expect(mocks.tx.chapter.update).not.toHaveBeenCalled();
    expect(mocks.tx.chapterVersion.create).not.toHaveBeenCalled();
  });

  it("moves final chapters back to revising when adopting a new polish candidate", async () => {
    mocks.prisma.chapter.findFirst.mockResolvedValue({
      ...baseChapter,
      status: "final",
    });
    mocks.prisma.aiTask.findFirst.mockResolvedValue({
      id: "task_1",
      outputText: "AI 新精修正文",
      adoptionState: "not_reviewed",
    });

    await expect(
      adoptChapterPolish("project_1", "chapter_1", "task_1"),
    ).rejects.toThrow("NEXT_REDIRECT");

    expect(mocks.tx.chapter.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          polishedText: "AI 新精修正文",
          finalText: "旧定稿正文",
          status: "revising",
        }),
      }),
    );
  });

  it("finalizes from polished text and creates a chapter version", async () => {
    mocks.prisma.chapter.findFirst.mockResolvedValue({
      id: "chapter_1",
      chapterNumber: 1,
    });
    const formData = buildChapterFormData({
      submitIntent: "finalizeFromPolished",
      polishedText: "作者确认的精修正文",
    });

    await expect(updateChapter("project_1", "chapter_1", formData)).rejects.toThrow(
      "NEXT_REDIRECT",
    );

    expect(mocks.tx.chapter.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          finalText: "作者确认的精修正文",
          status: "final",
        }),
      }),
    );
    expect(mocks.tx.chapterVersion.create).toHaveBeenCalledTimes(1);
  });

  it("syncs outline statuses for both old and new chapter numbers", async () => {
    mocks.prisma.chapter.findFirst.mockResolvedValue({
      id: "chapter_1",
      chapterNumber: 5,
    });
    mocks.prisma.outline.findMany.mockResolvedValue([
      {
        id: "outline_old",
        level: "unit",
        status: "completed",
        startChapter: 1,
        endChapter: 5,
      },
      {
        id: "outline_new",
        level: "unit",
        status: "planned",
        startChapter: 12,
        endChapter: 15,
      },
    ]);
    mocks.prisma.chapter.findMany.mockResolvedValue([
      {
        chapterNumber: 12,
        status: "final",
      },
    ]);
    const formData = buildChapterFormData({
      chapterNumber: 12,
      status: "final",
      finalText: "第十二章定稿",
    });

    await expect(updateChapter("project_1", "chapter_1", formData)).rejects.toThrow(
      "NEXT_REDIRECT",
    );

    expect(mocks.prisma.outline.update).toHaveBeenCalledWith({
      where: {
        id: "outline_old",
      },
      data: {
        status: "planned",
      },
    });
    expect(mocks.prisma.outline.update).toHaveBeenCalledWith({
      where: {
        id: "outline_new",
      },
      data: {
        status: "active",
      },
    });
  });

  it("rejects finalize-from-polished when polished text is empty", async () => {
    mocks.prisma.chapter.findFirst.mockResolvedValue({
      id: "chapter_1",
      chapterNumber: 1,
    });
    const formData = buildChapterFormData({
      submitIntent: "finalizeFromPolished",
      polishedText: "",
      draftText: "草稿正文",
    });

    await expect(updateChapter("project_1", "chapter_1", formData)).rejects.toThrow(
      "NEXT_REDIRECT",
    );

    expect(mocks.redirect).toHaveBeenCalledWith(
      "/projects/project_1/chapters/chapter_1/edit?finalizeError=missingPolishedText#polishedText",
    );
    expect(mocks.prisma.$transaction).not.toHaveBeenCalled();
    expect(mocks.tx.chapterVersion.create).not.toHaveBeenCalled();
  });

  it("passes prior reader feedback into beat generation context", async () => {
    mocks.prisma.chapter.findFirst
      .mockResolvedValueOnce({
        ...baseChapter,
        chapterNumber: 5,
        title: "第五章",
        project: projectContext,
      })
      .mockResolvedValueOnce({
        ...baseChapter,
        chapterNumber: 4,
        title: "上一章",
        finalText: "上一章结尾。",
      });
    mocks.prisma.chapter.findMany
      .mockResolvedValueOnce([
        {
          ...baseChapter,
          chapterNumber: 4,
          title: "上一章",
          finalText: "上一章正文。",
        },
      ])
      .mockResolvedValueOnce([readerFeedbackChapter]);
    mocks.prisma.aiPromptTemplate.findFirst.mockResolvedValue(
      buildPromptTemplate("chapter_beat_generation"),
    );

    await expect(generateChapterBeats("project_1", "chapter_1")).rejects.toThrow(
      "NEXT_REDIRECT",
    );

    expect(mocks.prisma.chapter.findMany).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        where: expect.objectContaining({
          projectId: "project_1",
          chapterNumber: {
            lt: 5,
          },
          OR: [
            {
              readerAnalytics: {
                some: {},
              },
            },
            {
              readerInsights: {
                some: {},
              },
            },
          ],
        }),
        take: 3,
      }),
    );
    const [taskMeta, request] =
      mocks.taskLogger.startLoggedOpenAITextTask.mock.calls[0];
    expect(taskMeta.inputJson.readerFeedback).toEqual([
      expect.objectContaining({
        chapterNumber: 3,
        title: "罗文斌的警告",
        metrics: expect.objectContaining({
          completionRate: 0.78,
          engagementScore: 73,
        }),
      }),
    ]);
    expect(taskMeta.inputContextSummary).toContain("读者反馈 1 条");
    expect(request.input).toContain("读者认可压迫感");
  });

  it("passes prior reader feedback into draft generation context", async () => {
    mocks.prisma.chapter.findFirst
      .mockResolvedValueOnce({
        ...baseChapter,
        chapterNumber: 5,
        title: "第五章",
        beats: "1. 开场反击。\n2. 章末钩子。",
        project: projectContext,
      })
      .mockResolvedValueOnce({
        ...baseChapter,
        chapterNumber: 4,
        title: "上一章",
        finalText: "上一章结尾。",
      });
    mocks.prisma.chapter.findMany.mockResolvedValueOnce([readerFeedbackChapter]);
    mocks.prisma.aiPromptTemplate.findFirst.mockResolvedValue(
      buildPromptTemplate("chapter_draft_generation"),
    );

    await expect(generateChapterDraft("project_1", "chapter_1")).rejects.toThrow(
      "NEXT_REDIRECT",
    );

    expect(mocks.prisma.chapter.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          projectId: "project_1",
          chapterNumber: {
            lt: 5,
          },
          OR: [
            {
              readerAnalytics: {
                some: {},
              },
            },
            {
              readerInsights: {
                some: {},
              },
            },
          ],
        }),
        take: 3,
      }),
    );
    const [taskMeta, request] =
      mocks.taskLogger.startLoggedOpenAITextTask.mock.calls[0];
    expect(taskMeta.inputJson.readerFeedback).toEqual([
      expect.objectContaining({
        chapterNumber: 3,
        insight: expect.objectContaining({
          pacing: "开场少解释，多动作。",
        }),
      }),
    ]);
    expect(taskMeta.inputContextSummary).toContain("读者反馈 1 条");
    expect(request.input).toContain("不要直接在正文中提到数据、指标或读者反馈");
  });

  it("passes Fanqie platform template from draft form into task context", async () => {
    mocks.prisma.chapter.findFirst
      .mockResolvedValueOnce({
        ...baseChapter,
        chapterNumber: 5,
        title: "第五章",
        beats: "1. 开场反击。\n2. 章末钩子。",
        project: projectContext,
      })
      .mockResolvedValueOnce({
        ...baseChapter,
        chapterNumber: 4,
        title: "上一章",
        finalText: "上一章结尾。",
      });
    mocks.prisma.aiPromptTemplate.findFirst.mockResolvedValue(
      buildPromptTemplate("chapter_draft_generation"),
    );
    const formData = new FormData();
    formData.set("platformTemplate", "fanqie");

    await expect(
      generateChapterDraft("project_1", "chapter_1", formData),
    ).rejects.toThrow("NEXT_REDIRECT");

    const [taskMeta, request] =
      mocks.taskLogger.startLoggedOpenAITextTask.mock.calls[0];
    expect(taskMeta.inputJson.platformTemplate).toEqual(
      expect.objectContaining({
        value: "fanqie",
        label: "番茄小说",
      }),
    );
    expect(taskMeta.inputContextSummary).toContain("平台模板：番茄小说");
    expect(request.input).toContain("目标平台：番茄小说长篇连载");
    expect(request.input).toContain("开篇 300 字内必须出现明确人物动作");
  });

  it("passes Fanqie platform template from polish form into task context", async () => {
    mocks.prisma.chapter.findFirst.mockResolvedValueOnce({
      ...baseChapter,
      project: projectContext,
    });
    mocks.prisma.aiPromptTemplate.findFirst.mockResolvedValue(
      buildPromptTemplate("chapter_polish_generation"),
    );
    const formData = new FormData();
    formData.set("platformTemplate", "fanqie");

    await expect(
      generateChapterPolish("project_1", "chapter_1", formData),
    ).rejects.toThrow("NEXT_REDIRECT");

    const [taskMeta, request] =
      mocks.taskLogger.startLoggedOpenAITextTask.mock.calls[0];
    expect(taskMeta.inputJson.platformTemplate).toEqual(
      expect.objectContaining({
        value: "fanqie",
        label: "番茄小说",
      }),
    );
    expect(taskMeta.inputContextSummary).toContain("平台模板：番茄小说");
    expect(request.input).toContain("目标平台：番茄小说长篇连载");
    expect(request.input).toContain("清理 AI 腔、解释腔、总结腔");
  });
});
