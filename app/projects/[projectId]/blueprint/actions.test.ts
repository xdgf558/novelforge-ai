import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  adoptShortStoryBlueprintDraft,
  generateShortStoryBlueprintDraft,
  rejectShortStoryBlueprintDraft,
  restoreShortStoryBlueprintVersion,
  saveShortStoryBlueprint,
} from "./actions";

const mocks = vi.hoisted(() => {
  const tx = {
    aiTask: {
      updateMany: vi.fn(),
    },
    shortStoryBlueprint: {
      findUnique: vi.fn(),
      upsert: vi.fn(),
    },
    shortStoryBlueprintVersion: {
      count: vi.fn(),
      create: vi.fn(),
    },
  };

  return {
    tx,
    redirect: vi.fn(),
    notFound: vi.fn(),
    revalidatePath: vi.fn(),
    assertShortStoryProject: vi.fn(),
    ensureDefaultPromptTemplate: vi.fn(),
    expireStaleShortStoryBlueprintTasks: vi.fn(),
    startLoggedOpenAITextTask: vi.fn(),
    prisma: {
      $transaction: vi.fn(),
      aiTask: {
        findFirst: vi.fn(),
        updateMany: vi.fn(),
      },
      character: {
        findMany: vi.fn(),
      },
      project: {
        findFirst: vi.fn(),
      },
      shortStoryBlueprintVersion: {
        findFirst: vi.fn(),
      },
    },
  };
});

vi.mock("next/cache", () => ({
  revalidatePath: mocks.revalidatePath,
}));

