import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  adoptCharacterDraft,
  generateCharacterDraft,
} from "./actions";
import { expireStaleCharacterAiTasks } from "@/lib/ai/character-task-maintenance";

const mocks = vi.hoisted(() => {
  const tx = {
    aiTask: {
      updateMany: vi.fn(),
    },
    character: {
      create: vi.fn(),
    },
    characterVersion: {
      create: vi.fn(),
    },
  };

  return {
    notFound: vi.fn(),
    redirect: vi.fn(),
    revalidatePath: vi.fn(),
    ensureDefaultPromptTemplate: vi.fn(),
    startLoggedOpenAITextTask: vi.fn(),
    prisma: {
      project: {
        findUnique: vi.fn(),
      },
      character: {
        findMany: vi.fn(),
        create: vi.fn(),
        delete: vi.fn(),
        findFirst: vi.fn(),
        update: vi.fn(),
      },
      characterRelationship: {
        findMany: vi.fn(),
      },
      outline: {
        findMany: vi.fn(),
      },
      aiTask: {
        findFirst: vi.fn(),
        updateMany: vi.fn(),
      },
      $transaction: vi.fn(),
    },
    tx,
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

vi.mock("@/lib/ai/task-logger", () => ({
  startLoggedOpenAITextTask: mocks.startLoggedOpenAITextTask,
}));

const project = {
  id: "project_1",
  title: "离线未来",
  genre: "穿越",
  targetAudience: "20-40岁年轻人",
  platform: "个人网站",
  description: "程序员带着断网 AI 回到 1999 年。",
  setting: null,
};

function buildGenerationFormData() {
  const formData = new FormData();
  formData.set("targetRole", "阶段反派");
  formData.set("brief", "需要压迫主角早期电脑生意。");
  return formData;
}

describe("character AI actions", () => {
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
    mocks.prisma.project.findUnique.mockResolvedValue(project);
    mocks.prisma.character.findMany.mockResolvedValue([]);
    mocks.prisma.characterRelationship.findMany.mockResolvedValue([]);
    mocks.prisma.outline.findMany.mockResolvedValue([]);
    mocks.prisma.aiTask.findFirst.mockResolvedValue(null);
    mocks.prisma.aiTask.updateMany.mockResolvedValue({
      count: 0,
    });
    mocks.tx.aiTask.updateMany.mockResolvedValue({
      count: 1,
    });
    mocks.tx.character.create.mockResolvedValue({
      id: "character_1",
      notes: "AI 建议关系：\n与主角形成早期冲突",
    });
    mocks.tx.characterVersion.create.mockResolvedValue({});
    mocks.ensureDefaultPromptTemplate.mockResolvedValue({
      id: "template_1",
      taskType: "character_generation",
      systemPrompt: "system",
      userPrompt: "user",
      contextNotes: "notes",
      responseSchema: "{}",
    });
    mocks.startLoggedOpenAITextTask.mockResolvedValue({
      id: "task_1",
    });
  });

  it("marks stale character generation tasks as failed", async () => {
    const now = new Date("2026-06-21T02:00:00.000Z");

    await expireStaleCharacterAiTasks("project_1", now);

    expect(mocks.prisma.aiTask.updateMany).toHaveBeenCalledWith({
      where: {
        projectId: "project_1",
        taskType: "character_generation",
        status: {
          in: ["pending", "running"],
        },
        OR: [
          {
            startedAt: {
              lt: new Date("2026-06-21T01:45:00.000Z"),
            },
          },
          {
            startedAt: null,
            createdAt: {
              lt: new Date("2026-06-21T01:45:00.000Z"),
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

  it("does not create another character generation task when one is active", async () => {
    mocks.prisma.aiTask.findFirst.mockResolvedValue({
      id: "active_task",
    });

    await expect(
      generateCharacterDraft("project_1", buildGenerationFormData()),
    ).rejects.toThrow("NEXT_REDIRECT");

    expect(mocks.startLoggedOpenAITextTask).not.toHaveBeenCalled();
  });

  it("starts a draft-only character generation task", async () => {
    await expect(
      generateCharacterDraft("project_1", buildGenerationFormData()),
    ).rejects.toThrow("NEXT_REDIRECT");

    expect(mocks.startLoggedOpenAITextTask).toHaveBeenCalledWith(
      expect.objectContaining({
        projectId: "project_1",
        taskType: "character_generation",
        inputJson: expect.objectContaining({
          request: {
            targetRole: "阶段反派",
            brief: "需要压迫主角早期电脑生意。",
          },
        }),
      }),
      expect.objectContaining({
        input: expect.stringContaining("阶段反派"),
      }),
    );
    expect(mocks.tx.character.create).not.toHaveBeenCalled();
  });

  it("adopts a completed character draft into a formal character snapshot", async () => {
    mocks.prisma.aiTask.findFirst.mockResolvedValue({
      id: "task_1",
      inputContextSummary: "离线未来 人物草案生成",
      outputText: JSON.stringify({
        character: {
          name: "罗文斌",
          roleInStory: "早期阶段对手",
          identity: "县城电脑城老板",
        },
        suggestedRelationships: ["与陈远形成电脑培训班资源竞争。"],
      }),
      adoptionState: "not_reviewed",
    });
    mocks.tx.character.create.mockResolvedValue({
      id: "character_1",
      notes: "AI 建议关系：\n与陈远形成电脑培训班资源竞争。",
    });

    await expect(
      adoptCharacterDraft("project_1", "task_1"),
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
    expect(mocks.tx.character.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        projectId: "project_1",
        name: "罗文斌",
        roleInStory: "早期阶段对手",
        identity: "县城电脑城老板",
        notes: "AI 建议关系：\n与陈远形成电脑培训班资源竞争。",
      }),
    });
    expect(mocks.tx.characterVersion.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        projectId: "project_1",
        characterId: "character_1",
        sourceType: "ai_character_generation",
      }),
    });
  });

  it("keeps character draft adoption idempotent", async () => {
    mocks.prisma.aiTask.findFirst.mockResolvedValue({
      id: "task_1",
      inputContextSummary: "离线未来 人物草案生成",
      outputText: JSON.stringify({
        character: {
          name: "罗文斌",
        },
      }),
      adoptionState: "not_reviewed",
    });
    mocks.tx.aiTask.updateMany.mockResolvedValue({
      count: 0,
    });

    await expect(
      adoptCharacterDraft("project_1", "task_1"),
    ).rejects.toThrow("NEXT_REDIRECT");

    expect(mocks.tx.character.create).not.toHaveBeenCalled();
    expect(mocks.tx.characterVersion.create).not.toHaveBeenCalled();
  });
});
