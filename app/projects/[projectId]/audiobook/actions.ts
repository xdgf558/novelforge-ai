"use server";

import { execFile } from "node:child_process";
import { mkdir } from "node:fs/promises";
import { promisify } from "node:util";
import { revalidatePath } from "next/cache";
import { notFound, redirect } from "next/navigation";
import { z } from "zod";
import {
  normalizeTtsModelForProvider,
  readTtsGenerationSecrets,
} from "@/lib/ai/local-config";
import {
  audioDirectoryForExport,
  deleteAudioExportAssets,
} from "@/lib/audio/audio-assets";
import { chunkAudioText } from "@/lib/audio/chunk-text";
import { modelInputLimit } from "@/lib/audio/estimate-cost";
import { processAudioExport } from "@/lib/audio/export-runner";
import { resolveWebsitePublishedAudioSource } from "@/lib/audio/published-source";
import {
  createChapterAudioExportRecord,
  deleteAudioExportRecord,
  findActiveChapterAudioExport,
  findAudioExportFolderRecord,
  findAudioExportForDeletion,
  findAudioExportProvider,
  findChapterForAudioExport,
  isActiveAudioExportStatus,
  isUniqueConstraintError,
  lockFailedAudioExportSegmentsForRetry,
} from "@/lib/audio/records";
import {
  resolveChapterAudioSourceText,
} from "@/lib/audio/text-source";

const execFileAsync = promisify(execFile);

const audioSourceSchema = z
  .enum(["publishedText", "auto", "polishedText", "finalText", "draftText"])
  .default("publishedText");

const chapterAudioExportSchema = z.object({
  chapterId: z.string().trim().min(1),
  languageCode: z.string().trim().min(1).max(16).default("zh"),
  modelId: z.string().trim().min(1).max(160),
  outputFormat: z.enum(["mp3", "wav", "ogg"]).default("mp3"),
  sourceTextType: audioSourceSchema,
  stylePrompt: z.string().trim().max(1200).optional().default(""),
  voiceId: z.string().trim().max(240).optional().default(""),
  voiceName: z.string().trim().max(160).optional().default(""),
});

export async function startChapterAudioExport(
  projectId: string,
  formData: FormData,
) {
  const secrets = readTtsGenerationSecrets();

  if (!secrets.apiKey) {
    revalidateAudiobookPaths(projectId);
    redirect(`/projects/${projectId}/audiobook?audioError=missingTtsApiKey`);
  }

  const parsed = chapterAudioExportSchema.safeParse({
    chapterId: formData.get("chapterId")?.toString(),
    languageCode: formData.get("languageCode")?.toString() || secrets.languageCode,
    modelId: formData.get("modelId")?.toString() || secrets.model,
    outputFormat: formData.get("outputFormat")?.toString() || secrets.outputFormat,
    sourceTextType: formData.get("sourceTextType")?.toString() || "publishedText",
    stylePrompt: formData.get("stylePrompt")?.toString() || secrets.stylePrompt,
    voiceId: formData.get("voiceId")?.toString() || secrets.voiceId,
    voiceName: formData.get("voiceName")?.toString() || secrets.voiceName,
  });

  if (!parsed.success) {
    revalidateAudiobookPaths(projectId);
    redirect(`/projects/${projectId}/audiobook?audioError=invalidForm`);
  }
  const modelId = normalizeTtsModelForProvider(
    parsed.data.modelId,
    secrets.providerId,
  );

  const chapter = await findChapterForAudioExport({
    chapterId: parsed.data.chapterId,
    projectId,
  });

  if (!chapter) {
    notFound();
  }

  const activeExport = await findActiveChapterAudioExport({
    chapterId: chapter.id,
    projectId,
  });

  if (activeExport) {
    revalidateAudiobookPaths(projectId);
    redirect(`/projects/${projectId}/audiobook?audioError=activeExport`);
  }

  const sourceText =
    parsed.data.sourceTextType === "publishedText"
      ? await resolveWebsitePublishedSourceOrRedirect(projectId, chapter.id)
      : resolveChapterAudioSourceText(chapter, parsed.data.sourceTextType);

  if (!sourceText) {
    revalidateAudiobookPaths(projectId);
    redirect(`/projects/${projectId}/audiobook?audioError=missingChapterText`);
  }

  const chunks = chunkAudioText(sourceText.text, {
    maxChars: modelInputLimit(modelId),
  });

  if (chunks.length === 0) {
    revalidateAudiobookPaths(projectId);
    redirect(`/projects/${projectId}/audiobook?audioError=missingChapterText`);
  }

  const outputFormat = "wav";
  let audioExport;

  try {
    audioExport = await createChapterAudioExportRecord({
      chapter,
      chunks,
      languageCode: parsed.data.languageCode,
      modelId,
      outputFormat,
      projectId,
      providerId: secrets.providerId,
      sourceText,
      stylePrompt: parsed.data.stylePrompt,
      voiceId: parsed.data.voiceId,
      voiceName: parsed.data.voiceName,
    });
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      revalidateAudiobookPaths(projectId);
      redirect(`/projects/${projectId}/audiobook?audioError=activeExport`);
    }

    throw error;
  }

  void processAudioExport({
    audioExportId: audioExport.id,
  }).catch((error) => {
    console.error("Background audiobook export failed:", error);
  });

  revalidateAudiobookPaths(projectId);
  redirect(`/projects/${projectId}/audiobook?audioStarted=1`);
}

