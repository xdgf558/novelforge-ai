import { prisma } from "@/lib/prisma";
import {
  audioDirectoryForExport,
  mergeWavAudioExportSegments,
  saveAudioExportSegmentAsset,
  writeAudioExportMetadata,
} from "./audio-assets";
import { chunkAudioText } from "./chunk-text";
import { modelInputLimit } from "./estimate-cost";
import { resolveWebsitePublishedAudioSource } from "./published-source";
import { getConfiguredTtsProvider } from "./providers/registry";
import type { TtsProviderId } from "./providers/types";
import { resolveChapterAudioSourceText } from "./text-source";

type ProcessAudioExportOptions = {
  audioExportId: string;
  segmentIndexes?: number[];
};

export async function processAudioExport({
  audioExportId,
  segmentIndexes,
}: ProcessAudioExportOptions) {
  const audioExport = await prisma.audioExport.findUnique({
    where: {
      id: audioExportId,
    },
    include: {
      chapter: true,
      segments: {
        orderBy: {
          segmentIndex: "asc",
        },
      },
    },
  });

  if (!audioExport || !audioExport.chapter) {
    return;
  }

  try {
    const sourceText =
      audioExport.sourceTextType === "publishedText"
        ? await resolveWebsitePublishedAudioSource({
            chapterId: audioExport.chapter.id,
            projectId: audioExport.projectId,
          })
        : resolveChapterAudioSourceText(
            audioExport.chapter,
            audioExport.sourceTextType as
              | "draftText"
              | "finalText"
              | "polishedText",
          );

    if (!sourceText || sourceText.hash !== audioExport.sourceTextHash) {
      throw new Error("章节文本已变化，请创建新的有声导出任务。");
    }

    const provider = getConfiguredTtsProvider();

    if (provider.id !== audioExport.providerId) {
      throw new Error(
        "该有声导出记录使用旧 TTS 供应商，请新建一次当前供应商的导出任务。",
      );
    }

    const chunks = chunkAudioText(sourceText.text, {
      maxChars: modelInputLimit(audioExport.modelId),
    });
    const targetIndexes = new Set(
      segmentIndexes?.length
        ? segmentIndexes
        : audioExport.segments.map((segment) => segment.segmentIndex),
    );

    for (const segment of audioExport.segments) {
      if (!targetIndexes.has(segment.segmentIndex)) {
        continue;
      }

      const chunk = chunks[segment.segmentIndex - 1];

      if (!chunk) {
        await prisma.audioExportSegment.update({
          where: {
            id: segment.id,
          },
          data: {
            errorMessage: "未找到对应分段文本。",
            status: "failed",
          },
        });
        continue;
      }

      await prisma.audioExportSegment.update({
        where: {
          id: segment.id,
        },
        data: {
          errorMessage: null,
          status: "running",
        },
      });

      try {
        const result = await provider.synthesizeSegment({
          providerId: audioExport.providerId as TtsProviderId,
          inputText: chunk.text,
          languageCode: audioExport.languageCode,
          modelId: audioExport.modelId,
          outputFormat: audioExport.outputFormat as "mp3" | "wav" | "pcm" | "ogg",
          stylePrompt: audioExport.stylePrompt,
          voiceId: audioExport.voiceId,
        });
        const savedAsset = await saveAudioExportSegmentAsset({
          audioBytes: result.audioBytes,
          audioExportId: audioExport.id,
          chapterNumber: audioExport.chapter.chapterNumber,
          chapterTitle: audioExport.chapter.title,
          contentType: result.contentType,
          outputFormat: audioExport.outputFormat,
          projectId: audioExport.projectId,
          segmentIndex: segment.segmentIndex,
        });

        await prisma.audioExportSegment.update({
          where: {
            id: segment.id,
          },
          data: {
            durationMs: result.durationMs ?? null,
            errorMessage: null,
            localPath: savedAsset.relativePath,
            metadataJson: JSON.stringify(result.providerMeta ?? null),
            mimeType: savedAsset.mimeType,
            providerRequestId: result.providerRequestId ?? null,
            status: "succeeded",
          },
        });
      } catch (error) {
        await prisma.audioExportSegment.update({
          where: {
            id: segment.id,
          },
          data: {
            errorMessage: error instanceof Error ? error.message : String(error),
            status: "failed",
          },
        });
      }
    }

    await finalizeAudioExport(audioExportId);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);

    await prisma.audioExportSegment.updateMany({
      where: {
        audioExportId,
        status: {
          in: ["pending", "running"],
        },
      },
      data: {
        status: "failed",
        errorMessage,
      },
    });
    await finalizeAudioExport(audioExportId, {
      fallbackErrorMessage: errorMessage,
    });
  }
}