vi.mock("next/navigation", () => ({
  redirect: mocks.redirect,
  notFound: mocks.notFound,
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

vi.mock("@/lib/ai/short-story-blueprint-task-maintenance", () => ({
  expireStaleShortStoryBlueprintTasks:
    mocks.expireStaleShortStoryBlueprintTasks,
}));

vi.mock("@/lib/ai/task-logger", () => ({
  startLoggedOpenAITextTask: mocks.startLoggedOpenAITextTask,
}));

function blueprintFormData() {
  const formData = new FormData();
  formData.set("premise", "陈默收到自己死后的遗书。");
  formData.set("openingHook", "遗书预告三小时后的死亡。");
  formData.set("protagonistPressure", "倒计时内找出寄信者。");
  formData.set("coreConflict", "陈默必须证明未来的自己没有说谎。");
  formData.set("reversalChain", "遗书是真的\n记忆是假的");
  formData.set("emotionalArc", "怀疑到恐惧再到承担");
  formData.set("climax", "陈默选择公开被删除的记忆。");
  formData.set("ending", "他活下来，但失去最想保留的关系。");
  formData.set("requiredPayoffs", "解释遗书来源");
  formData.set("forbiddenDeviations", "不能用梦境收尾");
  formData.set("changeReason", "建立初版蓝图");

  return formData;
}

function validDraftOutput() {
  return JSON.stringify({
    blueprint: {
      premise: "陈默收到自己死后的遗书。",
      openingHook: "遗书预告死亡。",
      protagonistPressure: "三小时倒计时。",
      coreConflict: "陈默必须证明未来的自己没有说谎。",
      reversalChain: "遗书是真的。",
      emotionalArc: "怀疑到承担。",
      climax: "公开记忆。",
      ending: "陈默活下来并承担代价。",
      requiredPayoffs: "解释遗书来源。",
      forbiddenDeviations: "不能梦境收尾。",
    },
  });
}

describe("short-story blueprint actions", () => {
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
    mocks.prisma.$transaction.mockImplementation(
      async (callback: (tx: typeof mocks.tx) => Promise<unknown>) =>
        callback(mocks.tx),
    );
    mocks.tx.aiTask.updateMany.mockResolvedValue({ count: 1 });
    mocks.tx.shortStoryBlueprint.findUnique.mockResolvedValue(null);
    mocks.tx.shortStoryBlueprint.upsert.mockResolvedValue({ id: "blueprint_1" });
    mocks.tx.shortStoryBlueprintVersion.count.mockResolvedValue(0);
    mocks.tx.shortStoryBlueprintVersion.create.mockResolvedValue({});
    mocks.prisma.aiTask.updateMany.mockResolvedValue({ count: 1 });
    mocks.expireStaleShortStoryBlueprintTasks.mockResolvedValue(undefined);
    mocks.startLoggedOpenAITextTask.mockResolvedValue({ id: "task_1" });
  });

  it("saves a formal blueprint and creates a manual version", async () => {
    await expect(
      saveShortStoryBlueprint("project_1", blueprintFormData()),
    ).rejects.toThrow("NEXT_REDIRECT");

    expect(mocks.assertShortStoryProject).toHaveBeenCalledWith("project_1");
    expect(mocks.tx.shortStoryBlueprint.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({
          projectId: "project_1",
          premise: "陈默收到自己死后的遗书。",
        }),
      }),
    );
    expect(mocks.tx.shortStoryBlueprintVersion.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        blueprintId: "blueprint_1",
        versionNumber: 1,
        sourceType: "manual",
      }),
    });
  });

  it("logs generation input without changing the formal blueprint", async () => {
    mocks.prisma.aiTask.findFirst.mockResolvedValue(null);
    mocks.prisma.project.findFirst.mockResolvedValue({
      id: "project_1",
      title: "倒计时来信",
      workType: "short_story",
      totalWordTarget: 30000,
      setting: null,
      shortStoryBlueprint: null,
    });
    mocks.prisma.character.findMany.mockResolvedValue([]);
    mocks.ensureDefaultPromptTemplate.mockResolvedValue({
      id: "template_1",
      taskType: "short_story_blueprint_generation",
      systemPrompt: "system",
      userPrompt: "user",
      contextNotes: "notes",
      responseSchema: "{}",
    });

    await expect(
      generateShortStoryBlueprintDraft("project_1"),
    ).rejects.toThrow("NEXT_REDIRECT");

    expect(mocks.startLoggedOpenAITextTask).toHaveBeenCalledWith(
      expect.objectContaining({
        projectId: "project_1",
        taskType: "short_story_blueprint_generation",
        inputJson: expect.objectContaining({
          project: expect.objectContaining({
            workType: "short_story",
          }),
        }),
      }),
      expect.objectContaining({
        input: expect.stringContaining("# 短故事项目"),
      }),
    );
    expect(mocks.tx.shortStoryBlueprint.upsert).not.toHaveBeenCalled();
  });

  it("adopts a completed draft once and binds the version to its task", async () => {
    mocks.prisma.aiTask.findFirst.mockResolvedValue({
      id: "task_1",
      inputContextSummary: "倒计时来信蓝图生成",
      outputText: validDraftOutput(),
    });

    await expect(
      adoptShortStoryBlueprintDraft("project_1", "task_1"),
    ).rejects.toThrow("NEXT_REDIRECT");

    expect(mocks.tx.aiTask.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          adoptionState: "not_reviewed",
        }),
        data: {
          adoptionState: "adopted",
        },
      }),
    );
    expect(mocks.tx.shortStoryBlueprintVersion.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        sourceAiTaskId: "task_1",
        sourceType: "ai_short_story_blueprint",
      }),
    });
  });

  it("rejects a draft without writing formal blueprint data", async () => {
    await expect(
      rejectShortStoryBlueprintDraft("project_1", "task_1"),
    ).rejects.toThrow("NEXT_REDIRECT");

    expect(mocks.prisma.aiTask.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: {
          adoptionState: "rejected",
        },
      }),
    );
    expect(mocks.prisma.$transaction).not.toHaveBeenCalled();
    expect(mocks.tx.shortStoryBlueprint.upsert).not.toHaveBeenCalled();
  });

  it("restores a historical snapshot and appends a rollback version", async () => {
    mocks.prisma.shortStoryBlueprintVersion.findFirst.mockResolvedValue({
      snapshotJson: JSON.stringify({
        premise: "旧版核心前提",
        coreConflict: "旧版核心冲突",
        ending: "旧版结局",
      }),
      versionNumber: 3,
    });
    mocks.tx.shortStoryBlueprintVersion.count.mockResolvedValue(4);

    await expect(
      restoreShortStoryBlueprintVersion("project_1", "version_3"),
    ).rejects.toThrow("NEXT_REDIRECT");

    expect(mocks.tx.shortStoryBlueprint.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        update: expect.objectContaining({
          premise: "旧版核心前提",
          coreConflict: "旧版核心冲突",
          ending: "旧版结局",
          openingHook: "",
        }),
      }),
    );
    expect(mocks.tx.shortStoryBlueprintVersion.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        versionNumber: 5,
        sourceType: "rollback",
        changeReason: "从短故事蓝图历史 v3 恢复",
      }),
    });
  });
});
