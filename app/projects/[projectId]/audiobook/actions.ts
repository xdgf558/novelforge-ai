"use server";

import { execFile } from "node:child_process";
import { mkdir } from "node:fs/promises";
import { promisify } from "node:util";
import { revalidatePath } from "next/cache";
import { notFound, redirect } from "next/navigation";
import { z } from "zod";
import { readTtsGenerationSecrets } from "@/lib/ai/local-config";
import { audioDirectoryForExport } from "@/lib/audio/audio-assets";
import { chunkAudioText } from "@/lib/audio/chunk-text";
import {
  estimateAudioDurationSeconds,
  estimateTtsCostCents,
  modelInputLimit,
} from "@/lib/audio/estimate-cost";
import { processAudioExport } from "@/lib/audio/export-runner";
import {
  hashAudioSourceText,
  resolveChapterAudioSourceText,
} from "@/lib/audio/text-source";
import { prisma } from "@/lib/prisma";

const execFileAsync = promisify(execFile);

const audioSourceSchema = z
  .enum(["auto", "polishedText", "finalText", "draftText"])
  .default("auto");

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
    sourceTextType: formData.get("sourceTextType")?.toString() || "auto",
    stylePrompt: formData.get("stylePrompt")?.toString() || secrets.stylePrompt,
    voiceId: formData.get("voiceId")?.toString() || secrets.voiceId,
    voiceName: formData.get("voiceName")?.toString() || secrets.voiceName,
  });

  if (!parsed.success) {
    revalidateAudiobookPaths(projectId);
    redirect(`/projects/${projectId}/audiobook?audioError=invalidForm`);
  }

  const chapter = await prisma.chapter.findFirst({
    where: {
      id: parsed.data.chapterId,
      projectId,
    },
  });

  if (!chapter) {
    notFound();
  }

  const sourceText = resolveChapterAudioSourceText(
    chapter,
    parsed.data.sourceTextType,
  );

  if (!sourceText) {
    revalidateAudiobookPaths(projectId);
    redirect(`/projects/${projectId}/audiobook?audioError=missingChapterText`);
  }

  const chunks = chunkAudioText(sourceText.text, {
    maxChars: modelInputLimit(parsed.data.modelId),
  });

  if (chunks.length === 0) {
    revalidateAudiobookPaths(projectId);
    redirect(`/projects/${projectId}/audiobook?audioError=missingChapterText`);
  }

  const audioExport = await prisma.$transaction(async (tx) => {
    const createdExport = await tx.audioExport.create({
      data: {
        chapterId: chapter.id,
        estimatedCostCents: estimateTtsCostCents({
          charCount: sourceText.text.length,
          modelId: parsed.data.modelId,
        }),
        estimatedSeconds: estimateAudioDurationSeconds(sourceText.text.length),
        failedSegments: 0,
        languageCode: parsed.data.languageCode,
        metadataJson: JSON.stringify({
          chapterNumber: chapter.chapterNumber,
          chapterTitle: chapter.title,
          modelInputLimit: modelInputLimit(parsed.data.modelId),
        }),
        modelId: parsed.data.modelId,
        outputFormat: parsed.data.outputFormat,
        projectId,
        providerId: secrets.providerId,
        scope: "chapter",
        sourceTextHash: sourceText.hash,
        sourceTextType: sourceText.type,
        status: "running",
        stylePrompt: parsed.data.stylePrompt,
        succeededSegments: 0,
        totalChars: sourceText.text.length,
        totalSegments: chunks.length,
        voiceId: parsed.data.voiceId,
        voiceName: parsed.data.voiceName,
      },
    });

    await tx.audioExportSegment.createMany({
      data: chunks.map((chunk) => ({
        audioExportId: createdExport.id,
        chapterId: chapter.id,
        charCount: chunk.charCount,
        inputPreview: chunk.preview,
        projectId,
        segmentIndex: chunk.index,
        status: "pending",
        textHash: hashAudioSourceText(chunk.text),
      })),
    });

    return createdExport;
  });

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
  const audioExport = await prisma.audioExport.findFirst({
    where: {
      id: audioExportId,
      projectId,
    },
    include: {
      segments: {
        where: {
          status: "failed",
        },
        select: {
          id: true,
          segmentIndex: true,
        },
      },
    },
  });

  if (!audioExport) {
    notFound();
  }

  if (audioExport.segments.length === 0) {
    revalidateAudiobookPaths(projectId);
    redirect(`/projects/${projectId}/audiobook`);
  }

  await prisma.$transaction(async (tx) => {
    await tx.audioExport.update({
      where: {
        id: audioExport.id,
      },
      data: {
        completedAt: null,
        errorMessage: null,
        status: "running",
      },
    });

    await tx.audioExportSegment.updateMany({
      where: {
        id: {
          in: audioExport.segments.map((segment) => segment.id),
        },
      },
      data: {
        errorMessage: null,
        status: "pending",
      },
    });
  });

  void processAudioExport({
    audioExportId: audioExport.id,
    segmentIndexes: audioExport.segments.map((segment) => segment.segmentIndex),
  }).catch((error) => {
    console.error("Background audiobook retry failed:", error);
  });

  revalidateAudiobookPaths(projectId);
  redirect(`/projects/${projectId}/audiobook?audioStarted=retry`);
}

export async function openAudioExportFolder(projectId: string, audioExportId: string) {
  const audioExport = await prisma.audioExport.findFirst({
    where: {
      id: audioExportId,
      projectId,
    },
    select: {
      id: true,
      outputDirectory: true,
    },
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

function revalidateAudiobookPaths(projectId: string) {
  revalidatePath(`/projects/${projectId}`);
  revalidatePath(`/projects/${projectId}/audiobook`);
}
