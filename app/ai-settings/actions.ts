"use server";

import { execFile } from "node:child_process";
import fs from "node:fs";
import { promisify } from "node:util";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  normalizeTtsApiBaseUrl,
  isGenericTtsLanguageCode,
  normalizeTtsLanguageCode,
  normalizeTtsModel,
  normalizeTtsOutputFormat,
  normalizeTtsProviderId,
  normalizeTtsStylePrompt,
  normalizeTtsVoiceId,
  normalizeTtsVoiceName,
  saveAiConnectionSettings,
  saveImageGenerationSettings,
  saveNetworkProxySettings,
  saveStationCatPublishSettings,
  saveTtsGenerationSettings,
  readTtsGenerationSecrets,
} from "@/lib/ai/local-config";
import { saveAudioPreviewAsset } from "@/lib/audio/audio-assets";
import { getConfiguredTtsProvider } from "@/lib/audio/providers/registry";
import type { TtsProviderId } from "@/lib/audio/providers/types";
import {
  createLocalBackup,
  getLocalBackupRoot,
  localBackupFingerprint,
} from "@/lib/local-backups";
import { resetServerFetchProxyDispatcher } from "@/lib/server-fetch";

const execFileAsync = promisify(execFile);

export async function saveAiConnectionSettingsAction(formData: FormData) {
  try {
    saveAiConnectionSettings({
      apiKey: formData.get("apiKey")?.toString(),
      clearApiKey: formData.get("clearApiKey") === "on",
      model: formData.get("model")?.toString(),
      baseUrl: formData.get("baseUrl")?.toString(),
    });
    saveNetworkProxySettings({
      noProxy: formData.get("networkNoProxy")?.toString(),
      proxyUrl: formData.get("networkProxyUrl")?.toString(),
    });
  } catch {
    revalidatePath("/ai-settings");
    revalidatePath("/");
    redirect("/ai-settings?saved=ai-error");
  }

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
      languageCode: readTtsLanguageCodeFromForm(formData),
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
  const savedCode =
    formData.get("ttsSettingsAction")?.toString() === "save-voice"
      ? "tts-voice"
      : "tts";
  redirect(`/ai-settings?saved=${savedCode}`);
}

export async function previewTtsVoiceAction(formData: FormData) {
  let previewPath = "";
  let errorCode = "";
  let errorMessage = "";

  try {
    const secrets = ttsSecretsFromForm(formData);

    if (!secrets.apiKey) {
      errorCode = "tts-missing-key";
    } else if (!secrets.voiceId) {
      errorCode = "tts-missing-voice";
    } else {
      previewPath = await generateTtsPreview(formData, secrets);
    }
  } catch (error) {
    errorCode = "tts-preview-error";
    errorMessage = sanitizeTtsPreviewError(error);
  }

  revalidatePath("/ai-settings");

  if (previewPath) {
    redirect(
      `/ai-settings?saved=tts-preview&ttsPreviewPath=${encodeURIComponent(
        previewPath,
      )}`,
    );
  }

  const params = new URLSearchParams({
    saved: errorCode || "tts-preview-error",
  });

  if (errorMessage) {
    params.set("ttsError", errorMessage);
  }

  redirect(`/ai-settings?${params.toString()}`);
}

export async function createLocalBackupAction() {
  let redirectTo = "/ai-settings?saved=backup-error#local-backups";

  try {
    const backup = await createLocalBackup();
    const params = new URLSearchParams({
      backupFile: backup.fileName,
      backupFiles: String(backup.includedFiles),
      backupSize: String(backup.sizeBytes),
      backupToken: localBackupFingerprint(backup),
      saved: "backup",
    });

    redirectTo = `/ai-settings?${params.toString()}#local-backups`;
  } catch (error) {
    const params = new URLSearchParams({
      backupError: sanitizeBackupError(error),
      saved: "backup-error",
    });

    redirectTo = `/ai-settings?${params.toString()}#local-backups`;
  }

  revalidatePath("/ai-settings");
  redirect(redirectTo);
}

export async function openLocalBackupDirectoryAction() {
  let redirectTo = "/ai-settings?saved=backup-folder-error#local-backups";

  try {
    const backupRoot = getLocalBackupRoot();
    const openCommand = openDirectoryCommand(backupRoot);

    await fs.promises.mkdir(backupRoot, { recursive: true });
    await execFileAsync(openCommand.command, openCommand.args);
    redirectTo = "/ai-settings?saved=backup-folder#local-backups";
  } catch (error) {
    const params = new URLSearchParams({
      backupError: sanitizeBackupError(error),
      saved: "backup-folder-error",
    });

    redirectTo = `/ai-settings?${params.toString()}#local-backups`;
  }

  revalidatePath("/ai-settings");
  redirect(redirectTo);
}

