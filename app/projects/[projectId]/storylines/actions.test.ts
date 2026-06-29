import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  archiveStoryline,
  completeStoryline,
  createStoryline,
  generateStorylineDrafts,
  saveStorylineDraftCandidate,
  updateStoryline,
  updateStorylineDraftTaskAdoptionState,
} from "./actions";

const mocks = vi.hoisted(() => {
  const tx = {
    storyline: {
      create: vi.fn(),
      update: vi.fn(),
    },
    storylineCharacter: {
      deleteMany: vi.fn(),
      createMany: vi.fn(),
    },
    storylineForeshadow: {
      deleteMany: vi.fn(),
      createMany: vi.fn(),
    },
    storylineChapter: {
      deleteMany: vi.fn(),
      createMany: vi.fn(),
    },
    storylineOutline: {
      deleteMany: vi.fn(),
      createMany: vi.fn(),
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
      character: {
        count: vi.fn(),
        findMany: vi.fn(),
      },
      foreshadow: {
        count: vi.fn(),
        findMany: vi.fn(),
      },
      chapter: {
        count: vi.fn(),
        findMany: vi.fn(),
      },
      outline: {
        count: vi.fn(),
        findMany: vi.fn(),
      },
      aiTask: {
        findFirst: vi.fn(),
        updateMany: vi.fn(),
      },
      storyline: {
        findFirst: vi.fn(),
        findMany: vi.fn(),
        update: vi.fn(),
        updateMany: vi.fn(),
      },
      $transaction: vi.fn(),
    },
    tx,
    ensureDefaultPromptTemplate: vi.fn(),
    expireStaleStorylineAiTasks: vi.fn(),
    startLoggedOpenAITextTask: vi.fn(),
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

vi.mock("@/lib/ai/prompt-template-store", () => ({
  ensureDefaultPromptTemplate: mocks.ensureDefaultPromptTemplate,
}));

vi.mock("@/lib/ai/storyline-task-maintenance", () => ({
  expireStaleStorylineAiTasks: mocks.expireStaleStorylineAiTasks,
}));

vi.mock("@/lib/ai/task-logger", () => ({
  startLoggedOpenAITextTask: mocks.startLoggedOpenAITextTask,
}));

function formData(values: Record<string, string | number | string[]>) {
  const data = new FormData();

  Object.entries(values).forEach(([name, value]) => {
    if (Array.isArray(value)) {
      value.forEach((item) => data.append(name, item));
    } else {
      data.set(name, String(value));
    }
  });

  return data;
}

describe("storyline actions", () => {
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
    mocks.prisma.project.findUnique.mockResolvedValue({
      id: "project_1",
      title: "离线未来",
      genre: "穿越",
      targetAudience: "20-40岁",
      platform: "个人网站",
      description: "失业程序员带着断网 AI 回到 1999 年。",
      setting: {
        coreSellingPoint: "断网 AI + 年代创业",
      },
    });
    mocks.prisma.character.count.mockResolvedValue(1);
    mocks.prisma.character.findMany.mockResolvedValue([
      {
        id: "character_1",
        name: "陈远",
        status: "active",
        roleInStory: "主角",
        identity: "失业程序员重生者",
        characterArc: "从依赖 AI 到主动决策",
        latestAppearance: "第 6 章",
      },
    ]);
    mocks.prisma.foreshadow.count.mockResolvedValue(1);
    mocks.prisma.foreshadow.findMany.mockResolvedValue([
      {
        id: "foreshadow_1",
        content: "省城供货渠道可能存在以次充好。",
        status: "planted",
        importance: "high",
        expectedResolveChapter: 12,
      },
    ]);
    mocks.prisma.chapter.count.mockResolvedValue(1);
    mocks.prisma.chapter.findMany.mockResolvedValue([
      {
        id: "chapter_6",
        chapterNumber: 6,
        title: "查分方案",
        status: "final",
        goal: "承接第5章，落地查分服务。",
        aiTasks: [
          {
            outputText: "第6章完成查分方案和罗文斌间接施压。",
          },
        ],
      },
    ]);
    mocks.prisma.outline.count.mockResolvedValue(1);
    mocks.prisma.outline.findMany.mockResolvedValue([
      {
        id: "outline_1",
        level: "chapter",
        title: "第6章《查分方案》",
        status: "completed",
        chapterNumber: 6,
        startChapter: null,
        endChapter: null,
        goal: "兑现查分服务并推进渠道压力。",
        mainlineProgression: "",
        coreEvents: "",
        characterChanges: "",
        foreshadow: "",
        resolvedForeshadow: "",
      },
    ]);
    mocks.prisma.$transaction.mockImplementation(async (callback) =>
      callback(mocks.tx),
    );
    mocks.tx.storyline.create.mockResolvedValue({
      id: "storyline_1",
    });
    mocks.tx.storyline.update.mockResolvedValue({
      id: "storyline_1",
    });
    mocks.prisma.storyline.findFirst.mockResolvedValue({
      id: "storyline_1",
    });
    mocks.prisma.storyline.findMany.mockResolvedValue([]);
    mocks.prisma.storyline.update.mockResolvedValue({
      id: "storyline_1",
      status: "archived",
    });
    mocks.prisma.storyline.updateMany.mockResolvedValue({ count: 1 });
    mocks.prisma.aiTask.findFirst.mockResolvedValue(null);
    mocks.prisma.aiTask.updateMany.mockResolvedValue({ count: 1 });
    mocks.ensureDefaultPromptTemplate.mockResolvedValue({
      id: "prompt_1",
      taskType: "storyline_generation",
      systemPrompt: "system",
      userPrompt: "user",
      contextNotes: "notes",
      responseSchema: "{}",
    });
    mocks.expireStaleStorylineAiTasks.mockResolvedValue(undefined);
    mocks.startLoggedOpenAITextTask.mockResolvedValue({
      id: "task_1",
    });
    mocks.tx.storylineCharacter.deleteMany.mockResolvedValue({ count: 0 });
    mocks.tx.storylineForeshadow.deleteMany.mockResolvedValue({ count: 0 });
    mocks.tx.storylineChapter.deleteMany.mockResolvedValue({ count: 0 });
    mocks.tx.storylineOutline.deleteMany.mockResolvedValue({ count: 0 });
    mocks.tx.storylineCharacter.createMany.mockResolvedValue({ count: 1 });
    mocks.tx.storylineForeshadow.createMany.mockResolvedValue({ count: 1 });
    mocks.tx.storylineChapter.createMany.mockResolvedValue({ count: 1 });
    mocks.tx.storylineOutline.createMany.mockResolvedValue({ count: 1 });
  });

  it("creates a formal storyline and project-scoped relations", async () => {
    await expect(
      createStoryline(
        "project_1",
        formData({
          name: "罗文斌反派线",
          type: "antagonist_line",
          status: "active",
          startChapter: 2,
          endChapter: 12,
          coreGoal: "让罗文斌从本地试探升级为渠道正面冲突。",
          currentProgress: "已经完成培训班施压和坏道试探。",
          characterIds: ["character_1"],
          foreshadowIds: ["foreshadow_1"],
          chapterIds: ["chapter_2"],
          outlineIds: ["outline_1"],
        }),
      ),
    ).rejects.toThrow("NEXT_REDIRECT");

    expect(mocks.tx.storyline.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        projectId: "project_1",
        name: "罗文斌反派线",
        type: "antagonist_line",
        status: "active",
        startChapter: 2,
        endChapter: 12,
      }),
      select: {
        id: true,
      },
    });
    expect(mocks.tx.storylineCharacter.createMany).toHaveBeenCalledWith({
      data: [
        {
          projectId: "project_1",
          storylineId: "storyline_1",
          characterId: "character_1",
        },
      ],
    });
    expect(mocks.tx.storylineForeshadow.createMany).toHaveBeenCalledWith({
      data: [
        {
          projectId: "project_1",
          storylineId: "storyline_1",
          foreshadowId: "foreshadow_1",
        },
      ],
    });
    expect(mocks.tx.storylineChapter.createMany).toHaveBeenCalledWith({
      data: [
        {
          projectId: "project_1",
          storylineId: "storyline_1",
          chapterId: "chapter_2",
        },
      ],
    });
    expect(mocks.tx.storylineOutline.createMany).toHaveBeenCalledWith({
      data: [
        {
          projectId: "project_1",
          storylineId: "storyline_1",
          outlineId: "outline_1",
        },
      ],
    });
  });

  it("rejects invalid chapter ranges before writing", async () => {
    await expect(
      createStoryline(
        "project_1",
        formData({
          name: "倒置范围",
          startChapter: 10,
          endChapter: 3,
        }),
      ),
    ).rejects.toThrow("NEXT_REDIRECT");

    expect(mocks.prisma.$transaction).not.toHaveBeenCalled();
    expect(mocks.redirect).toHaveBeenCalledWith(
      "/projects/project_1/storylines?storylineError=invalidRange#storylines",
    );
  });

  it("rejects cross-project relation ids before writing", async () => {
    mocks.prisma.character.count.mockResolvedValue(0);

    await expect(
      createStoryline(
        "project_1",
        formData({
          name: "跨项目关系",
          characterIds: ["character_from_other_project"],
        }),
      ),
    ).rejects.toThrow("NEXT_REDIRECT");

    expect(mocks.prisma.$transaction).not.toHaveBeenCalled();
    expect(mocks.redirect).toHaveBeenCalledWith(
      "/projects/project_1/storylines?storylineError=invalidRelation#storylines",
    );
  });

  it("starts a logged AI task for storyline draft candidates", async () => {
    await expect(generateStorylineDrafts("project_1")).rejects.toThrow(
      "NEXT_REDIRECT",
    );

    expect(mocks.expireStaleStorylineAiTasks).toHaveBeenCalledWith("project_1");
    expect(mocks.ensureDefaultPromptTemplate).toHaveBeenCalledWith(
      "project_1",
      "storyline_generation",
    );
    expect(mocks.startLoggedOpenAITextTask).toHaveBeenCalledWith(
      expect.objectContaining({
        projectId: "project_1",
        promptTemplateId: "prompt_1",
        taskType: "storyline_generation",
        inputContextSummary: expect.stringContaining("故事线草案生成"),
        inputJson: expect.objectContaining({
          characters: expect.arrayContaining([
            expect.objectContaining({
              id: "character_1",
              name: "陈远",
            }),
          ]),
          foreshadows: expect.arrayContaining([
            expect.objectContaining({
              id: "foreshadow_1",
            }),
          ]),
        }),
      }),
      expect.objectContaining({
        systemPrompt: "system",
        developerPrompt: expect.stringContaining("user"),
        input: expect.stringContaining("只输出 JSON 对象"),
      }),
    );
    expect(mocks.redirect).toHaveBeenCalledWith(
      "/projects/project_1/storylines?storylineAi=started#storyline-ai",
    );
  });

  it("does not start a duplicate storyline generation task while one is active", async () => {
    mocks.prisma.aiTask.findFirst.mockResolvedValueOnce({
      id: "active_task",
    });

    await expect(generateStorylineDrafts("project_1")).rejects.toThrow(
      "NEXT_REDIRECT",
    );

    expect(mocks.startLoggedOpenAITextTask).not.toHaveBeenCalled();
    expect(mocks.redirect).toHaveBeenCalledWith(
      "/projects/project_1/storylines?storylineAi=active#storyline-ai",
    );
  });

  it("saves an AI draft candidate only after explicit author confirmation", async () => {
    mocks.prisma.aiTask.findFirst.mockResolvedValueOnce({
      id: "task_1",
    });
    mocks.prisma.storyline.findFirst.mockResolvedValueOnce(null);

    await expect(
      saveStorylineDraftCandidate(
        "project_1",
        "task_1",
        formData({
          name: "县城第一桶金主线",
          type: "mainline",
          status: "active",
          startChapter: 1,
          endChapter: 30,
          coreGoal: "陈远在县城建立第一桶金和早期团队。",
          currentProgress: "已完成查分服务铺垫。",
          notes: "作者确认后才写入正式故事线。",
          characterIds: ["character_1"],
          foreshadowIds: ["foreshadow_1"],
          chapterIds: ["chapter_6"],
          outlineIds: ["outline_1"],
        }),
      ),
    ).rejects.toThrow("NEXT_REDIRECT");

    expect(mocks.tx.storyline.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        projectId: "project_1",
        name: "县城第一桶金主线",
        type: "mainline",
        status: "active",
        startChapter: 1,
        endChapter: 30,
      }),
      select: {
        id: true,
      },
    });
    expect(mocks.tx.storylineCharacter.createMany).toHaveBeenCalledWith({
      data: [
        {
          projectId: "project_1",
          storylineId: "storyline_1",
          characterId: "character_1",
        },
      ],
    });
    expect(mocks.prisma.aiTask.findFirst).toHaveBeenCalledWith({
      where: {
        id: "task_1",
        projectId: "project_1",
        taskType: "storyline_generation",
        status: "completed",
        adoptionState: "not_reviewed",
      },
      select: {
        id: true,
      },
    });
    expect(mocks.prisma.aiTask.updateMany).not.toHaveBeenCalled();
    expect(mocks.redirect).toHaveBeenCalledWith(
      "/projects/project_1/storylines?storylineSaved=adopted#storylines",
    );
  });

  it("rejects duplicate AI draft candidate saves by name, type, and chapter range", async () => {
    mocks.prisma.aiTask.findFirst.mockResolvedValueOnce({
      id: "task_1",
    });
    mocks.prisma.storyline.findFirst.mockResolvedValueOnce({
      id: "existing_storyline",
    });

    await expect(
      saveStorylineDraftCandidate(
        "project_1",
        "task_1",
        formData({
          name: "县城第一桶金主线",
          type: "mainline",
          status: "active",
          startChapter: 1,
          endChapter: 30,
          coreGoal: "重复候选不应再次写入正式故事线。",
        }),
      ),
    ).rejects.toThrow("NEXT_REDIRECT");

    expect(mocks.prisma.storyline.findFirst).toHaveBeenCalledWith({
      where: {
        projectId: "project_1",
        name: "县城第一桶金主线",
        type: "mainline",
        startChapter: 1,
        endChapter: 30,
        status: {
          not: "archived",
        },
      },
      select: {
        id: true,
      },
    });
    expect(mocks.prisma.$transaction).not.toHaveBeenCalled();
    expect(mocks.tx.storyline.create).not.toHaveBeenCalled();
    expect(mocks.redirect).toHaveBeenCalledWith(
      "/projects/project_1/storylines?storylineError=duplicateStoryline#storylines",
    );
  });

  it("rejects stale candidate forms after the AI task has already been reviewed", async () => {
    mocks.prisma.aiTask.findFirst.mockResolvedValueOnce(null);

    await expect(
      saveStorylineDraftCandidate(
        "project_1",
        "task_1",
        formData({
          name: "旧页面候选",
          type: "mainline",
          status: "active",
          coreGoal: "旧页面不应再写入正式故事线。",
        }),
      ),
    ).rejects.toThrow("NEXT_NOT_FOUND");

    expect(mocks.prisma.aiTask.findFirst).toHaveBeenCalledWith({
      where: {
        id: "task_1",
        projectId: "project_1",
        taskType: "storyline_generation",
        status: "completed",
        adoptionState: "not_reviewed",
      },
      select: {
        id: true,
      },
    });
    expect(mocks.prisma.$transaction).not.toHaveBeenCalled();
    expect(mocks.tx.storyline.create).not.toHaveBeenCalled();
  });

  it("marks a reviewed storyline draft task as adopted or rejected", async () => {
    await expect(
      updateStorylineDraftTaskAdoptionState("project_1", "task_1", "rejected"),
    ).rejects.toThrow("NEXT_REDIRECT");

    expect(mocks.prisma.aiTask.updateMany).toHaveBeenCalledWith({
      where: {
        id: "task_1",
        projectId: "project_1",
        taskType: "storyline_generation",
        status: "completed",
        adoptionState: "not_reviewed",
      },
      data: {
        adoptionState: "rejected",
      },
    });
    expect(mocks.redirect).toHaveBeenCalledWith(
      "/projects/project_1/storylines#storyline-ai",
    );
  });

  it("reports already-reviewed storyline draft tasks when review state update matches nothing", async () => {
    mocks.prisma.aiTask.updateMany.mockResolvedValueOnce({ count: 0 });

    await expect(
      updateStorylineDraftTaskAdoptionState("project_1", "task_1", "adopted"),
    ).rejects.toThrow("NEXT_REDIRECT");

    expect(mocks.redirect).toHaveBeenCalledWith(
      "/projects/project_1/storylines?storylineAi=already-reviewed#storyline-ai",
    );
  });

  it("replaces all storyline relation tables when updating", async () => {
    await expect(
      updateStoryline(
        "project_1",
        "storyline_1",
        formData({
          name: "谢勇信任线",
          type: "character_arc",
          status: "paused",
          startChapter: 3,
          endChapter: 18,
          coreGoal: "跟踪谢勇从绝对信任到利益考验的变化。",
          characterIds: ["character_2"],
          foreshadowIds: ["foreshadow_2"],
          chapterIds: ["chapter_3"],
          outlineIds: ["outline_2"],
        }),
      ),
    ).rejects.toThrow("NEXT_REDIRECT");

    expect(mocks.prisma.storyline.findFirst).toHaveBeenCalledWith({
      where: {
        id: "storyline_1",
        projectId: "project_1",
      },
      select: {
        id: true,
      },
    });
    expect(mocks.tx.storyline.update).toHaveBeenCalledWith({
      where: {
        id: "storyline_1",
      },
      data: expect.objectContaining({
        name: "谢勇信任线",
        type: "character_arc",
        status: "paused",
        startChapter: 3,
        endChapter: 18,
      }),
    });
    expect(mocks.tx.storylineCharacter.deleteMany).toHaveBeenCalledWith({
      where: {
        storylineId: "storyline_1",
      },
    });
    expect(mocks.tx.storylineForeshadow.deleteMany).toHaveBeenCalledWith({
      where: {
        storylineId: "storyline_1",
      },
    });
    expect(mocks.tx.storylineChapter.deleteMany).toHaveBeenCalledWith({
      where: {
        storylineId: "storyline_1",
      },
    });
    expect(mocks.tx.storylineOutline.deleteMany).toHaveBeenCalledWith({
      where: {
        storylineId: "storyline_1",
      },
    });
    expect(mocks.tx.storylineCharacter.createMany).toHaveBeenCalledWith({
      data: [
        {
          projectId: "project_1",
          storylineId: "storyline_1",
          characterId: "character_2",
        },
      ],
    });
    expect(mocks.tx.storylineForeshadow.createMany).toHaveBeenCalledWith({
      data: [
        {
          projectId: "project_1",
          storylineId: "storyline_1",
          foreshadowId: "foreshadow_2",
        },
      ],
    });
    expect(mocks.tx.storylineChapter.createMany).toHaveBeenCalledWith({
      data: [
        {
          projectId: "project_1",
          storylineId: "storyline_1",
          chapterId: "chapter_3",
        },
      ],
    });
    expect(mocks.tx.storylineOutline.createMany).toHaveBeenCalledWith({
      data: [
        {
          projectId: "project_1",
          storylineId: "storyline_1",
          outlineId: "outline_2",
        },
      ],
    });
  });

  it("archives a storyline without deleting relation rows", async () => {
    await expect(
      archiveStoryline("project_1", "storyline_1"),
    ).rejects.toThrow("NEXT_REDIRECT");

    expect(mocks.prisma.storyline.update).toHaveBeenCalledWith({
      where: {
        id: "storyline_1",
      },
      data: {
        status: "archived",
      },
    });
    expect(mocks.tx.storylineCharacter.deleteMany).not.toHaveBeenCalled();
    expect(mocks.tx.storylineForeshadow.deleteMany).not.toHaveBeenCalled();
    expect(mocks.tx.storylineChapter.deleteMany).not.toHaveBeenCalled();
    expect(mocks.tx.storylineOutline.deleteMany).not.toHaveBeenCalled();
  });

  it("marks a storyline completed without deleting relation rows", async () => {
    await expect(
      completeStoryline("project_1", "storyline_1"),
    ).rejects.toThrow("NEXT_REDIRECT");

    expect(mocks.prisma.storyline.updateMany).toHaveBeenCalledWith({
      where: {
        id: "storyline_1",
        projectId: "project_1",
        status: {
          notIn: ["archived", "completed"],
        },
      },
      data: {
        status: "completed",
      },
    });
    expect(mocks.tx.storylineCharacter.deleteMany).not.toHaveBeenCalled();
    expect(mocks.tx.storylineForeshadow.deleteMany).not.toHaveBeenCalled();
    expect(mocks.tx.storylineChapter.deleteMany).not.toHaveBeenCalled();
    expect(mocks.tx.storylineOutline.deleteMany).not.toHaveBeenCalled();
  });

  it("does not complete a storyline whose state already changed", async () => {
    mocks.prisma.storyline.updateMany.mockResolvedValueOnce({ count: 0 });

    await expect(
      completeStoryline("project_1", "storyline_1"),
    ).rejects.toMatchObject({
      url: "/projects/project_1/storylines?storylineSaved=already-updated#storylines",
    });

    expect(mocks.prisma.storyline.updateMany).toHaveBeenCalledWith({
      where: {
        id: "storyline_1",
        projectId: "project_1",
        status: {
          notIn: ["archived", "completed"],
        },
      },
      data: {
        status: "completed",
      },
    });
    expect(mocks.prisma.storyline.update).not.toHaveBeenCalledWith({
      where: {
        id: "storyline_1",
      },
      data: {
        status: "completed",
      },
    });
  });
});
