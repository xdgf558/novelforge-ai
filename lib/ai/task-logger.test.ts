import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  createAiTask,
  longPlanningAiRequestTimeoutMs,
  longWritingAiRequestTimeoutMs,
  resolveAiTaskExecutionEnv,
  resolveAiTaskRequestTimeoutMs,
  startLoggedOpenAITextTask,
} from "./task-logger";
import { createOpenAITextResponse } from "@/lib/ai/openai-client";
import { prisma } from "@/lib/prisma";

const mocks = vi.hoisted(() => ({
  aiTaskCreate: vi.fn(),
  aiTaskUpdate: vi.fn(),
  createOpenAITextResponse: vi.fn(),
  getAiRuntimeEnv: vi.fn(),
  getAiRuntimeEnvForTaskType: vi.fn(),
  getConfiguredOpenAIModelForTaskType: vi.fn(),
  pruneProjectAiTasks: vi.fn(),
  readAiTaskModelRouteSecrets: vi.fn(),
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
  getConfiguredOpenAIModelForTaskType: mocks.getConfiguredOpenAIModelForTaskType,
}));

vi.mock("@/lib/ai/local-config", () => ({
  getAiRuntimeEnv: mocks.getAiRuntimeEnv,
  getAiRuntimeEnvForTaskType: mocks.getAiRuntimeEnvForTaskType,
  readAiTaskModelRouteSecrets: mocks.readAiTaskModelRouteSecrets,
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
    mocks.getConfiguredOpenAIModelForTaskType.mockReturnValue("deepseek-v4-pro");
    mocks.getAiRuntimeEnv.mockReturnValue({
      OPENAI_API_KEY: "deepseek-key",
      OPENAI_MODEL: "deepseek-v4-pro",
      OPENAI_BASE_URL: "https://api.deepseek.com",
    });
    mocks.getAiRuntimeEnvForTaskType.mockReturnValue({
      OPENAI_API_KEY: "deepseek-key",
      OPENAI_MODEL: "deepseek-v4-pro",
      OPENAI_BASE_URL: "https://api.deepseek.com",
    });
    mocks.readAiTaskModelRouteSecrets.mockReturnValue({
      taskType: "chapter_draft_generation",
      apiKey: "",
      model: "kimi-k2.6",
      baseUrl: "https://api.moonshot.cn/v1",
      isActive: false,
    });
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
    expect(createOpenAITextResponse).toHaveBeenCalledWith(
      {
        input: "生成章节节拍",
        model: "deepseek-v4-pro",
      },
      {
        env: {
          OPENAI_API_KEY: "deepseek-key",
          OPENAI_MODEL: "deepseek-v4-pro",
          OPENAI_BASE_URL: "https://api.deepseek.com",
        },
        timeoutMs: longPlanningAiRequestTimeoutMs,
      },
    );

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

  it("records and runs chapter draft tasks with the task-level Kimi route", async () => {
    mocks.getConfiguredOpenAIModelForTaskType.mockImplementation((taskType) =>
      taskType === "chapter_draft_generation"
        ? "kimi-k2.6"
        : "deepseek-v4-pro",
    );
    mocks.getAiRuntimeEnvForTaskType.mockImplementation((taskType) =>
      taskType === "chapter_draft_generation"
        ? {
            OPENAI_API_KEY: "kimi-key",
            OPENAI_MODEL: "kimi-k2.6",
            OPENAI_BASE_URL: "https://api.moonshot.cn/v1",
          }
        : {
            OPENAI_API_KEY: "deepseek-key",
            OPENAI_MODEL: "deepseek-v4-pro",
            OPENAI_BASE_URL: "https://api.deepseek.com",
          },
    );
    mocks.readAiTaskModelRouteSecrets.mockReturnValue({
      taskType: "chapter_draft_generation",
      apiKey: "kimi-key",
      model: "kimi-k2.6",
      baseUrl: "https://api.moonshot.cn/v1",
      isActive: true,
    });
    mocks.aiTaskCreate.mockResolvedValueOnce({
      id: "task_kimi",
      projectId: "project_1",
      taskType: "chapter_draft_generation",
      model: "kimi-k2.6",
      status: "pending",
    });
    mocks.aiTaskUpdate.mockImplementationOnce(async ({ where, data }) => ({
      id: where.id,
      projectId: "project_1",
      taskType: "chapter_draft_generation",
      model: "kimi-k2.6",
      ...data,
    }));
    mocks.createOpenAITextResponse.mockResolvedValue({
      outputText: "Kimi 正文草稿",
      responseJson: {
        ok: true,
      },
      usage: {
        inputTokens: 10,
        outputTokens: 20,
        totalTokens: 30,
      },
    });

    await startLoggedOpenAITextTask(
      {
        projectId: "project_1",
        chapterId: "chapter_1",
        taskType: "chapter_draft_generation",
        inputContextSummary: "第 1 章草稿",
      },
      {
        input: "生成章节草稿",
      },
    );

    expect(prisma.aiTask.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          model: "kimi-k2.6",
          taskType: "chapter_draft_generation",
        }),
      }),
    );
    const createCall = mocks.aiTaskCreate.mock.calls.at(-1)?.[0];
    const inputJson = JSON.parse(createCall.data.inputJson);
    expect(inputJson.aiExecutionRoute).toMatchObject({
      kind: "task_model_route",
      routeSource: "task_route",
      taskType: "chapter_draft_generation",
      model: "kimi-k2.6",
      baseUrl: "https://api.moonshot.cn/v1",
    });
    expect(createOpenAITextResponse).toHaveBeenCalledWith(
      {
        input: "生成章节草稿",
        model: "kimi-k2.6",
      },
      {
        env: {
          OPENAI_API_KEY: "kimi-key",
          OPENAI_MODEL: "kimi-k2.6",
          OPENAI_BASE_URL: "https://api.moonshot.cn/v1",
        },
        timeoutMs: longWritingAiRequestTimeoutMs,
      },
    );
  });

  it("uses longer model request timeouts for long-form writing and planning tasks", () => {
    expect(resolveAiTaskRequestTimeoutMs("chapter_draft_generation")).toBe(
      longWritingAiRequestTimeoutMs,
    );
    expect(resolveAiTaskRequestTimeoutMs("chapter_polish_generation")).toBe(
      longWritingAiRequestTimeoutMs,
    );
    expect(resolveAiTaskRequestTimeoutMs("chapter_beat_generation")).toBe(
      longPlanningAiRequestTimeoutMs,
    );
    expect(resolveAiTaskRequestTimeoutMs("outline_generation")).toBe(
      longPlanningAiRequestTimeoutMs,
    );
    expect(resolveAiTaskRequestTimeoutMs("ending_planning_generation")).toBe(
      longPlanningAiRequestTimeoutMs,
    );
    expect(
      resolveAiTaskRequestTimeoutMs("short_story_blueprint_generation"),
    ).toBe(longPlanningAiRequestTimeoutMs);
    expect(resolveAiTaskRequestTimeoutMs("pending_update_extraction")).toBe(
      longPlanningAiRequestTimeoutMs,
    );
    expect(resolveAiTaskRequestTimeoutMs("chapter_summary_extraction")).toBe(
      longPlanningAiRequestTimeoutMs,
    );
    expect(resolveAiTaskRequestTimeoutMs("continuity_check")).toBe(
      longPlanningAiRequestTimeoutMs,
    );
    expect(resolveAiTaskRequestTimeoutMs("foreshadow_recovery_audit")).toBe(
      longPlanningAiRequestTimeoutMs,
    );
  });

  it("uses the task route snapshot instead of falling back to the current default env", () => {
    mocks.getAiRuntimeEnv.mockReturnValue({
      OPENAI_API_KEY: "deepseek-key",
      OPENAI_MODEL: "deepseek-v4-pro",
      OPENAI_BASE_URL: "https://api.deepseek.com",
    });
    mocks.getAiRuntimeEnvForTaskType.mockReturnValue({
      OPENAI_API_KEY: "deepseek-key",
      OPENAI_MODEL: "deepseek-v4-pro",
      OPENAI_BASE_URL: "https://api.deepseek.com",
    });
    mocks.readAiTaskModelRouteSecrets.mockReturnValue({
      taskType: "chapter_polish_generation",
      apiKey: "new-kimi-key",
      model: "kimi-k2.6-renamed",
      baseUrl: "https://changed.example/v1",
      isActive: true,
    });

    expect(
      resolveAiTaskExecutionEnv({
        taskType: "chapter_polish_generation",
        model: "kimi-k2.6",
        inputJson: JSON.stringify({
          chapter: {
            sourceTextLength: 100,
          },
          aiExecutionRoute: {
            kind: "task_model_route",
            routeSource: "task_route",
            taskType: "chapter_polish_generation",
            model: "kimi-k2.6",
            baseUrl: "https://api.moonshot.cn/v1",
          },
        }),
      }),
    ).toMatchObject({
      OPENAI_API_KEY: "new-kimi-key",
      OPENAI_MODEL: "kimi-k2.6",
      OPENAI_BASE_URL: "https://api.moonshot.cn/v1",
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

  it("runs an optional failure callback after the background failure is saved", async () => {
    const error = new Error("provider timeout");
    const onFailed = vi.fn();
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    mocks.createOpenAITextResponse.mockRejectedValue(error);

    try {
      await startLoggedOpenAITextTask(
        {
          projectId: "project_1",
          taskType: "foreshadow_recovery_audit",
          inputContextSummary: "历史伏笔回收审计",
        },
        {
          input: "审计历史伏笔",
        },
        {
          onFailed,
        },
      );

      await vi.waitFor(() => {
        expect(onFailed).toHaveBeenCalledWith(
          expect.objectContaining({
            id: "task_1",
            status: "failed",
            errorMessage: "provider timeout",
          }),
          error,
        );
      });
    } finally {
      consoleSpy.mockRestore();
    }
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
