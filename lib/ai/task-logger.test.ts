import { beforeEach, describe, expect, it, vi } from "vitest";
import { createAiTask, startLoggedOpenAITextTask } from "./task-logger";
import { createOpenAITextResponse } from "@/lib/ai/openai-client";
import { prisma } from "@/lib/prisma";

const mocks = vi.hoisted(() => ({
  aiTaskCreate: vi.fn(),
  aiTaskUpdate: vi.fn(),
  createOpenAITextResponse: vi.fn(),
  getConfiguredOpenAIModel: vi.fn(),
  pruneProjectAiTasks: vi.fn(),
  recordAiTaskUsage: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    aiTask: {
      create: mocks.aiTaskCreate,
      update: mocks.aiTaskUpdate,
    },
  },
}));

vi.mock("@/lib/ai/openai-client", () => ({
  createOpenAITextResponse: mocks.createOpenAITextResponse,
  getConfiguredOpenAIModel: mocks.getConfiguredOpenAIModel,
}));

vi.mock("./task-retention", () => ({
  pruneProjectAiTasks: mocks.pruneProjectAiTasks,
}));

vi.mock("./usage", () => ({
  recordAiTaskUsage: mocks.recordAiTaskUsage,
}));

describe("AI task logger", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getConfiguredOpenAIModel.mockReturnValue("deepseek-v4-pro");
    mocks.recordAiTaskUsage.mockResolvedValue(undefined);
    mocks.aiTaskCreate.mockResolvedValue({
      id: "task_1",
      projectId: "project_1",
      taskType: "chapter_beat_generation",
      model: "deepseek-v4-pro",
      status: "pending",
    });
    mocks.aiTaskUpdate.mockImplementation(async ({ where, data }) => ({
      id: where.id,
      projectId: "project_1",
      taskType: "chapter_beat_generation",
      model: "deepseek-v4-pro",
      ...data,
    }));
    mocks.pruneProjectAiTasks.mockResolvedValue(0);
  });

  it("prunes old project AI tasks after creating a task", async () => {
    await expect(
      createAiTask({
        projectId: "project_1",
        taskType: "cover_image_generation",
        inputContextSummary: "作品封面生成",
      }),
    ).resolves.toMatchObject({
      id: "task_1",
      status: "pending",
    });

    expect(mocks.pruneProjectAiTasks).toHaveBeenCalledWith("project_1");
  });

  it("starts a background text task and returns once the task is running", async () => {
    let resolveResponse:
      | ((value: {
          outputText: string;
          responseJson: Record<string, unknown>;
          usage: {
            inputTokens?: number;
            outputTokens?: number;
            totalTokens?: number;
          };
        }) => void)
      | undefined;
    const responsePromise = new Promise<{
      outputText: string;
      responseJson: Record<string, unknown>;
      usage: {
        inputTokens?: number;
        outputTokens?: number;
        totalTokens?: number;
      };
    }>((resolve) => {
      resolveResponse = resolve;
    });
    mocks.createOpenAITextResponse.mockReturnValue(responsePromise);

    const task = await startLoggedOpenAITextTask(
      {
        projectId: "project_1",
        chapterId: "chapter_1",
        taskType: "chapter_beat_generation",
        inputContextSummary: "第 1 章节拍",
      },
      {
        input: "生成章节节拍",
      },
    );

    expect(task.status).toBe("running");
    expect(prisma.aiTask.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: "pending",
          taskType: "chapter_beat_generation",
        }),
      }),
    );
    expect(prisma.aiTask.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          id: "task_1",
        },
        data: expect.objectContaining({
          status: "running",
        }),
      }),
    );
    expect(createOpenAITextResponse).toHaveBeenCalledWith({
      input: "生成章节节拍",
      model: "deepseek-v4-pro",
    });

    resolveResponse?.({
      outputText: "节拍结果",
      responseJson: {
        ok: true,
      },
      usage: {
        inputTokens: 1,
        outputTokens: 2,
        totalTokens: 3,
      },
    });

    await vi.waitFor(() => {
      expect(prisma.aiTask.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            id: "task_1",
          },
          data: expect.objectContaining({
            status: "completed",
            outputText: "节拍结果",
            tokenTotal: 3,
          }),
        }),
      );
    });
    expect(mocks.recordAiTaskUsage).toHaveBeenCalledWith(
      expect.objectContaining({
        projectId: "project_1",
        model: "deepseek-v4-pro",
        tokenTotal: 3,
      }),
    );
  });

  it("records background task failures without throwing to the caller", async () => {
    mocks.createOpenAITextResponse.mockRejectedValue(new Error("model timeout"));

    await expect(
      startLoggedOpenAITextTask(
        {
          projectId: "project_1",
          chapterId: "chapter_1",
          taskType: "chapter_draft_generation",
          inputContextSummary: "第 1 章草稿",
        },
        {
          input: "生成章节草稿",
        },
      ),
    ).resolves.toMatchObject({
      status: "running",
    });

    await vi.waitFor(() => {
      expect(prisma.aiTask.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            id: "task_1",
          },
          data: expect.objectContaining({
            status: "failed",
            errorMessage: "model timeout",
          }),
        }),
      );
    });
  });

  it("runs an optional completion callback after the background response is saved", async () => {
    const onCompleted = vi.fn();
    mocks.createOpenAITextResponse.mockResolvedValue({
      outputText: "结构化结果",
      responseJson: {
        ok: true,
      },
      usage: {
        inputTokens: 4,
        outputTokens: 5,
        totalTokens: 9,
      },
    });

    await startLoggedOpenAITextTask(
      {
        projectId: "project_1",
        chapterId: "chapter_1",
        taskType: "pending_update_extraction",
        inputContextSummary: "第 1 章待审核更新",
      },
      {
        input: "提取更新",
      },
      {
        onCompleted,
      },
    );

    await vi.waitFor(() => {
      expect(onCompleted).toHaveBeenCalledWith(
        expect.objectContaining({
          id: "task_1",
          status: "completed",
          outputText: "结构化结果",
        }),
      );
    });
  });

  it("does not fail a completed task when usage aggregation fails", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    mocks.recordAiTaskUsage.mockRejectedValue(new Error("usage table missing"));
    mocks.createOpenAITextResponse.mockResolvedValue({
      outputText: "节拍结果",
      responseJson: {
        ok: true,
      },
      usage: {
        inputTokens: 10,
        outputTokens: 20,
        totalTokens: 30,
      },
    });

    try {
      await expect(
        startLoggedOpenAITextTask(
          {
            projectId: "project_1",
            chapterId: "chapter_1",
            taskType: "chapter_beat_generation",
            inputContextSummary: "第 1 章节拍",
          },
          {
            input: "生成章节节拍",
          },
        ),
      ).resolves.toMatchObject({
        status: "running",
      });

      await vi.waitFor(() => {
        expect(prisma.aiTask.update).toHaveBeenCalledWith(
          expect.objectContaining({
            where: {
              id: "task_1",
            },
            data: expect.objectContaining({
              status: "completed",
              tokenTotal: 30,
            }),
          }),
        );
      });
      expect(mocks.recordAiTaskUsage).toHaveBeenCalled();
      expect(consoleSpy).toHaveBeenCalledWith(
        "Failed to record AI task usage:",
        expect.any(Error),
      );
      expect(prisma.aiTask.update).not.toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: "failed",
          }),
        }),
      );
    } finally {
      consoleSpy.mockRestore();
    }
  });
});