function openDirectoryCommand(directoryPath: string) {
  if (process.platform === "darwin") {
    return {
      command: "open",
      args: [directoryPath],
    };
  }

  if (process.platform === "win32") {
    return {
      command: "explorer",
      args: [directoryPath],
    };
  }

  return {
    command: "xdg-open",
    args: [directoryPath],
  };
}

const defaultTtsPreviewText =
  "1999年的夏天，县城的风扇声嗡嗡作响。陈远站在老旧电脑前，看着屏幕上那行白字，忽然笑了。 “这一次，”他说，“我不想再被时代推着走了。”";
const ttsPreviewMaxAttempts = 3;

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
    languageCode: normalizeTtsLanguageCode(readTtsLanguageCodeFromForm(formData)),
    outputFormat: normalizeTtsOutputFormat(
      formData.get("ttsOutputFormat")?.toString(),
    ),
    stylePrompt: normalizeTtsStylePrompt(formData.get("ttsStylePrompt")?.toString()),
  };
}

async function generateTtsPreview(
  formData: FormData,
  secrets: ReturnType<typeof ttsSecretsFromForm>,
) {
  let lastError: unknown = null;

  for (let attempt = 1; attempt <= ttsPreviewMaxAttempts; attempt += 1) {
    try {
      return await generateTtsPreviewAttempt(formData, secrets);
    } catch (error) {
      lastError = error;

      if (attempt >= ttsPreviewMaxAttempts || !isRetryableTtsPreviewError(error)) {
        throw error;
      }

      resetServerFetchProxyDispatcher();
      await waitBeforeTtsPreviewRetry(attempt);
    }
  }

  throw lastError instanceof Error ? lastError : new Error("TTS 试听生成失败。");
}

async function generateTtsPreviewAttempt(
  formData: FormData,
  secrets: ReturnType<typeof ttsSecretsFromForm>,
) {
  const provider = getConfiguredTtsProvider({
    settings: secrets,
  });
  const previewText =
    cleanPreviewText(formData.get("ttsPreviewText")?.toString()) ||
    defaultTtsPreviewText;
  const result = await provider.synthesizeSegment({
    providerId: secrets.providerId as TtsProviderId,
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
    outputFormat: secrets.outputFormat,
    voiceId: secrets.voiceId,
  });

  return savedPreview.relativePath;
}

function waitBeforeTtsPreviewRetry(attempt: number) {
  return new Promise((resolve) => {
    setTimeout(resolve, Math.min(400 * attempt, 1200));
  });
}

function cleanPreviewText(value?: string | null) {
  return value?.trim().slice(0, 500) ?? "";
}

function isRetryableTtsPreviewError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error ?? "");

  return /fetch failed|ECONNRESET|socket|TLS|timeout|超时|Request was cancelled/i.test(
    message,
  );
}

function sanitizeTtsPreviewError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error ?? "");
  const cleanMessage = message
    .replace(/sk-[A-Za-z0-9_-]{6,}/g, "sk-***")
    .replace(
      /[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}/g,
      "***",
    )
    .trim();

  return cleanMessage.slice(0, 220);
}

function sanitizeBackupError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error ?? "");

  return message.replace(/sk-[A-Za-z0-9_-]{6,}/g, "sk-***").trim().slice(0, 220);
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

function readTtsLanguageCodeFromForm(formData: FormData) {
  const selection = parseTtsVoiceSelection(
    formData.get("ttsVoiceSelection")?.toString(),
  );
  const selectedLanguageCode = selection?.languageCode?.trim() || "";

  return !isGenericTtsLanguageCode(selectedLanguageCode) && selectedLanguageCode
    ? selectedLanguageCode
    : formData.get("ttsLanguageCode")?.toString() || "";
}

function parseTtsVoiceSelection(value?: string | null) {
  const cleanValue = value?.trim() ?? "";

  if (!cleanValue) {
    return null;
  }

  const [id, name = "", languageCode = ""] = cleanValue.split("|||");

  return {
    id,
    languageCode,
    name,
  };
}
