import {
  createConfiguredGoogleTtsProvider,
  googleGeminiTtsModelOptions,
} from "./google-gemini-tts";
import {
  createConfiguredGlmTtsProvider,
  glmTtsModelOptions,
} from "./glm-tts";
import { readTtsGenerationSecrets } from "@/lib/ai/local-config";
import { createConfiguredTtsProvider as createConfiguredPpqTtsProvider } from "./ppq-tts";
import type { TtsProvider, TtsProviderId } from "./types";

export function getConfiguredTtsProvider(
  options: Parameters<typeof createConfiguredGoogleTtsProvider>[0] = {},
): TtsProvider {
  const settings =
    options.settings ?? readTtsGenerationSecrets(options.env ?? process.env);

  if (settings.providerId === "ppq_tts") {
    return createConfiguredPpqTtsProvider({
      ...options,
      settings,
    });
  }

  if (settings.providerId === "glm_tts") {
    return createConfiguredGlmTtsProvider({
      ...options,
      settings,
    });
  }

  return createConfiguredGoogleTtsProvider({
    ...options,
    settings,
  });
}

export function ttsProviderLabel(providerId: string) {
  if (providerId === "ppq_tts") {
    return "PPQ TTS";
  }

  if (providerId === "google_tts") {
    return "Google Gemini TTS";
  }

  if (providerId === "glm_tts") {
    return "GLM-TTS";
  }

  if (providerId === "aliyun_bailian_tts") {
    return "阿里云百炼 TTS";
  }

  return providerId;
}

export const ttsProviderOptions: Array<{
  label: string;
  value: TtsProviderId;
  disabled?: boolean;
}> = [
  {
    label: "Google Gemini TTS",
    value: "google_tts",
  },
  {
    label: "GLM-TTS（智谱）",
    value: "glm_tts",
  },
];

export const ttsModelOptions = [
  ...googleGeminiTtsModelOptions,
  ...glmTtsModelOptions,
];

export function ttsModelOptionsForProvider(providerId: string) {
  if (providerId === "glm_tts") {
    return glmTtsModelOptions;
  }

  return googleGeminiTtsModelOptions;
}
