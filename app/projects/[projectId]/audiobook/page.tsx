import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  CheckCircle2,
  FolderOpen,
  Headphones,
  Play,
  RefreshCw,
  TriangleAlert,
} from "lucide-react";
import { AutoRefresh } from "@/components/auto-refresh";
import {
  openAudioExportFolder,
  retryFailedAudioExportSegments,
  startChapterAudioExport,
} from "@/app/projects/[projectId]/audiobook/actions";
import { readTtsGenerationSettings } from "@/lib/ai/local-config";
import { chunkAudioText } from "@/lib/audio/chunk-text";
import {
  estimateAudioDurationSeconds,
  estimateTtsCostCents,
  formatEstimatedCost,
  modelInputLimit,
} from "@/lib/audio/estimate-cost";
import { ppqTtsModelOptions } from "@/lib/audio/providers/registry";
import {
  audioSourceTextTypeLabel,
  resolveChapterAudioSourceText,
} from "@/lib/audio/text-source";
import { formatDate, formatNumber } from "@/lib/format";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type AudiobookPageProps = {
  params: Promise<{
    projectId: string;
  }>;
  searchParams?: Promise<{
    audioError?: string;
    audioStarted?: string;
  }>;
};

export default async function AudiobookPage({
  params,
  searchParams,
}: AudiobookPageProps) {
  const [{ projectId }, resolvedSearchParams] = await Promise.all([
    params,
    searchParams,
  ]);
  const [project, chapters, audioExports] = await Promise.all([
    prisma.project.findUnique({
      where: {
        id: projectId,
      },
      select: {
        id: true,
        title: true,
      },
    }),
    prisma.chapter.findMany({
      where: {
        projectId,
      },
      orderBy: {
        chapterNumber: "asc",
      },
      select: {
        id: true,
        chapterNumber: true,
        draftText: true,
        finalText: true,
        polishedText: true,
        title: true,
      },
    }),
    prisma.audioExport.findMany({
      where: {
        projectId,
      },
      include: {
        chapter: {
          select: {
            chapterNumber: true,
            title: true,
          },
        },
        segments: {
          orderBy: {
            segmentIndex: "asc",
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 20,
    }),
  ]);

  if (!project) {
    notFound();
  }

  const ttsSettings = readTtsGenerationSettings();
  const selectedChapter = chapters.find((chapter) =>
    resolveChapterAudioSourceText(chapter),
  );
  const selectedSource = selectedChapter
    ? resolveChapterAudioSourceText(selectedChapter)
    : null;
  const estimatedSegments = selectedSource
    ? chunkAudioText(selectedSource.text, {
        maxChars: modelInputLimit(ttsSettings.model),
      })
    : [];
  const hasActiveExport = audioExports.some((audioExport) =>
    ["pending", "running"].includes(audioExport.status),
  );
  const errorMessage = audioErrorMessage(resolvedSearchParams?.audioError);

  return (
    <div className="space-y-6">
      <AutoRefresh enabled={hasActiveExport} />

      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <Link
            className="mb-4 inline-flex items-center gap-2 text-sm font-medium text-ink-700 transition hover:text-signal-600"
            href={`/projects/${project.id}`}
          >
            <ArrowLeft aria-hidden="true" className="h-4 w-4" />
            返回项目
          </Link>
          <p className="text-sm font-semibold text-signal-600">{project.title}</p>
          <h1 className="mt-2 text-2xl font-semibold tracking-normal text-ink-950">
            有声小说导出
          </h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-ink-700">
            将章节正文分段合成为本地音频文件。默认读取精修正文，其次定稿正文，最后回退到草稿正文；导出不会修改章节和故事记忆。
          </p>
        </div>

        <Link
          className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md border border-ink-950/15 bg-white px-3 py-2 text-sm font-semibold text-ink-800 transition hover:bg-paper-100"
          href="/ai-settings#tts-settings"
        >
          <Headphones aria-hidden="true" className="h-4 w-4" />
          配置音色
        </Link>
      </div>

      {errorMessage ? (
        <div className="flex items-start gap-3 rounded-lg border border-red-300 bg-red-50 p-4 text-sm leading-6 text-red-800">
          <TriangleAlert aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0" />
          <div>
            <p className="font-semibold text-red-900">无法开始导出</p>
            <p>{errorMessage}</p>
          </div>
        </div>
      ) : null}

      {resolvedSearchParams?.audioStarted ? (
        <div className="flex items-start gap-3 rounded-lg border border-signal-600/25 bg-signal-600/10 p-4 text-sm leading-6 text-ink-800">
          <CheckCircle2
            aria-hidden="true"
            className="mt-0.5 h-5 w-5 shrink-0 text-signal-600"
          />
          <div>
            <p className="font-semibold text-ink-950">有声导出已开始</p>
            <p>页面会自动刷新进度；成功分段会保存到本机音频导出目录。</p>
          </div>
        </div>
      ) : null}

      <section className="rounded-lg border border-ink-950/10 bg-white p-5 shadow-panel">
        <div className="flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-ink-950">单章导出</h2>
            <p className="mt-1 text-sm leading-6 text-ink-700">
              第一版先稳定生成每章独立分段音频。整本合并和视频素材包会在后续阶段继续扩展。
            </p>
          </div>
          <div className="rounded-md bg-paper-100 px-3 py-2 text-sm text-ink-700">
            {ttsSettings.hasApiKey ? "TTS API Key 已配置" : "TTS API Key 未配置"}
          </div>
        </div>

        <form
          action={startChapterAudioExport.bind(null, project.id)}
          className="mt-5 grid gap-5 lg:grid-cols-2"
        >
          <label className="space-y-2">
            <span className="text-sm font-semibold text-ink-800">章节</span>
            <select
              className="min-h-11 w-full rounded-md border border-ink-950/15 bg-white px-3 py-2 text-sm text-ink-950 outline-none transition focus:border-signal-600 focus:ring-2 focus:ring-signal-600/20"
              defaultValue={selectedChapter?.id}
              name="chapterId"
            >
              {chapters.map((chapter) => {
                const sourceText = resolveChapterAudioSourceText(chapter);

                return (
                  <option
                    disabled={!sourceText}
                    key={chapter.id}
                    value={chapter.id}
                  >
                    第 {chapter.chapterNumber} 章：{chapter.title}
                    {sourceText ? "" : "（无可导出正文）"}
                  </option>
                );
              })}
            </select>
          </label>

          <label className="space-y-2">
            <span className="text-sm font-semibold text-ink-800">文本来源</span>
            <select
              className="min-h-11 w-full rounded-md border border-ink-950/15 bg-white px-3 py-2 text-sm text-ink-950 outline-none transition focus:border-signal-600 focus:ring-2 focus:ring-signal-600/20"
              defaultValue="auto"
              name="sourceTextType"
            >
              <option value="auto">自动：精修 → 定稿 → 草稿</option>
              <option value="polishedText">精修正文</option>
              <option value="finalText">定稿正文</option>
              <option value="draftText">草稿正文</option>
            </select>
          </label>

          <label className="space-y-2">
            <span className="text-sm font-semibold text-ink-800">模型</span>
            <select
              className="min-h-11 w-full rounded-md border border-ink-950/15 bg-white px-3 py-2 text-sm text-ink-950 outline-none transition focus:border-signal-600 focus:ring-2 focus:ring-signal-600/20"
              defaultValue={ttsSettings.model}
              name="modelId"
            >
              {ppqTtsModelOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-2">
            <span className="text-sm font-semibold text-ink-800">音色 ID</span>
            <input
              className="min-h-11 w-full rounded-md border border-ink-950/15 bg-white px-3 py-2 text-sm text-ink-950 outline-none transition focus:border-signal-600 focus:ring-2 focus:ring-signal-600/20"
              defaultValue={ttsSettings.voiceId}
              name="voiceId"
              placeholder="未填写时使用供应商默认音色"
              type="text"
            />
            <input name="voiceName" type="hidden" value={ttsSettings.voiceName} />
          </label>

          <label className="space-y-2">
            <span className="text-sm font-semibold text-ink-800">语言</span>
            <input
              className="min-h-11 w-full rounded-md border border-ink-950/15 bg-white px-3 py-2 text-sm text-ink-950 outline-none transition focus:border-signal-600 focus:ring-2 focus:ring-signal-600/20"
              defaultValue={ttsSettings.languageCode}
              name="languageCode"
              type="text"
            />
          </label>

          <label className="space-y-2">
            <span className="text-sm font-semibold text-ink-800">格式</span>
            <select
              className="min-h-11 w-full rounded-md border border-ink-950/15 bg-white px-3 py-2 text-sm text-ink-950 outline-none transition focus:border-signal-600 focus:ring-2 focus:ring-signal-600/20"
              defaultValue={ttsSettings.outputFormat}
              name="outputFormat"
            >
              <option value="mp3">MP3</option>
              <option value="wav">WAV</option>
              <option value="ogg">OGG</option>
            </select>
          </label>

          <label className="space-y-2 lg:col-span-2">
            <span className="text-sm font-semibold text-ink-800">风格提示词</span>
            <textarea
              className="min-h-24 w-full rounded-md border border-ink-950/15 bg-white px-3 py-2 text-sm leading-6 text-ink-950 outline-none transition focus:border-signal-600 focus:ring-2 focus:ring-signal-600/20"
              defaultValue={ttsSettings.stylePrompt}
              maxLength={1200}
              name="stylePrompt"
            />
          </label>

          <div className="rounded-lg border border-ink-950/10 bg-paper-50 p-4 text-sm leading-6 text-ink-700 lg:col-span-2">
            <p>
              当前预估：
              {selectedSource
                ? `${formatNumber(selectedSource.text.length)} 字，${estimatedSegments.length} 段，约 ${Math.ceil(
                    estimateAudioDurationSeconds(selectedSource.text.length) / 60,
                  )} 分钟。来源：${audioSourceTextTypeLabel(selectedSource.type)}。`
                : "还没有可导出的章节正文。"}
            </p>
            <p>
              费用提示：
              {selectedSource
                ? formatEstimatedCost(
                    estimateTtsCostCents({
                      charCount: selectedSource.text.length,
                      modelId: ttsSettings.model,
                    }),
                  )
                : "需要先选择有正文的章节。"}
            </p>
          </div>

          <div className="flex justify-end lg:col-span-2">
            <button
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-ink-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-ink-800 disabled:cursor-not-allowed disabled:opacity-55"
              disabled={!selectedChapter || !ttsSettings.hasApiKey || hasActiveExport}
              type="submit"
            >
              <Play aria-hidden="true" className="h-4 w-4" />
              {hasActiveExport ? "有导出进行中" : "开始导出有声章节"}
            </button>
          </div>
        </form>
      </section>

      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-ink-950">导出历史</h2>
          <p className="mt-1 text-sm leading-6 text-ink-700">
            当前显示最近 20 条导出记录。失败分段可以重试；成功音频保存在本机数据目录。
          </p>
        </div>

        {audioExports.length === 0 ? (
          <div className="rounded-lg border border-dashed border-ink-950/20 bg-white/72 p-8 text-center">
            <Headphones
              aria-hidden="true"
              className="mx-auto h-8 w-8 text-signal-600"
            />
            <h3 className="mt-4 text-lg font-semibold text-ink-950">
              还没有有声导出
            </h3>
            <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-ink-700">
              先选择一章导出，系统会把文本拆成多个安全分段并逐段合成音频。
            </p>
          </div>
        ) : (
          audioExports.map((audioExport) => (
            <article
              className="rounded-lg border border-ink-950/10 bg-white p-5 shadow-panel"
              key={audioExport.id}
            >
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-ink-700">
                    <span className="rounded-md bg-paper-100 px-2 py-1">
                      {audioExportStatusLabel(audioExport.status)}
                    </span>
                    <span>{audioExport.modelId}</span>
                    <span>{formatDate(audioExport.createdAt)}</span>
                  </div>
                  <h3 className="mt-3 text-lg font-semibold text-ink-950">
                    第 {audioExport.chapter?.chapterNumber ?? "-"} 章：
                    {audioExport.chapter?.title ?? "章节已删除"}
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-ink-700">
                    {audioSourceTextTypeLabel(audioExport.sourceTextType)} /{" "}
                    {formatNumber(audioExport.totalChars)} 字 /{" "}
                    {audioExport.succeededSegments}/{audioExport.totalSegments} 段成功
                    {audioExport.failedSegments > 0
                      ? ` / ${audioExport.failedSegments} 段失败`
                      : ""}
                  </p>
                  {audioExport.outputDirectory ? (
                    <p className="mt-1 break-all text-xs leading-5 text-ink-700">
                      {audioExport.outputDirectory}
                    </p>
                  ) : null}
                </div>
                <div className="flex flex-wrap gap-2">
                  {audioExport.failedSegments > 0 ? (
                    <form
                      action={retryFailedAudioExportSegments.bind(
                        null,
                        project.id,
                        audioExport.id,
                      )}
                    >
                      <button
                        className="inline-flex min-h-10 items-center gap-2 rounded-md border border-ink-950/15 bg-white px-3 py-2 text-sm font-semibold text-ink-800 transition hover:bg-paper-100"
                        type="submit"
                      >
                        <RefreshCw aria-hidden="true" className="h-4 w-4" />
                        重试失败分段
                      </button>
                    </form>
                  ) : null}
                  <form
                    action={openAudioExportFolder.bind(
                      null,
                      project.id,
                      audioExport.id,
                    )}
                  >
                    <button
                      className="inline-flex min-h-10 items-center gap-2 rounded-md border border-ink-950/15 bg-white px-3 py-2 text-sm font-semibold text-ink-800 transition hover:bg-paper-100"
                      type="submit"
                    >
                      <FolderOpen aria-hidden="true" className="h-4 w-4" />
                      打开目录
                    </button>
                  </form>
                </div>
              </div>

              <div className="mt-5 grid gap-3 md:grid-cols-2">
                {audioExport.segments.map((segment) => (
                  <div
                    className="rounded-md border border-ink-950/10 bg-paper-50 p-3"
                    key={segment.id}
                  >
                    <div className="flex items-center justify-between gap-3 text-xs font-semibold text-ink-700">
                      <span>分段 {segment.segmentIndex}</span>
                      <span>{audioExportStatusLabel(segment.status)}</span>
                    </div>
                    <p className="mt-2 line-clamp-2 text-sm leading-6 text-ink-800">
                      {segment.inputPreview}
                    </p>
                    {segment.localPath ? (
                      <audio
                        className="mt-3 w-full"
                        controls
                        src={`/projects/${project.id}/audio-assets?assetPath=${encodeURIComponent(
                          segment.localPath,
                        )}`}
                      />
                    ) : null}
                    {segment.errorMessage ? (
                      <p className="mt-2 text-xs leading-5 text-red-700">
                        {segment.errorMessage}
                      </p>
                    ) : null}
                  </div>
                ))}
              </div>
            </article>
          ))
        )}
      </section>
    </div>
  );
}

function audioExportStatusLabel(status: string) {
  if (status === "succeeded") {
    return "已完成";
  }

  if (status === "partial_success") {
    return "部分完成";
  }

  if (status === "failed") {
    return "失败";
  }

  if (status === "running") {
    return "生成中";
  }

  return "等待中";
}

function audioErrorMessage(error?: string) {
  if (error === "missingTtsApiKey") {
    return "还没有配置 PPQ TTS API Key，请先到本机设置里保存有声导出参数。";
  }

  if (error === "missingChapterText") {
    return "所选章节没有可导出的精修、定稿或草稿正文。";
  }

  if (error === "invalidForm") {
    return "导出表单内容不完整，请检查章节、模型、语言和输出格式。";
  }

  if (error === "activeExport") {
    return "这章已经有有声导出正在进行中，请等待当前任务完成后再重新导出，避免重复扣费。";
  }

  return "";
}
