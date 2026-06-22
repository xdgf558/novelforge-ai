export function estimateAudioDurationSeconds(charCount: number) {
  const safeChars = Math.max(0, charCount);
  const charsPerMinute = 280;
  return Math.max(1, Math.ceil((safeChars / charsPerMinute) * 60));
}

export function estimateTtsCostCents({
  charCount,
  modelId,
}: {
  charCount: number;
  modelId: string;
}) {
  const normalizedModel = modelId.toLowerCase();

  if (normalizedModel.includes("eleven")) {
    return Math.ceil((charCount / 1000) * 3);
  }

  if (normalizedModel.includes("deepgram")) {
    return Math.ceil((charCount / 1000) * 1);
  }

  return null;
}

export function formatEstimatedCost(cents?: number | null) {
  if (cents == null) {
    return "以供应商账单为准";
  }

  if (cents <= 0) {
    return "低于 0.01 美元";
  }

  return `约 $${(cents / 100).toFixed(2)}`;
}

export function modelInputLimit(modelId: string) {
  const normalizedModel = modelId.toLowerCase();

  if (normalizedModel.includes("deepgram")) {
    return 1500;
  }

  if (normalizedModel.includes("eleven")) {
    return 4000;
  }

  return 3000;
}
