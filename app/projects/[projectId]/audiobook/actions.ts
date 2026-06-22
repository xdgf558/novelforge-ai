"use server";

import { execFile } from "node:child_process";
import { mkdir } from "node:fs/promises";
import { promisify } from "node:util";
import { Prisma } from "@prisma/client";
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

  const activeExport = await prisma.audioExport.findFirst({
    where: {
      chapterId: chapter.id,
      projectId,
      status: {
        in: ["pending", "running"],
      },
    },
    select: {
      id: true,
    },
  });

  if (activeExport) {
    revalidateAudiobookPaths(projectId);
    redirect(`/projects/${projectId}/audiobook?audioError=activeExport`);
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

  let audioExport;

  try {
    audioExport = await prisma.$transaction(async (tx) => {
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
  const retryLock = await prisma.$transaction(async (tx) => {
    const locked = await tx.audioExport.updateMany({
      where: {
        failedSegments: {
          gt: 0,
        },
        id: audioExportId,
        projectId,
        status: {
          in: ["failed", "partial_success"],
        },
      },
      data: {
        completedAt: null,
        errorMessage: null,
        status: "running",
      },
    });

    if (locked.count !== 1) {
      return {
        locked: false,
        segmentIndexes: [],
      };
    }

    const failedSegments = await tx.audioExportSegment.findMany({
      where: {
        audioExportId,
        projectId,
        status: "failed",
      },
      select: {
        id: true,
        segmentIndex: true,
      },
    });

    if (failedSegments.length === 0) {
      await tx.audioExport.update({
        where: {
          id: audioExportId,
        },
        data: {
          completedAt: new Date(),
          errorMessage: "没有可重试的失败分段。",
          failedSegments: 0,
          status: "failed",
        },
      });

      return {
        locked: true,
        segmentIndexes: [],
      };
    }

    await tx.audioExportSegment.updateMany({
      where: {
        id: {
          in: failedSegments.map((segment) => segment.id),
        },
        status: "failed",
      },
      data: {
        errorMessage: null,
        status: "pending",
      },
    });

    return {
      locked: true,
      segmentIndexes: failedSegments.map((segment) => segment.segmentIndex),
    };
  });

  if (!retryLock.locked) {
    const existingExport = await prisma.audioExport.findFirst({
      where: {
        id: audioExportId,
        projectId,
      },
      select: {
        id: true,
      },
    });

    if (!existingExport) {
      notFound();
    }

    revalidateAudiobookPaths(projectId);
    redirect(`/projects/${projectId}/audiobook?audioError=activeExport`);
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

function isUniqueConstraintError(error: unknown) {
  if (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002"
  ) {
    return true;
  }

  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: unknown }).code === "P2002"
  );
}
