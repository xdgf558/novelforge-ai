import { createConfiguredTtsProvider } from "./ppq-tts";
import type { TtsProvider, TtsProviderId } from "./types";

export function getConfiguredTtsProvider(options: Parameters<typeof createConfiguredTtsProvider>[0] = {}): TtsProvider {
  return createConfiguredTtsProvider(options);
}

export function ttsProviderLabel(providerId: string) {
  if (providerId === "ppq_tts") {
    return "PPQ TTS";
  }

  if (providerId === "google_tts") {
    return "Google TTS";
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
    label: "PPQ TTS",
    value: "ppq_tts",
  },
  {
    disabled: true,
    label: "Google TTS（后续接入）",
    value: "google_tts",
  },
  {
    disabled: true,
    label: "阿里云百炼 TTS（后续接入）",
    value: "aliyun_bailian_tts",
  },
];

export const ppqTtsModelOptions = [
  {
    label: "ElevenLabs Multilingual v2",
    value: "eleven_multilingual_v2",
  },
  {
    label: "ElevenLabs Flash v2.5",
    value: "eleven_flash_v2_5",
  },
  {
    label: "DeepGram Aura 2",
    value: "deepgram_aura_2",
  },
];
