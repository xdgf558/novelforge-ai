export const endingPlanningTaskType = "ending_planning_generation";

export const usableEndingPlanAdoptionStates = [
  "not_reviewed",
  "adopted",
] as const;
export const DEFAULT_ENDING_PLAN_REMAINING_CHAPTERS = 10;
export const MIN_ENDING_PLAN_WINDOW_CHAPTERS = 4;
export const MAX_ENDING_PLAN_WINDOW_CHAPTERS = 24;

export type UsableEndingPlanAdoptionState =
  (typeof usableEndingPlanAdoptionStates)[number];

export type EndingPlanPlanningWindow = {
  generatedAtChapterNumber: number;
  validThroughChapterNumber: number;
  estimatedRemainingChapterCount: number;
};

export type EndingPlanReference = {
  taskId: string;
  adoptionState: UsableEndingPlanAdoptionState;
  completedAt: Date | string | null;
  outputText: string;
  generatedAtChapterNumber: number | null;
  validThroughChapterNumber: number | null;
};

export type EndingPlanWindowApplicability =
  | "applicable"
  | "historical_target"
  | "expired";

type EndingPlanTaskCandidate = {
  id: string;
  taskType?: string | null;
  status: string;
  adoptionState?: string | null;
  outputText?: string | null;
};

type DatedTaskCandidate = {
  id: string;
  createdAt: Date;
};

export function isUsableEndingPlanTask(
  task: EndingPlanTaskCandidate,
): task is EndingPlanTaskCandidate & {
  adoptionState: UsableEndingPlanAdoptionState;
  outputText: string;
} {
  return (
    task.taskType === endingPlanningTaskType &&
    task.status === "completed" &&
    (usableEndingPlanAdoptionStates as readonly string[]).includes(
      task.adoptionState ?? "",
    ) &&
    Boolean(task.outputText?.trim())
  );
}

export function compareAiTasksNewestFirst(
  taskA: DatedTaskCandidate,
  taskB: DatedTaskCandidate,
) {
  const createdAtDiff =
    taskB.createdAt.getTime() - taskA.createdAt.getTime();

  return createdAtDiff !== 0
    ? createdAtDiff
    : taskB.id.localeCompare(taskA.id);
}

export function resolveEndingPlanWindowApplicability(
  reference: Pick<
    EndingPlanReference,
    "generatedAtChapterNumber" | "validThroughChapterNumber"
  >,
  targetChapterNumber: number,
): EndingPlanWindowApplicability {
  if (
    reference.generatedAtChapterNumber != null &&
    targetChapterNumber <= reference.generatedAtChapterNumber
  ) {
    return "historical_target";
  }

  if (
    reference.validThroughChapterNumber != null &&
    targetChapterNumber > reference.validThroughChapterNumber
  ) {
    return "expired";
  }

  return "applicable";
}

export function calculateEndingPlanPlanningWindow(input: {
  latestChapterNumber: number;
  currentWords: number;
  targetWords?: number | null;
  chapterCount: number;
  finalChapterCount: number;
  chapterWordMin?: number | null;
  chapterWordMax?: number | null;
}): EndingPlanPlanningWindow {
  const generatedAtChapterNumber = Math.max(
    0,
    Math.floor(input.latestChapterNumber),
  );
  const observedChapterCount =
    input.chapterCount > 0
      ? input.chapterCount
      : input.finalChapterCount;
  const observedChapterWords =
    observedChapterCount > 0 && input.currentWords > 0
      ? input.currentWords / observedChapterCount
      : null;
  const configuredChapterWords = averagePositiveNumbers([
    input.chapterWordMin,
    input.chapterWordMax,
  ]);
  const estimatedChapterWords =
    observedChapterWords ?? configuredChapterWords ?? 5000;
  const estimatedFromWords =
    input.targetWords == null
      ? DEFAULT_ENDING_PLAN_REMAINING_CHAPTERS
      : input.targetWords <= input.currentWords
        ? 0
        : Math.ceil(
            (input.targetWords - input.currentWords) /
              Math.max(1, estimatedChapterWords),
          );
  const buffer =
    estimatedFromWords > 0
      ? Math.max(2, Math.ceil(estimatedFromWords * 0.25))
      : 0;
  const estimatedRemainingChapterCount = clamp(
    estimatedFromWords + buffer,
    MIN_ENDING_PLAN_WINDOW_CHAPTERS,
    MAX_ENDING_PLAN_WINDOW_CHAPTERS,
  );

  return {
    generatedAtChapterNumber,
    validThroughChapterNumber:
      generatedAtChapterNumber + estimatedRemainingChapterCount,
    estimatedRemainingChapterCount,
  };
}

export function readEndingPlanPlanningWindow(
  inputJson?: string | null,
): EndingPlanPlanningWindow | null {
  const payload = parseJsonObject(inputJson);

  if (!payload) {
    return null;
  }

  const savedWindow = asRecord(payload.planningWindow);
  const savedGeneratedAt = nonNegativeInteger(
    savedWindow?.generatedAtChapterNumber,
  );
  const savedValidThrough = nonNegativeInteger(
    savedWindow?.validThroughChapterNumber,
  );
  const savedRemaining = positiveInteger(
    savedWindow?.estimatedRemainingChapterCount,
  );

  if (
    savedGeneratedAt != null &&
    savedValidThrough != null &&
    savedValidThrough >= savedGeneratedAt &&
    savedRemaining != null
  ) {
    return {
      generatedAtChapterNumber: savedGeneratedAt,
      validThroughChapterNumber: savedValidThrough,
      estimatedRemainingChapterCount: savedRemaining,
    };
  }

  const readiness = asRecord(payload.readiness);
  const project = asRecord(payload.project);
  const chapterCount = nonNegativeInteger(readiness?.chapterCount) ?? 0;
  const latestChapterNumber =
    nonNegativeInteger(readiness?.latestChapterNumber) ?? chapterCount;

  if (!readiness) {
    return null;
  }

  return calculateEndingPlanPlanningWindow({
    latestChapterNumber,
    currentWords: nonNegativeNumber(readiness.currentWords) ?? 0,
    targetWords: positiveNumber(readiness.targetWords),
    chapterCount,
    finalChapterCount:
      nonNegativeInteger(readiness.finalChapterCount) ?? chapterCount,
    chapterWordMin: positiveNumber(project?.chapterWordMin),
    chapterWordMax: positiveNumber(project?.chapterWordMax),
  });
}

function parseJsonObject(value?: string | null) {
  if (!value) {
    return null;
  }

  try {
    return asRecord(JSON.parse(value));
  } catch {
    return null;
  }
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function nonNegativeInteger(value: unknown) {
  return typeof value === "number" &&
    Number.isInteger(value) &&
    value >= 0
    ? value
    : null;
}

function positiveInteger(value: unknown) {
  return typeof value === "number" &&
    Number.isInteger(value) &&
    value > 0
    ? value
    : null;
}

function nonNegativeNumber(value: unknown) {
  return typeof value === "number" &&
    Number.isFinite(value) &&
    value >= 0
    ? value
    : null;
}

function positiveNumber(value: unknown) {
  return typeof value === "number" &&
    Number.isFinite(value) &&
    value > 0
    ? value
    : null;
}

function averagePositiveNumbers(values: readonly unknown[]) {
  const numbers = values
    .map(positiveNumber)
    .filter((value): value is number => value != null);

  return numbers.length > 0
    ? numbers.reduce((sum, value) => sum + value, 0) / numbers.length
    : null;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}
