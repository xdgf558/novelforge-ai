import { prisma } from "@/lib/prisma";
import {
  createOpenAITextResponse,
  getConfiguredOpenAIModelForTaskType,
  type OpenAITextRequest,
} from "@/lib/ai/openai-client";
import {
  getAiRuntimeEnv,
  getAiRuntimeEnvForTaskType,
  readAiTaskModelRouteSecrets,
  type AiRuntimeEnv,
  type AiTaskModelRouteTaskType,
} from "@/lib/ai/local-config";
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
type FailedAiTask = Awaited<ReturnType<typeof markAiTaskFailed>>;

type RunLoggedOpenAITextTaskOptions = {
  rethrow?: boolean;
  onCompleted?: (task: CompletedAiTask) => Promise<void> | void;
  onFailed?: (task: FailedAiTask, error: unknown) => Promise<void> | void;
};

type StartLoggedOpenAITextTaskOptions = Pick<
  RunLoggedOpenAITextTaskOptions,
  "onCompleted" | "onFailed"
>;

type AiTaskExecutionRouteSnapshot = {
  kind: "task_model_route";
  routeSource: "task_route";
  taskType: AiTaskModelRouteTaskType;
  model: string;
  baseUrl: string;
};

export const longWritingAiRequestTimeoutMs = 10 * 60 * 1000;
export const longPlanningAiRequestTimeoutMs = 5 * 60 * 1000;

export function stringifyAiTaskPayload(value: unknown) {
  if (value == null) {
    return undefined;
  }

  return JSON.stringify(value, null, 2);
}

export async function createAiTask(input: CreateAiTaskInput) {
  const model = input.model ?? getConfiguredOpenAIModelForTaskType(input.taskType);
  const inputJson = withAiTaskExecutionRouteSnapshot(
    input.inputJson,
    buildAiTaskExecutionRouteSnapshot(input.taskType, model),
  );
  const task = await prisma.aiTask.create({
    data: {
      projectId: input.projectId,
      promptTemplateId: input.promptTemplateId,
      chapterId: input.chapterId,
      taskType: input.taskType,
      model,
      status: "pending",
      adoptionState: "not_reviewed",
      inputContextSummary: input.inputContextSummary,
      inputJson: stringifyAiTaskPayload(inputJson),
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
    onFailed: options.onFailed,
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
    const timeoutMs = resolveAiTaskRequestTimeoutMs(task.taskType);
    const result = await createOpenAITextResponse({
      ...request,
      model: task.model,
    }, {
      env: resolveAiTaskExecutionEnv(task),
      ...(timeoutMs ? { timeoutMs } : {}),
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

    try {
      await options.onFailed?.(failedTask, error);
    } catch (callbackError) {
      console.error("AI task failure callback failed:", callbackError);
    }

    if (options.rethrow === false) {
      return failedTask;
    }

    throw error;
  }
}

export function resolveAiTaskExecutionEnv(task: {
  taskType: string;
  model: string;
  inputJson?: string | null;
}): AiRuntimeEnv {
  const snapshot = parseAiTaskExecutionRouteSnapshot(task.inputJson);

  if (snapshot && snapshot.taskType === task.taskType) {
    const route = readAiTaskModelRouteSecrets(snapshot.taskType);

    return {
      ...getAiRuntimeEnv(),
      OPENAI_API_KEY: route.apiKey,
      OPENAI_MODEL: snapshot.model,
      OPENAI_BASE_URL: snapshot.baseUrl,
    };
  }

  return getAiRuntimeEnvForTaskType(task.taskType);
}

export function resolveAiTaskRequestTimeoutMs(taskType: string) {
  if (
    taskType === "chapter_draft_generation" ||
    taskType === "chapter_polish_generation" ||
    taskType === "short_story_whole_review"
  ) {
    return longWritingAiRequestTimeoutMs;
  }

  if (
    taskType === "chapter_beat_generation" ||
    taskType === "chapter_summary_extraction" ||
    taskType === "continuity_check" ||
    taskType === "foreshadow_recovery_audit" ||
    taskType === "outline_generation" ||
    taskType === "ending_planning_generation" ||
    taskType === "short_story_blueprint_generation" ||
    taskType === "short_story_unit_plan_generation" ||
    taskType === "pending_update_extraction"
  ) {
    return longPlanningAiRequestTimeoutMs;
  }

  return undefined;
}

function buildAiTaskExecutionRouteSnapshot(
  taskType: string,
  model: string,
): AiTaskExecutionRouteSnapshot | null {
  if (!isAiTaskModelRouteTaskType(taskType)) {
    return null;
  }

  const route = readAiTaskModelRouteSecrets(taskType);

  if (!route.isActive) {
    return null;
  }

  return {
    kind: "task_model_route",
    routeSource: "task_route",
    taskType,
    model,
    baseUrl: route.baseUrl,
  };
}

function withAiTaskExecutionRouteSnapshot(
  inputJson: unknown,
  snapshot: AiTaskExecutionRouteSnapshot | null,
) {
  if (!snapshot) {
    return inputJson;
  }

  if (isRecord(inputJson)) {
    return {
      ...inputJson,
      aiExecutionRoute: snapshot,
    };
  }

  return {
    aiExecutionRoute: snapshot,
    payload: inputJson ?? null,
  };
}

function parseAiTaskExecutionRouteSnapshot(
  inputJson?: string | null,
): AiTaskExecutionRouteSnapshot | null {
  if (!inputJson?.trim()) {
    return null;
  }

  try {
    const parsed = JSON.parse(inputJson);

    if (!isRecord(parsed) || !isRecord(parsed.aiExecutionRoute)) {
      return null;
    }

    const route = parsed.aiExecutionRoute;

    if (
      route.kind !== "task_model_route" ||
      (route.routeSource != null && route.routeSource !== "task_route") ||
      !isAiTaskModelRouteTaskType(route.taskType) ||
      typeof route.model !== "string" ||
      typeof route.baseUrl !== "string"
    ) {
      return null;
    }

    return {
      kind: "task_model_route",
      routeSource: "task_route",
      taskType: route.taskType,
      model: route.model,
      baseUrl: route.baseUrl,
    };
  } catch {
    return null;
  }
}

function isAiTaskModelRouteTaskType(
  taskType?: unknown,
): taskType is AiTaskModelRouteTaskType {
  return (
    taskType === "chapter_draft_generation" ||
    taskType === "chapter_polish_generation" ||
    taskType === "short_story_whole_review"
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}
