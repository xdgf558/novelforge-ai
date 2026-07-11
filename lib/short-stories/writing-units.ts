export const shortStoryUnitCountMin = 3;
export const shortStoryUnitCountMax = 12;
export const shortStoryDefaultUnitWordTarget = 5000;

type ShortStoryUnitRecommendationInput = {
  totalWordTarget?: number | null;
  unitWordMin?: number | null;
  unitWordMax?: number | null;
};

export type ShortStoryUnitRecommendation = {
  unitCount: number;
  unitWordTarget: number;
  totalWordTarget: number | null;
  hasConfiguredTotal: boolean;
};

export function recommendShortStoryWritingUnits({
  totalWordTarget,
  unitWordMin,
  unitWordMax,
}: ShortStoryUnitRecommendationInput): ShortStoryUnitRecommendation {
  const total = positiveInteger(totalWordTarget);
  const preferredUnitWords = preferredUnitWordTarget(
    unitWordMin,
    unitWordMax,
  );
  const unitCount = total
    ? clamp(
        Math.round(total / preferredUnitWords),
        shortStoryUnitCountMin,
        shortStoryUnitCountMax,
      )
    : 5;
  const unitWordTarget = total
    ? Math.max(1000, Math.round(total / unitCount / 100) * 100)
    : preferredUnitWords;

  return {
    unitCount,
    unitWordTarget,
    totalWordTarget: total,
    hasConfiguredTotal: total !== null,
  };
}

export function shortStoryUnitProgress({
  completedUnits,
  currentWords,
  recommendation,
  totalUnits,
}: {
  completedUnits: number;
  currentWords: number;
  recommendation: ShortStoryUnitRecommendation;
  totalUnits: number;
}) {
  return {
    completedUnits: Math.max(0, completedUnits),
    currentWords: Math.max(0, currentWords),
    recommendedUnitCount: recommendation.unitCount,
    remainingRecommendedUnits: Math.max(
      0,
      recommendation.unitCount - Math.max(0, totalUnits),
    ),
    totalUnits: Math.max(0, totalUnits),
    targetWords: recommendation.totalWordTarget,
  };
}

function preferredUnitWordTarget(
  unitWordMin?: number | null,
  unitWordMax?: number | null,
) {
  const min = positiveInteger(unitWordMin);
  const max = positiveInteger(unitWordMax);

  if (min && max) {
    return Math.max(
      1000,
      Math.round((Math.min(min, max) + Math.max(min, max)) / 2 / 100) * 100,
    );
  }

  return Math.max(1000, min ?? max ?? shortStoryDefaultUnitWordTarget);
}

function positiveInteger(value?: number | null) {
  return typeof value === "number" && Number.isFinite(value) && value > 0
    ? Math.round(value)
    : null;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}
