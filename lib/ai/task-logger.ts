import { prisma } from "@/lib/prisma";
import {
  createOpenAITextResponse,
  getConfiguredOpenAIModel,
  type OpenAITextRequest,
} from "@/lib/ai/openai-client";

type CreateAiTaskInput = {
  projectId: string;
  taskType: string;
  inputContextSummary: string;
  model?: string;
  promptTemplateId?: string | null;
  chapterId?: string | null;
  inputJson?: unknown;
};

type CompleteAiTaskInput = {
  outputText?: string;
  outputJson?: unknown;
  tokenInput?: number;
  tokenOutput?: number;
  tokenTotal?: number;
};

export function stringifyAiTaskPayload(value: unknown) {
  if (value == null) {
    return undefined;
  }

  return JSON.stringify(value, null, 2);
}

export async function createAiTask(input: CreateAiTaskInput) {
  return prisma.aiTask.create({
    data: {
      projectId: input.projectId,
      promptTemplateId: input.promptTemplateId,
      chapterId: input.chapterId,
      taskType: input.taskType,
      model: input.model ?? getConfiguredOpenAIModel(),
      status: "pending",
      adoptionState: "not_reviewed",
      inputContextSummary: input.inputContextSummary,
      inputJson: stringifyAiTaskPayload(input.inputJson),
    },
  });
}

export async function markAiTaskRunning(taskId: string) {
  return prisma.aiTask.update({
    where: {
      id: taskId,
    },
    data: {
      status: "running",
      startedAt: new Date(),
    },
  });
}

export async function markAiTaskCompleted(
  taskId: string,
  input: CompleteAiTaskInput,
) {
  return prisma.aiTask.update({
    where: {
      id: taskId,
    },
    data: {
      status: "completed",
      outputText: input.outputText,
      outputJson: stringifyAiTaskPayload(input.outputJson),
      tokenInput: input.tokenInput,
      tokenOutput: input.tokenOutput,
      tokenTotal: input.tokenTotal,
      completedAt: new Date(),
    },
  });
}

export async function markAiTaskFailed(taskId: string, error: unknown) {
  return prisma.aiTask.update({
    where: {
      id: taskId,
    },
    data: {
      status: "failed",
      errorMessage: error instanceof Error ? error.message : String(error),
      completedAt: new Date(),
    },
  });
}

export async function runLoggedOpenAITextTask(
  taskInput: CreateAiTaskInput,
  request: OpenAITextRequest,
  options: {
    rethrow?: boolean;
  } = {},
) {
  const task = await createAiTask(taskInput);
  await markAiTaskRunning(task.id);

  try {
    const result = await createOpenAITextResponse({
      ...request,
      model: task.model,
    });

    return markAiTaskCompleted(task.id, {
      outputText: result.outputText,
      outputJson: result.responseJson,
      tokenInput: result.usage.inputTokens,
      tokenOutput: result.usage.outputTokens,
      tokenTotal: result.usage.totalTokens,
    });
  } catch (error) {
    const failedTask = await markAiTaskFailed(task.id, error);

    if (options.rethrow === false) {
      return failedTask;
    }

    throw error;
  }
}
