import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  CheckCircle2,
  Headphones,
  TriangleAlert,
} from "lucide-react";
import { AutoRefresh } from "@/components/auto-refresh";
import { FormActionButton } from "@/components/form-action-button";
import { PreserveScrollForm } from "@/components/preserve-scroll-form";
import {
  deleteAudioExport,
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
import { loadStationCatPublishedChapterIds } from "@/lib/audio/published-source";
import { ttsModelOptionsForProvider } from "@/lib/audio/providers/registry";
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
    audioDeleted?: string;
    audioError?: string;
    audioErrorDetail?: string;
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
  const [project, chapters, audioExports, publishedChapterIds] = await Promise.all([
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
    loadStationCatPublishedChapterIds(projectId),
  ]);

  if (!project) {
    notFound();
  }

  const ttsSettings = readTtsGenerationSettings();
  const modelOptions = ttsModelOptionsForProvider(ttsSettings.providerId);
  const selectedChapter =
    chapters.find((chapter) => publishedChapterIds.has(chapter.id)) ??
    chapters.find((chapter) => resolveChapterAudioSourceText(chapter));
  const selectedLocalSource = selectedChapter
    ? resolveChapterAudioSourceText(selectedChapter)
    : null;
  const estimatedSegments = selectedLocalSource
    ? chunkAudioText(selectedLocalSource.text, {
        maxChars: modelInputLimit(ttsSettings.model),
      })
    : [];
  const hasActiveExport = audioExports.some((audioExport) =>
    ["pending", "running"].includes(audioExport.status),
  );
  const errorMessage = audioErrorMessage(
    resolvedSearchParams?.audioError,
    resolvedSearchParams?.audioErrorDetail,
  );

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
            将个人网站正式发布正文分段合成为本地音频文件，并在成功后自动合并整章 WAV。导出不会修改章节和故事记忆。
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

      {resolvedSearchParams?.audioDeleted ? (
        <div className="flex items-start gap-3 rounded-lg border border-signal-600/25 bg-signal-600/10 p-4 text-sm leading-6 text-ink-800">
          <CheckCircle2
            aria-hidden="true"
            className="mt-0.5 h-5 w-5 shrink-0 text-signal-600"
          />
          <div>
            <p className="font-semibold text-ink-950">导出记录已删除</p>
            <p>对应的本机音频文件和导出历史记录已清理。</p>
          </div>
        </div>
      ) : null}

      <section className="rounded-lg border border-ink-950/10 bg-white p-5 shadow-panel">
        <div className="flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-ink-950">单章导出</h2>
            <p className="mt-1 text-sm leading-6 text-ink-700">
              默认实时读取 Station Cat 网站当前公开正文；软件内精修、定稿和草稿可作为手动备用来源。
            </p>
          </div>
          <div className="rounded-md bg-paper-100 px-3 py-2 text-sm text-ink-700">
            {ttsSettings.hasApiKey ? "TTS API Key 已配置" : "TTS API Key 未配置"}
          </div>
        </div>

        <PreserveScrollForm
          action={startChapterAudioExport.bind(null, project.id)}
          className="mt-5 grid gap-5 lg:grid-cols-2"
          preserveKey={`audio-export-start-${project.id}`}
          statusText="已开始创建有声导出任务，页面会留在当前位置并自动刷新进度。"
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
                const hasWebsiteSource = publishedChapterIds.has(chapter.id);

                return (
                  <option
                    disabled={!sourceText && !hasWebsiteSource}
                    key={chapter.id}
                    value={chapter.id}
                  >
                    第 {chapter.chapterNumber} 章：{chapter.title}
                    {hasWebsiteSource
                      ? ""
                      : sourceText
                        ? "（未发布到网站，可手动选软件内文本）"
                        : "（无可导出正文）"}
                  </option>
                );
              })}
            </select>
          </label>

          <label className="space-y-2">
            <span className="text-sm font-semibold text-ink-800">文本来源</span>
            <select
              className="min-h-11 w-full rounded-md border border-ink-950/15 bg-white px-3 py-2 text-sm text-ink-950 outline-none transition focus:border-signal-600 focus:ring-2 focus:ring-signal-600/20"
              defaultValue="publishedText"
              name="sourceTextType"
            >
              <option value="publishedText">个人网站正式发布版</option>
              <option value="auto">软件内自动：精修 → 定稿 → 草稿</option>
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
              {modelOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-2">
            <span className="text-sm font-semibold text-ink-800">音色 voice name</span>
            <input
              className="min-h-11 w-full rounded-md border border-ink-950/15 bg-white px-3 py-2 text-sm text-ink-950 outline-none transition focus:border-signal-600 focus:ring-2 focus:ring-signal-600/20"
              defaultValue={ttsSettings.voiceId}
              name="voiceId"
              placeholder="例如：Kore"
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
              <option value="wav">WAV</option>
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
              {publishedChapterIds.has(selectedChapter?.id ?? "")
                ? "网站正文将在导出时实时读取，字数与分段以网站当前公开版本为准。"
                : selectedLocalSource
                  ? `${formatNumber(selectedLocalSource.text.length)} 字，${estimatedSegments.length} 段，约 ${Math.ceil(
                      estimateAudioDurationSeconds(selectedLocalSource.text.length) / 60,
                    )} 分钟。来源：软件内${audioSourceTextTypeLabel(selectedLocalSource.type)}。`
                  : "还没有可导出的章节正文。"}
            </p>
            <p>
              费用提示：
              {publishedChapterIds.has(selectedChapter?.id ?? "")
                ? "网站正式版会在开始导出后按实际正文计算。"
                : selectedLocalSource
                  ? formatEstimatedCost(
                      estimateTtsCostCents({
                        charCount: selectedLocalSource.text.length,
                        modelId: ttsSettings.model,
                      }),
                    )
                  : "需要先选择有正文的章节。"}
            </p>
          </div>

          <div className="flex justify-end lg:col-span-2">
            <FormActionButton
              disabled={!selectedChapter || !ttsSettings.hasApiKey || hasActiveExport}
              icon="play"
              idleLabel={hasActiveExport ? "有导出进行中" : "开始导出有声章节"}
              name="audioExportAction"
              pendingLabel="正在创建导出..."
              statusText="正在创建有声导出任务，页面随后会自动刷新进度。"
              value="start"
              variant="dark"
            />
          </div>
        </PreserveScrollForm>
      </section>

      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-ink-950">导出历史</h2>
          <p className="mt-1 text-sm leading-6 text-ink-700">
            当前显示最近 20 条导出记录。成功记录优先提供整章合并音频；分段仍保留用于排查和重试。
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
                  {audioExport.mergedAudioPath ? (
                    <div className="mt-3 rounded-md border border-signal-600/20 bg-signal-600/10 p-3">
                      <p className="text-xs font-semibold text-ink-800">
                        整章合并音频
                        {audioExport.mergedSizeBytes
                          ? ` / ${formatNumber(audioExport.mergedSizeBytes)} bytes`
                          : ""}
                      </p>
                      <audio
                        className="mt-2 w-full"
                        controls
                        src={`/projects/${project.id}/audio-assets?assetPath=${encodeURIComponent(
                          audioExport.mergedAudioPath,
                        )}`}
                      />
                    </div>
                  ) : audioExport.status === "succeeded" ? (
                    <p className="mt-3 rounded-md border border-amber-500/25 bg-amber-500/10 px-3 py-2 text-xs leading-5 text-amber-900">
                      暂未生成整章合并音频，可打开目录查看分段文件。
                    </p>
                  ) : null}
                </div>
                <div className="flex flex-wrap gap-2">
                  {audioExport.failedSegments > 0 &&
                  audioExport.providerId === ttsSettings.providerId &&
                  !["pending", "running"].includes(audioExport.status) ? (
                    <PreserveScrollForm
                      action={retryFailedAudioExportSegments.bind(
                        null,
                        project.id,
                        audioExport.id,
                      )}
                      preserveKey={`audio-export-retry-${project.id}-${audioExport.id}`}
                      statusText="已开始重试失败分段，页面会留在当前位置并自动刷新进度。"
                    >
                      <FormActionButton
                        icon="refresh"
                        idleLabel="重试失败分段"
                        name="audioExportAction"
                        pendingLabel="正在重试..."
                        statusText="正在重新排队失败分段，完成后页面会刷新。"
                        value={`retry-${audioExport.id}`}
                      />
                    </PreserveScrollForm>
                  ) : null}
                  {audioExport.failedSegments > 0 &&
                  audioExport.providerId !== ttsSettings.providerId ? (
                    <p className="max-w-xs rounded-md border border-amber-500/25 bg-amber-500/10 px-3 py-2 text-xs leading-5 text-amber-900">
                      旧供应商导出记录不能用当前 Gemini 配置重试，请新建一次导出任务。
                    </p>
                  ) : null}
                  <form
                    action={openAudioExportFolder.bind(
                      null,
                      project.id,
                      audioExport.id,
                    )}
                  >
                    <FormActionButton
                      icon="folder"
                      idleLabel="打开目录"
                      name="audioExportAction"
                      pendingLabel="正在打开..."
                      value={`open-${audioExport.id}`}
                    />
                  </form>
                  <form
                    action={deleteAudioExport.bind(
                      null,
                      project.id,
                      audioExport.id,
                    )}
                  >
                    <FormActionButton
                      icon="trash"
                      idleLabel="删除记录"
                      name="audioExportAction"
                      pendingLabel="正在删除..."
                      statusText="正在删除导出记录和本机音频文件。"
                      value={`delete-${audioExport.id}`}
                      variant="danger"
                    />
                  </form>
                </div>
              </div>

              <details className="mt-5 rounded-md border border-ink-950/10 bg-paper-50 p-3">
                <summary className="cursor-pointer text-sm font-semibold text-ink-800">
                  查看分段明细（{audioExport.segments.length} 段）
                </summary>
                <div className="mt-3 grid gap-3 md:grid-cols-2">
                  {audioExport.segments.map((segment) => (
                    <div
                      className="rounded-md border border-ink-950/10 bg-white p-3"
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
              </details>
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

function audioErrorMessage(error?: string, detail?: string) {
  if (error === "missingTtsApiKey") {
    return "还没有配置 TTS API Key，请先到本机设置里保存有声导出参数。";
  }

  if (error === "missingChapterText") {
    return "所选章节没有可导出的精修、定稿或草稿正文。";
  }

  if (error === "publishedTextUnavailable") {
    return detail
      ? `无法读取个人网站正式发布正文：${detail}`
      : "无法读取个人网站正式发布正文。请确认章节已发布、远端 ID 已同步，并且网站端正文 API 已上线。";
  }

  if (error === "invalidForm") {
    return "导出表单内容不完整，请检查章节、模型、语言和输出格式。";
  }

  if (error === "activeExport") {
    return "这章已经有有声导出正在进行中，请等待当前任务完成后再重新导出，避免重复扣费。";
  }

  if (error === "legacyProviderExport") {
    return "这是旧供应商的有声导出记录，不能用当前 TTS 配置重试。请新建一次有声导出任务。";
  }

  return "";
}
