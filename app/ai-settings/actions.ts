"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  normalizeTtsApiBaseUrl,
  normalizeTtsLanguageCode,
  normalizeTtsModel,
  normalizeTtsOutputFormat,
  normalizeTtsProviderId,
  normalizeTtsStylePrompt,
  normalizeTtsVoiceId,
  normalizeTtsVoiceName,
  saveAiConnectionSettings,
  saveImageGenerationSettings,
  saveStationCatPublishSettings,
  saveTtsGenerationSettings,
  readTtsGenerationSecrets,
} from "@/lib/ai/local-config";
import { saveAudioPreviewAsset } from "@/lib/audio/audio-assets";
import { getConfiguredTtsProvider } from "@/lib/audio/providers/registry";

export async function saveAiConnectionSettingsAction(formData: FormData) {
  saveAiConnectionSettings({
    apiKey: formData.get("apiKey")?.toString(),
    clearApiKey: formData.get("clearApiKey") === "on",
    model: formData.get("model")?.toString(),
    baseUrl: formData.get("baseUrl")?.toString(),
  });

  revalidatePath("/ai-settings");
  revalidatePath("/");
  redirect("/ai-settings?saved=ai");
}

export async function saveStationCatPublishSettingsAction(formData: FormData) {
  saveStationCatPublishSettings({
    apiBaseUrl: formData.get("stationCatApiBaseUrl")?.toString(),
    token: formData.get("stationCatToken")?.toString(),
    clearToken: formData.get("clearStationCatToken") === "on",
    defaultMode: formData.get("stationCatDefaultMode")?.toString(),
  });

  revalidatePath("/ai-settings");
  revalidatePath("/");
  redirect("/ai-settings?saved=station-cat");
}

export async function saveImageGenerationSettingsAction(formData: FormData) {
  try {
    saveImageGenerationSettings({
      apiBaseUrl: formData.get("imageApiBaseUrl")?.toString(),
      apiKey: formData.get("imageApiKey")?.toString(),
      clearApiKey: formData.get("clearImageApiKey") === "on",
      model: formData.get("imageModel")?.toString(),
      size: formData.get("imageSize")?.toString(),
      quality: formData.get("imageQuality")?.toString(),
    });
  } catch {
    revalidatePath("/ai-settings");
    revalidatePath("/");
    redirect("/ai-settings?saved=image-error");
  }

  revalidatePath("/ai-settings");
  revalidatePath("/");
  redirect("/ai-settings?saved=image");
}

export async function saveTtsGenerationSettingsAction(formData: FormData) {
  try {
    saveTtsGenerationSettings({
      providerId: formData.get("ttsProviderId")?.toString(),
      apiBaseUrl: formData.get("ttsApiBaseUrl")?.toString(),
      apiKey: formData.get("ttsApiKey")?.toString(),
      clearApiKey: formData.get("clearTtsApiKey") === "on",
      model: formData.get("ttsModel")?.toString(),
      voiceId: readTtsVoiceIdFromForm(formData),
      voiceName: readTtsVoiceNameFromForm(formData),
      languageCode: formData.get("ttsLanguageCode")?.toString(),
      outputFormat: formData.get("ttsOutputFormat")?.toString(),
      stylePrompt: formData.get("ttsStylePrompt")?.toString(),
    });
  } catch {
    revalidatePath("/ai-settings");
    revalidatePath("/");
    redirect("/ai-settings?saved=tts-error");
  }

  revalidatePath("/ai-settings");
  revalidatePath("/");
  redirect("/ai-settings?saved=tts");
}

export async function previewTtsVoiceAction(formData: FormData) {
  let previewPath = "";
  let errorCode = "";

  try {
    const secrets = ttsSecretsFromForm(formData);

    if (!secrets.apiKey) {
      errorCode = "tts-missing-key";
    } else {
      const provider = getConfiguredTtsProvider({
        settings: secrets,
      });
      const previewText =
        cleanPreviewText(formData.get("ttsPreviewText")?.toString()) ||
        defaultTtsPreviewText;
      const result = await provider.synthesizeSegment({
        providerId: "ppq_tts",
        inputText: previewText,
        languageCode: secrets.languageCode,
        modelId: secrets.model,
        outputFormat: secrets.outputFormat as "mp3" | "wav" | "pcm" | "ogg",
        stylePrompt: secrets.stylePrompt,
        voiceId: secrets.voiceId,
      });
      const savedPreview = await saveAudioPreviewAsset({
        audioBytes: result.audioBytes,
        contentType: result.contentType,
        modelId: secrets.model,
        voiceId: secrets.voiceId,
      });

      previewPath = savedPreview.relativePath;
    }
  } catch {
    errorCode = "tts-preview-error";
  }

  revalidatePath("/ai-settings");

  if (previewPath) {
    redirect(
      `/ai-settings?saved=tts-preview&ttsPreviewPath=${encodeURIComponent(
        previewPath,
      )}`,
    );
  }

  redirect(`/ai-settings?saved=${errorCode || "tts-preview-error"}`);
}

const defaultTtsPreviewText =
  "1999年的夏天，县城的风扇声嗡嗡作响。陈远站在老旧电脑前，看着屏幕上那行白字，忽然笑了。 “这一次，”他说，“我不想再被时代推着走了。”";

function ttsSecretsFromForm(formData: FormData) {
  const currentSecrets = readTtsGenerationSecrets();
  const apiKeyInput = formData.get("ttsApiKey")?.toString().trim() ?? "";
  const clearApiKey = formData.get("clearTtsApiKey") === "on";

  return {
    providerId: normalizeTtsProviderId(formData.get("ttsProviderId")?.toString()),
    apiBaseUrl: normalizeTtsApiBaseUrl(formData.get("ttsApiBaseUrl")?.toString()),
    apiKey: clearApiKey ? "" : apiKeyInput || currentSecrets.apiKey,
    model: normalizeTtsModel(formData.get("ttsModel")?.toString()),
    voiceId: normalizeTtsVoiceId(readTtsVoiceIdFromForm(formData)),
    voiceName: normalizeTtsVoiceName(readTtsVoiceNameFromForm(formData)),
    languageCode: normalizeTtsLanguageCode(
      formData.get("ttsLanguageCode")?.toString(),
    ),
    outputFormat: normalizeTtsOutputFormat(
      formData.get("ttsOutputFormat")?.toString(),
    ),
    stylePrompt: normalizeTtsStylePrompt(formData.get("ttsStylePrompt")?.toString()),
  };
}

function cleanPreviewText(value?: string | null) {
  return value?.trim().slice(0, 500) ?? "";
}

function readTtsVoiceIdFromForm(formData: FormData) {
  const selection = parseTtsVoiceSelection(
    formData.get("ttsVoiceSelection")?.toString(),
  );

  return selection?.id || formData.get("ttsVoiceId")?.toString() || "";
}

function readTtsVoiceNameFromForm(formData: FormData) {
  const selection = parseTtsVoiceSelection(
    formData.get("ttsVoiceSelection")?.toString(),
  );

  return selection?.name || formData.get("ttsVoiceName")?.toString() || "";
}

function parseTtsVoiceSelection(value?: string | null) {
  const cleanValue = value?.trim() ?? "";

  if (!cleanValue) {
    return null;
  }

  const [id, name = ""] = cleanValue.split("|||");

  return {
    id,
    name,
  };
}
