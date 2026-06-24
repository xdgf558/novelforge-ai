import { prisma } from "@/lib/prisma";
import {
  createOpenAITextResponse,
  getConfiguredOpenAIModel,
  type OpenAITextRequest,
} from "@/lib/ai/openai-client";
import { recordAiTaskUsage } from "./usage";
import { pruneProjectAiTasks } from "./task-retention";

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

type CompletedAiTask = Awaited<ReturnType<typeof markAiTaskCompleted>>;

type RunLoggedOpenAITextTaskOptions = {
  rethrow?: boolean;
  onCompleted?: (task: CompletedAiTask) => Promise<void> | void;
};

type StartLoggedOpenAITextTaskOptions = Pick<
  RunLoggedOpenAITextTaskOptions,
  "onCompleted"
>;

export function stringifyAiTaskPayload(value: unknown) {
  if (value == null) {
    return undefined;
  }

  return JSON.stringify(value, null, 2);
}

export async function createAiTask(input: CreateAiTaskInput) {
  const task = await prisma.aiTask.create({
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

  await pruneProjectAiTasks(input.projectId);

  return task;
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
  const completedTask = await prisma.aiTask.update({
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

  try {
    await recordAiTaskUsage({
      projectId: completedTask.projectId,
      taskType: completedTask.taskType,
      model: completedTask.model,
      tokenInput: completedTask.tokenInput,
      tokenOutput: completedTask.tokenOutput,
      tokenTotal: completedTask.tokenTotal,
      completedAt: completedTask.completedAt,
    });
  } catch (error) {
    console.error("Failed to record AI task usage:", error);
  }

  return completedTask;
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
  options: RunLoggedOpenAITextTaskOptions = {},
) {
  const task = await createAiTask(taskInput);
  const runningTask = await markAiTaskRunning(task.id);

  return completeRunningOpenAITextTask(runningTask, request, options);
}

export async function startLoggedOpenAITextTask(
  taskInput: CreateAiTaskInput,
  request: OpenAITextRequest,
  options: StartLoggedOpenAITextTaskOptions = {},
) {
  const task = await createAiTask(taskInput);
  const runningTask = await markAiTaskRunning(task.id);

  void completeRunningOpenAITextTask(runningTask, request, {
    onCompleted: options.onCompleted,
    rethrow: false,
  }).catch((error) => {
    console.error("Background AI task failed after logging attempt:", error);
  });

  return runningTask;
}

async function completeRunningOpenAITextTask(
  task: Awaited<ReturnType<typeof markAiTaskRunning>>,
  request: OpenAITextRequest,
  options: RunLoggedOpenAITextTaskOptions,
) {
  try {
    const result = await createOpenAITextResponse({
      ...request,
      model: task.model,
    });

    const completedTask = await markAiTaskCompleted(task.id, {
      outputText: result.outputText,
      outputJson: result.responseJson,
      tokenInput: result.usage.inputTokens,
      tokenOutput: result.usage.outputTokens,
      tokenTotal: result.usage.totalTokens,
    });

    await options.onCompleted?.(completedTask);

    return completedTask;
  } catch (error) {
    const failedTask = await markAiTaskFailed(task.id, error);

    if (options.rethrow === false) {
      return failedTask;
    }

    throw error;
  }
}
