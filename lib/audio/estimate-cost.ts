import { maxAudioSegmentBytes } from "./audio-assets";

const estimatedTtsCharsPerMinute = 280;
const geminiWavSampleRate = 24_000;
const geminiWavChannels = 1;
const geminiWavBytesPerSample = 2;
const geminiWavHeaderBytes = 44;
const geminiAudioBudgetSafetyRatio = 0.8;

export function estimateAudioDurationSeconds(charCount: number) {
  const safeChars = Math.max(0, charCount);
  return Math.max(1, Math.ceil((safeChars / estimatedTtsCharsPerMinute) * 60));
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

  if (normalizedModel.includes("gemini")) {
    return null;
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

  if (normalizedModel.includes("gemini")) {
    return geminiTtsInputLimit();
  }

  return 3000;
}

export function estimateGeminiWavBytesForChars(charCount: number) {
  const durationSeconds = estimateAudioDurationSeconds(charCount);

  return (
    geminiWavHeaderBytes +
    durationSeconds *
      geminiWavSampleRate *
      geminiWavChannels *
      geminiWavBytesPerSample
  );
}

export function geminiTtsInputLimit() {
  const maxSeconds = Math.floor(
    (maxAudioSegmentBytes - geminiWavHeaderBytes) /
      (geminiWavSampleRate * geminiWavChannels * geminiWavBytesPerSample),
  );
  const maxCharsByAudioBudget = Math.floor(
    (maxSeconds / 60) *
      estimatedTtsCharsPerMinute *
      geminiAudioBudgetSafetyRatio,
  );

  return Math.max(1, Math.min(1800, maxCharsByAudioBudget));
}
