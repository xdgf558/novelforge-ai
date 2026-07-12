import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  createOutline,
  generateEndingPlanDraft,
  generateOutlineDraft,
  ignoreEndingPlanTask,
  markEndingPlanTaskOrganized,
  updateOutline,
} from "./actions";
import { expireStaleOutlineAiTasks } from "@/lib/ai/outline-task-maintenance";

const mocks = vi.hoisted(() => ({
  notFound: vi.fn(),
  redirect: vi.fn(),
  revalidatePath: vi.fn(),
  ensureDefaultPromptTemplate: vi.fn(),
  startLoggedOpenAITextTask: vi.fn(),
  prisma: {
    project: {
      findUnique: vi.fn(),
    },
    outline: {
      create: vi.fn(),
      delete: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
    },
    foreshadow: {
      findMany: vi.fn(),
    },
    character: {
      findMany: vi.fn(),
    },
    chapter: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
    },
    timelineEvent: {
      findMany: vi.fn(),
    },
    aiTask: {
      findFirst: vi.fn(),
      updateMany: vi.fn(),
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

vi.mock("@/lib/ai/prompt-template-store", () => ({
  ensureDefaultPromptTemplate: mocks.ensureDefaultPromptTemplate,
}));

vi.mock("@/lib/ai/task-logger", () => ({
  startLoggedOpenAITextTask: mocks.startLoggedOpenAITextTask,
}));

function buildOutlineFormData(
  overrides: Partial<Record<string, string | number>> = {},
) {
  const values = {
    level: "chapter",
    title: "第 3 章 抢设备",
    status: "planned",
    chapterNumber: 3,
    goal: "抢到培训班设备。",
    ...overrides,
  };
  const formData = new FormData();

  Object.entries(values).forEach(([name, value]) => {
    formData.set(name, String(value));
  });

  return formData;
}

const project = {
  id: "project_1",
  title: "离线未来",
  genre: "穿越创业",
  targetAudience: "20-40岁年轻人",
  platform: "个人网站",
  totalWordTarget: 2000000,
  chapterWordMin: 5000,
  chapterWordMax: 10000,
  description: "程序员带着断网 AI 回到 1999 年。",
  wechatPositioning: null,
  setting: null,
};

describe("outline actions", () => {
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
    mocks.prisma.project.findUnique.mockResolvedValue(project);
    mocks.prisma.outline.create.mockResolvedValue({
      id: "outline_1",
    });
    mocks.prisma.outline.findFirst.mockResolvedValue({
      id: "outline_1",
    });
    mocks.prisma.outline.findMany.mockResolvedValue([]);
    mocks.prisma.foreshadow.findMany.mockResolvedValue([]);
    mocks.prisma.character.findMany.mockResolvedValue([]);
    mocks.prisma.chapter.findFirst.mockResolvedValue(null);
    mocks.prisma.chapter.findMany.mockResolvedValue([]);
    mocks.prisma.timelineEvent.findMany.mockResolvedValue([]);
    mocks.prisma.aiTask.findFirst.mockResolvedValue(null);
    mocks.prisma.aiTask.updateMany.mockResolvedValue({
      count: 0,
    });
    mocks.ensureDefaultPromptTemplate.mockResolvedValue({
      id: "template_1",
      taskType: "outline_generation",
      systemPrompt: "system",
      userPrompt: "user",
      contextNotes: "notes",
    });
    mocks.startLoggedOpenAITextTask.mockResolvedValue({
      id: "task_1",
    });
  });

  it("creates a formal outline snapshot from valid form data", async () => {
    await expect(
      createOutline("project_1", buildOutlineFormData()),
    ).rejects.toThrow("NEXT_REDIRECT");

    expect(mocks.prisma.outline.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        projectId: "project_1",
        level: "chapter",
        title: "第 3 章 抢设备",
        chapterNumber: 3,
        sortOrder: 3,
        goal: "抢到培训班设备。",
      }),
    });
    expect(mocks.redirect).toHaveBeenCalledWith(
      "/projects/project_1/outlines?outlineSaved=chapter",
    );
  });

  it("redirects invalid quick-create form data without writing formal memory", async () => {
    await expect(
      createOutline(
        "project_1",
        buildOutlineFormData({
          title: "",
        }),
      ),
    ).rejects.toThrow("NEXT_REDIRECT");

    expect(mocks.redirect).toHaveBeenCalledWith(
      "/projects/project_1/outlines?outlineError=invalidForm",
    );
    expect(mocks.prisma.outline.create).not.toHaveBeenCalled();
  });

  it("rejects invalid outline chapter ranges without writing formal memory", async () => {
    await expect(
      createOutline(
        "project_1",
        buildOutlineFormData({
          level: "unit",
          startChapter: 10,
          endChapter: 5,
        }),
      ),
    ).rejects.toThrow("NEXT_REDIRECT");

    expect(mocks.redirect).toHaveBeenCalledWith(
      "/projects/project_1/outlines?outlineError=invalidChapterRange",
    );
    expect(mocks.prisma.outline.create).not.toHaveBeenCalled();
  });

  it("rejects chapter outlines without a chapter number", async () => {
    const formData = buildOutlineFormData({
      level: "chapter",
    });
    formData.delete("chapterNumber");

    await expect(createOutline("project_1", formData)).rejects.toThrow(
      "NEXT_REDIRECT",
    );

    expect(mocks.redirect).toHaveBeenCalledWith(
      "/projects/project_1/outlines?outlineError=missingChapterNumber",
    );
    expect(mocks.prisma.outline.create).not.toHaveBeenCalled();
  });

  it("redirects update validation errors back to the edit page", async () => {
    await expect(
      updateOutline(
        "project_1",
        "outline_1",
        buildOutlineFormData({
          level: "unit",
          startChapter: 8,
          endChapter: 3,
        }),
      ),
    ).rejects.toThrow("NEXT_REDIRECT");

    expect(mocks.redirect).toHaveBeenCalledWith(
      "/projects/project_1/outlines/outline_1/edit?outlineError=invalidChapterRange",
    );
    expect(mocks.prisma.outline.update).not.toHaveBeenCalled();
  });

  it("marks stale outline generation tasks as failed", async () => {
    const now = new Date("2026-06-20T13:30:00.000Z");

    await expireStaleOutlineAiTasks("project_1", now);

    expect(mocks.prisma.aiTask.updateMany).toHaveBeenCalledWith({
      where: {
        projectId: "project_1",
        taskType: {
          in: ["outline_generation", "ending_planning_generation"],
        },
        status: {
          in: ["pending", "running"],
        },
        OR: [
          {
            startedAt: {
              lt: new Date("2026-06-20T13:15:00.000Z"),
            },
          },
          {
            startedAt: null,
            createdAt: {
              lt: new Date("2026-06-20T13:15:00.000Z"),
            },
          },
        ],
      },
      data: {
        status: "failed",
        errorMessage:
          "AI 任务运行超过 15 分钟，已自动标记为失败。请重新生成。",
        completedAt: now,
      },
    });
  });

  it("does not create another outline generation task when one is active", async () => {
    mocks.prisma.aiTask.findFirst.mockResolvedValue({
      id: "task_active",
    });

    await expect(
      generateOutlineDraft("project_1", buildOutlineFormData()),
    ).rejects.toThrow("NEXT_REDIRECT");

    expect(mocks.startLoggedOpenAITextTask).not.toHaveBeenCalled();
  });

  it("starts a draft-only outline AI task after stale tasks are released", async () => {
    const formData = new FormData();
    formData.set("targetLevel", "volume");
    formData.set("chapterCount", "10");

    await expect(generateOutlineDraft("project_1", formData)).rejects.toThrow(
      "NEXT_REDIRECT",
    );

    expect(mocks.prisma.aiTask.updateMany).toHaveBeenCalled();
    expect(mocks.startLoggedOpenAITextTask).toHaveBeenCalledWith(
      expect.objectContaining({
        projectId: "project_1",
        taskType: "outline_generation",
        inputJson: expect.objectContaining({
          request: {
            targetLevel: "volume",
            chapterCount: null,
            targetChapterNumber: null,
          },
        }),
      }),
      expect.objectContaining({
        input: expect.not.stringContaining("章节级条目"),
      }),
    );
    expect(mocks.prisma.outline.create).not.toHaveBeenCalled();
  });

  it("forces chapter outline generation to one target chapter", async () => {
    const formData = new FormData();
    formData.set("targetLevel", "chapter");
    formData.set("targetChapterNumber", "3");
    formData.set("chapterCount", "10");

    await expect(generateOutlineDraft("project_1", formData)).rejects.toThrow(
      "NEXT_REDIRECT",
    );

    expect(mocks.startLoggedOpenAITextTask).toHaveBeenCalledWith(
      expect.objectContaining({
        projectId: "project_1",
        taskType: "outline_generation",
        inputJson: expect.objectContaining({
          request: {
            targetLevel: "chapter",
            chapterCount: 1,
            targetChapterNumber: 3,
          },
        }),
        inputContextSummary:
          "《离线未来》章节大纲生成；已有大纲 0 条；角色 0 个；已有章节 0 个；目标第 3 章；固定 1 条章节大纲",
      }),
      expect.objectContaining({
        input: expect.stringContaining("只生成第 3 章的一条章节大纲"),
      }),
    );
  });

  it("anchors target chapter outlines to the previous chapter ending", async () => {
    const formData = new FormData();
    formData.set("targetLevel", "chapter");
    formData.set("targetChapterNumber", "6");
    mocks.prisma.chapter.findFirst.mockResolvedValue({
      chapterNumber: 5,
      title: "半个月",
      draftText: "草稿旧内容",
      polishedText: "精修旧内容",
      finalText:
        "小周压低声音说：罗文斌明天会用坏硬盘坑方老板。陈远抬头看向培训班二楼的灯，知道第一个突破口来了。",
    });

    await expect(generateOutlineDraft("project_1", formData)).rejects.toThrow(
      "NEXT_REDIRECT",
    );

    expect(mocks.prisma.chapter.findFirst).toHaveBeenCalledWith({
      where: {
        projectId: "project_1",
        chapterNumber: 5,
      },
      select: {
        chapterNumber: true,
        title: true,
        draftText: true,
        polishedText: true,
        finalText: true,
      },
    });
    expect(mocks.startLoggedOpenAITextTask).toHaveBeenCalledWith(
      expect.objectContaining({
        inputJson: expect.objectContaining({
          previousChapter: expect.objectContaining({
            chapterNumber: 5,
            title: "半个月",
            endingText: expect.stringContaining("第一个突破口来了"),
          }),
        }),
      }),
      expect.objectContaining({
        input: expect.stringContaining("必须承接的上一章结尾"),
      }),
    );
  });

  it("anchors a next-unit draft to its suggested starting chapter", async () => {
    const formData = new FormData();
    formData.set("targetLevel", "unit");
    formData.set("targetChapterNumber", "17");
    mocks.prisma.chapter.findFirst.mockResolvedValue({
      chapterNumber: 16,
      title: "炭图藏锋",
      draftText: null,
      polishedText: null,
      finalText: "铁匣开启，裴仲明留下的完整密信终于重见天日。",
    });

    await expect(generateOutlineDraft("project_1", formData)).rejects.toThrow(
      "NEXT_REDIRECT",
    );

    expect(mocks.prisma.chapter.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          projectId: "project_1",
          chapterNumber: 16,
        },
      }),
    );
    expect(mocks.startLoggedOpenAITextTask).toHaveBeenCalledWith(
      expect.objectContaining({
        inputJson: expect.objectContaining({
          request: {
            targetLevel: "unit",
            chapterCount: null,
            targetChapterNumber: 17,
          },
          previousChapter: expect.objectContaining({
            chapterNumber: 16,
          }),
        }),
        inputContextSummary:
          "《离线未来》剧情单元大纲生成；已有大纲 0 条；角色 0 个；已有章节 0 个；建议起始第 17 章",
      }),
      expect.objectContaining({
        input: expect.stringContaining("从第 17 章开始的下一剧情单元"),
      }),
    );
    expect(mocks.prisma.outline.create).not.toHaveBeenCalled();
  });

  it("starts a draft-only ending planning task without writing formal outline memory", async () => {
    mocks.ensureDefaultPromptTemplate.mockResolvedValue({
      id: "ending_template_1",
      taskType: "ending_planning_generation",
      systemPrompt: "system",
      userPrompt: "user",
      contextNotes: "notes",
    });
    mocks.prisma.chapter.findMany.mockResolvedValue([
      {
        chapterNumber: 1,
        title: "开局",
        status: "final",
        goal: "确认重生。",
        wordCount: 90000,
      },
    ]);
    mocks.prisma.foreshadow.findMany.mockResolvedValue([
      {
        content: "谢勇怀疑陈远的信息源。",
        status: "planted",
        importance: "high",
        expectedResolveChapter: 20,
        plantedChapter: {
          chapterNumber: 2,
          title: "谢勇出场",
        },
        resolvedChapter: null,
      },
    ]);

    await expect(generateEndingPlanDraft("project_1")).rejects.toThrow(
      "NEXT_REDIRECT",
    );

    expect(mocks.ensureDefaultPromptTemplate).toHaveBeenCalledWith(
      "project_1",
      "ending_planning_generation",
    );
    expect(mocks.startLoggedOpenAITextTask).toHaveBeenCalledWith(
      expect.objectContaining({
        projectId: "project_1",
        taskType: "ending_planning_generation",
        inputContextSummary: expect.stringContaining("终局规划"),
        inputJson: expect.objectContaining({
          readiness: expect.objectContaining({
            currentWords: 90000,
            progressPercent: 5,
          }),
        }),
      }),
      expect.objectContaining({
        input: expect.stringContaining("不得自动把任何伏笔标记为已回收或废弃"),
      }),
    );
    expect(mocks.prisma.outline.create).not.toHaveBeenCalled();
    expect(mocks.redirect).toHaveBeenCalledWith(
      "/projects/project_1/outlines#ending-planning",
    );
  });

  it("keeps high-importance unresolved foreshadows in ending planning even when many resolved items exist", async () => {
    mocks.ensureDefaultPromptTemplate.mockResolvedValue({
      id: "ending_template_1",
      taskType: "ending_planning_generation",
      systemPrompt: "system",
      userPrompt: "user",
      contextNotes: "notes",
    });
    mocks.prisma.chapter.findMany.mockResolvedValue([
      {
        chapterNumber: 1,
        title: "终局前",
        status: "final",
        goal: "终局前最后整备。",
        wordCount: 1950000,
      },
    ]);

    const highPlanted = {
      id: "foreshadow_high",
      content: "零号真实来源仍未揭开。",
      status: "planted",
      importance: "high",
      expectedResolveChapter: 120,
      plantedChapter: {
        chapterNumber: 1,
        title: "开局",
      },
      resolvedChapter: null,
      updatedAt: new Date("2026-06-24T12:00:00.000Z"),
    };
    const resolvedForeshadows = Array.from({ length: 35 }, (_, index) => ({
      id: `foreshadow_resolved_${index}`,
      content: `已回收的中重要度伏笔 ${index}`,
      status: "resolved",
      importance: "medium",
      expectedResolveChapter: index + 2,
      plantedChapter: null,
      resolvedChapter: {
        chapterNumber: index + 2,
        title: `回收章节 ${index}`,
      },
      updatedAt: new Date(
        `2026-06-${String(24 - (index % 20)).padStart(2, "0")}T12:00:00.000Z`,
      ),
    }));

    mocks.prisma.foreshadow.findMany
      .mockResolvedValueOnce([highPlanted])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce(resolvedForeshadows);

    await expect(generateEndingPlanDraft("project_1")).rejects.toThrow(
      "NEXT_REDIRECT",
    );

    expect(mocks.startLoggedOpenAITextTask).toHaveBeenCalledWith(
      expect.objectContaining({
        taskType: "ending_planning_generation",
        inputJson: expect.objectContaining({
          readiness: expect.objectContaining({
            highImportanceUnresolvedForeshadowCount: 1,
            unresolvedForeshadowCount: 1,
          }),
          highImportanceForeshadows: expect.arrayContaining([
            expect.objectContaining({
              content: "零号真实来源仍未揭开。",
              importance: "high",
              status: "planted",
            }),
          ]),
        }),
      }),
      expect.objectContaining({
        input: expect.stringContaining("零号真实来源仍未揭开"),
      }),
    );
  });

  it("marks a completed ending planning task as organized without writing formal outlines", async () => {
    await expect(
      markEndingPlanTaskOrganized("project_1", "task_ending_1"),
    ).rejects.toThrow("NEXT_REDIRECT");

    expect(mocks.prisma.aiTask.updateMany).toHaveBeenCalledWith({
      where: {
        id: "task_ending_1",
        projectId: "project_1",
        taskType: "ending_planning_generation",
        status: "completed",
        adoptionState: "not_reviewed",
      },
      data: {
        adoptionState: "adopted",
      },
    });
    expect(mocks.prisma.outline.create).not.toHaveBeenCalled();
    expect(mocks.redirect).toHaveBeenCalledWith(
      "/projects/project_1/outlines#ending-planning",
    );
  });

  it("marks a completed ending planning task as ignored without writing formal outlines", async () => {
    await expect(
      ignoreEndingPlanTask("project_1", "task_ending_1"),
    ).rejects.toThrow("NEXT_REDIRECT");

    expect(mocks.prisma.aiTask.updateMany).toHaveBeenCalledWith({
      where: {
        id: "task_ending_1",
        projectId: "project_1",
        taskType: "ending_planning_generation",
        status: "completed",
        adoptionState: "not_reviewed",
      },
      data: {
        adoptionState: "rejected",
      },
    });
    expect(mocks.prisma.outline.create).not.toHaveBeenCalled();
    expect(mocks.redirect).toHaveBeenCalledWith(
      "/projects/project_1/outlines#ending-planning",
    );
  });
});