export async function finalizeAudioExport(
  audioExportId: string,
  options: {
    fallbackErrorMessage?: string;
  } = {},
) {
  const audioExport = await prisma.audioExport.findUnique({
    where: {
      id: audioExportId,
    },
    include: {
      chapter: {
        select: {
          chapterNumber: true,
          id: true,
          title: true,
        },
      },
      segments: {
        orderBy: {
          segmentIndex: "asc",
        },
      },
    },
  });

  if (!audioExport) {
    return;
  }

  const succeededSegments = audioExport.segments.filter(
    (segment) => segment.status === "succeeded",
  ).length;
  const failedSegments = audioExport.segments.filter(
    (segment) => segment.status === "failed",
  ).length;
  const runningSegments = audioExport.segments.filter(
    (segment) => segment.status === "running" || segment.status === "pending",
  ).length;
  const status =
    runningSegments > 0
      ? "running"
      : failedSegments === 0
        ? "succeeded"
        : succeededSegments > 0
          ? "partial_success"
          : "failed";
  const outputDirectory = audioDirectoryForExport(
    audioExport.projectId,
    audioExport.id,
  );
  let metadataErrorMessage = "";
  let mergedAsset:
    | {
        relativePath: string;
        mimeType: string;
        sizeBytes: number;
      }
    | null = null;
  let mergeErrorMessage = "";

  if (status === "succeeded" && audioExport.outputFormat === "wav") {
    const segmentPaths = audioExport.segments
      .map((segment) => segment.localPath)
      .filter((localPath): localPath is string => Boolean(localPath));

    if (segmentPaths.length === audioExport.totalSegments) {
      try {
        mergedAsset = await mergeWavAudioExportSegments({
          audioExportId: audioExport.id,
          chapterNumber: audioExport.chapter?.chapterNumber ?? 0,
          chapterTitle: audioExport.chapter?.title ?? "chapter",
          projectId: audioExport.projectId,
          segmentPaths,
        });
      } catch (error) {
        mergeErrorMessage = `合并整章音频失败：${
          error instanceof Error ? error.message : String(error)
        }`;
      }
    }
  }

  try {
    await writeAudioExportMetadata({
      audioExportId: audioExport.id,
      projectId: audioExport.projectId,
      metadata: {
        audioExportId: audioExport.id,
        chapter: audioExport.chapter,
        createdAt: audioExport.createdAt.toISOString(),
        languageCode: audioExport.languageCode,
        modelId: audioExport.modelId,
        outputFormat: audioExport.outputFormat,
        providerId: audioExport.providerId,
        mergedAudioPath: mergedAsset?.relativePath ?? null,
        segments: audioExport.segments.map((segment) => ({
          charCount: segment.charCount,
          localPath: segment.localPath,
          preview: segment.inputPreview,
          segmentIndex: segment.segmentIndex,
          status: segment.status,
        })),
        sourceTextHash: audioExport.sourceTextHash,
        sourceTextType: audioExport.sourceTextType,
        voiceId: audioExport.voiceId,
        voiceName: audioExport.voiceName,
      },
    });
  } catch (error) {
    metadataErrorMessage = `导出元数据写入失败：${
      error instanceof Error ? error.message : String(error)
    }`;
  }

  await prisma.audioExport.update({
    where: {
      id: audioExportId,
    },
    data: {
      completedAt: runningSegments > 0 ? null : new Date(),
      errorMessage:
        metadataErrorMessage ||
        mergeErrorMessage ||
        (failedSegments > 0
          ? options.fallbackErrorMessage || "部分或全部音频分段生成失败。"
          : null),
      failedSegments,
      mergedAudioPath: mergedAsset?.relativePath ?? audioExport.mergedAudioPath,
      mergedMimeType: mergedAsset?.mimeType ?? audioExport.mergedMimeType,
      mergedSizeBytes: mergedAsset?.sizeBytes ?? audioExport.mergedSizeBytes,
      outputDirectory,
      status,
      succeededSegments,
    },
  });
}
