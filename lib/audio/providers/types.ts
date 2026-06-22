export type TtsProviderId = "ppq_tts" | "google_tts" | "aliyun_bailian_tts";

export type TtsVoice = {
  id: string;
  name: string;
  languageCode?: string | null;
  gender?: string | null;
  provider?: string | null;
  description?: string | null;
  providerMeta?: Record<string, unknown>;
};

export type TtsSynthesisRequest = {
  providerId: TtsProviderId;
  modelId: string;
  voiceId?: string | null;
  languageCode: string;
  inputText: string;
  stylePrompt?: string | null;
  outputFormat: "mp3" | "wav" | "pcm" | "ogg";
};

export type TtsSynthesisResult = {
  audioBytes: Buffer;
  contentType: string;
  providerRequestId?: string | null;
  durationMs?: number | null;
  providerMeta?: Record<string, unknown>;
};

export type TtsCostEstimate = {
  estimatedSeconds: number;
  estimatedCostCents: number | null;
  note: string;
};

export type TtsProviderSettings = {
  apiBaseUrl: string;
  apiKey: string;
};

export type TtsProvider = {
  id: TtsProviderId;
  displayName: string;
  defaultModelId: string;
  maxInputChars(modelId: string): number;
  listVoices(options?: {
    languageCode?: string | null;
    modelId?: string | null;
  }): Promise<TtsVoice[]>;
  estimateCost(input: {
    chars: number;
    modelId: string;
  }): Promise<TtsCostEstimate>;
  synthesizeSegment(request: TtsSynthesisRequest): Promise<TtsSynthesisResult>;
};