export async function retryFailedAudioExportSegments(
  projectId: string,
  audioExportId: string,
) {
  const secrets = readTtsGenerationSecrets();
  const retryLock = await lockFailedAudioExportSegmentsForRetry({
    audioExportId,
    projectId,
    providerId: secrets.providerId,
  });

  if (!retryLock.locked) {
    const existingExport = await findAudioExportProvider({
      audioExportId,
      projectId,
    });

    if (!existingExport) {
      notFound();
    }

    revalidateAudiobookPaths(projectId);
    redirect(
      `/projects/${projectId}/audiobook?audioError=${
        existingExport.providerId === secrets.providerId
          ? "activeExport"
          : "legacyProviderExport"
      }`,
    );
  }

  if (retryLock.segmentIndexes.length === 0) {
    revalidateAudiobookPaths(projectId);
    redirect(`/projects/${projectId}/audiobook`);
  }

  void processAudioExport({
    audioExportId,
    segmentIndexes: retryLock.segmentIndexes,
  }).catch((error) => {
    console.error("Background audiobook retry failed:", error);
  });

  revalidateAudiobookPaths(projectId);
  redirect(`/projects/${projectId}/audiobook?audioStarted=retry`);
}

export async function openAudioExportFolder(projectId: string, audioExportId: string) {
  const audioExport = await findAudioExportFolderRecord({
    audioExportId,
    projectId,
  });

  if (!audioExport) {
    notFound();
  }

  const outputDirectory =
    audioExport.outputDirectory || audioDirectoryForExport(projectId, audioExport.id);

  if (process.platform === "darwin") {
    await mkdir(outputDirectory, {
      recursive: true,
    });
    await execFileAsync("open", [outputDirectory]);
  }

  revalidateAudiobookPaths(projectId);
  redirect(`/projects/${projectId}/audiobook`);
}

export async function deleteAudioExport(projectId: string, audioExportId: string) {
  const audioExport = await findAudioExportForDeletion({
    audioExportId,
    projectId,
  });

  if (!audioExport) {
    notFound();
  }

  if (isActiveAudioExportStatus(audioExport.status)) {
    revalidateAudiobookPaths(projectId);
    redirect(`/projects/${projectId}/audiobook?audioError=deleteActiveExport`);
  }

  await deleteAudioExportRecord(audioExport.id);
  await deleteAudioExportAssets({
    audioExportId: audioExport.id,
    projectId,
  }).catch((error) => {
    console.warn("Failed to delete audiobook export assets:", error);
  });

  revalidateAudiobookPaths(projectId);
  redirect(`/projects/${projectId}/audiobook?audioDeleted=1`);
}

async function resolveWebsitePublishedSourceOrRedirect(
  projectId: string,
  chapterId: string,
) {
  try {
    return await resolveWebsitePublishedAudioSource({
      chapterId,
      projectId,
    });
  } catch (error) {
    const params = new URLSearchParams({
      audioError: "publishedTextUnavailable",
      audioErrorDetail: sanitizeAudioError(error),
    });

    revalidateAudiobookPaths(projectId);
    redirect(`/projects/${projectId}/audiobook?${params.toString()}`);
  }
}

function revalidateAudiobookPaths(projectId: string) {
  revalidatePath(`/projects/${projectId}`);
  revalidatePath(`/projects/${projectId}/audiobook`);
}

function sanitizeAudioError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error ?? "");

  return message
    .replace(/sk-[A-Za-z0-9_-]{6,}/g, "sk-***")
    .replace(
      /[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}/g,
      "***",
    )
    .trim()
    .slice(0, 220);
}
