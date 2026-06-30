import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  CheckCircle2,
  Download,
  FileJson,
  FileText,
  Globe2,
  Image as ImageIcon,
  type LucideIcon,
  KeyRound,
  PackageCheck,
  Sparkles,
  Trash2,
  UploadCloud,
  XCircle,
} from "lucide-react";
import {
  adoptGeneratedProjectCover,
  generateProjectCoverImage,
  generateWechatLayoutCandidates,
  prepareGlobalStationCatPublishRun,
  preparePublishRun,
  rejectGeneratedProjectCover,
  removeProjectCover,
  savePublishTarget,
  uploadProjectCover,
} from "@/app/projects/[projectId]/publish/actions";
import { AutoRefresh } from "@/components/auto-refresh";
import { CopyExportPanel } from "@/components/copy-export-panel";
import { PreserveScrollForm } from "@/components/preserve-scroll-form";
import { PublishSubmitButton } from "@/components/publish-submit-button";
import { FanqieLayoutExportPanel } from "@/components/publish/fanqie-layout-export-panel";
import { WechatLayoutExportPanel } from "@/components/publish/wechat-layout-export-panel";
import { expireStaleCoverImageTasks } from "@/lib/ai/cover-image-task-maintenance";
import {
  readImageGenerationSettings,
  readStationCatPublishSettings,
} from "@/lib/ai/local-config";
import { hasConfiguredOpenAIKey } from "@/lib/ai/openai-client";
import { hasConfirmedChapterText } from "@/lib/ai/chapter-summaries";
import {
  aiTaskAdoptionLabel,
  aiTaskStatusLabel,
  isActiveAiTaskStatus,
} from "@/lib/ai/status";
import {
  coverImageGenerationTaskType,
  coverImageTargets,
  parseCoverImageTaskOutput,
} from "@/lib/ai/cover-images";
import { wechatLayoutCandidateTaskType } from "@/lib/ai/wechat-layout-candidates";
import { formatDate, formatNumber } from "@/lib/format";
import {
  buildProjectJsonExport,
  buildProjectMarkdownExport,
} from "@/lib/project-export";
import { buildExportData, projectPublishInclude } from "@/lib/project-export-data";
import {
  buildStandardPublishPackage,
  maskPublishToken,
  platformLabel,
  publishModeLabel,
  publishModeOptions,
  publishPlatformOptions,
  publishUploadScopeOptions,
  stringifyStandardPublishPackage,
} from "@/lib/publish-platforms";
import {
  coverImageAcceptAttribute,
  formatCoverImageSize,
} from "@/lib/project-cover-assets";
import { prisma } from "@/lib/prisma";
import { buildStationCatImportEndpoint } from "@/lib/station-cat-publisher";

export const dynamic = "force-dynamic";

type PublishPageProps = {
  params: Promise<{
    projectId: string;
  }>;
  searchParams?: Promise<{
    coverImageError?: string;
    fanqieChapterId?: string;
    wechatChapterId?: string;
  }>;
};

export default async function PublishPage({
  params,
  searchParams,
}: PublishPageProps) {
  const { projectId } = await params;
  const resolvedSearchParams = await searchParams;

  await expireStaleCoverImageTasks(projectId);

  const project = await prisma.project.findUnique({
    where: {
      id: projectId,
    },
    include: projectPublishInclude,
  });

  if (!project) {
    notFound();
  }

  const hasApiKey = hasConfiguredOpenAIKey();
  const imageSettings = readImageGenerationSettings();
  const stationCatSettings = readStationCatPublishSettings();
  const canUseGlobalStationCat = Boolean(
    stationCatSettings.apiBaseUrl && stationCatSettings.hasToken,
  );
  const exportData = buildExportData(project);
  const markdownExport = buildProjectMarkdownExport(exportData);
  const jsonExport = buildProjectJsonExport(exportData);
  const publishPackageForExport = buildStandardPublishPackage(exportData);
  const standardPublishPackage = stringifyStandardPublishPackage(
    publishPackageForExport,
  );
  const cover = publishPackageForExport.cover;
  const coverPromptDefault =
    cover.prompt ||
    project.description ||
    project.title;
  const baseFilename = safeFilename(project.title || "novelforge-project");
  const coverImageTasks = project.aiTasks
    .filter((task) => task.taskType === coverImageGenerationTaskType)
    .slice(0, 5);
  const wechatLayoutCandidateTasks = project.aiTasks
    .filter((task) => task.taskType === wechatLayoutCandidateTaskType)
    .slice(0, 12)
    .map((task) => ({
      chapterId: task.chapterId,
      createdAt: task.createdAt.toISOString(),
      errorMessage: task.errorMessage,
      id: task.id,
      inputContextSummary: task.inputContextSummary,
      model: task.model,
      outputText: task.outputText,
      promptTemplate: task.promptTemplate,
      status: task.status,
    }));
  const hasActiveCoverImageTask = coverImageTasks.some((task) =>
    isActiveAiTaskStatus(task.status),
  );
  const hasActiveWechatLayoutCandidateTask = wechatLayoutCandidateTasks.some(
    (task) => isActiveAiTaskStatus(task.status),
  );
  const publishableChapters = project.chapters
    .filter((chapter) => hasConfirmedChapterText(chapter))
    .map((chapter) => ({
      id: chapter.id,
      chapterNumber: chapter.chapterNumber,
      title: chapter.title,
    }));
  const globalStationCatTarget = project.publishTargets.find(
    (target) =>
      target.platformKey === "station_cat" &&
      target.name === "Station Cat 全局配置",
  );
  const customPublishTargets = project.publishTargets.filter(
    (target) => target.id !== globalStationCatTarget?.id,
  );
  const latestGlobalStationCatRun = globalStationCatTarget?.runs[0] ?? null;
  const wechatLayoutChapters = project.chapters
    .map((chapter) => ({
      id: chapter.id,
      chapterNumber: chapter.chapterNumber,
      draftText: chapter.draftText,
      finalText: chapter.finalText,
      polishedText: chapter.polishedText,
      title: chapter.title,
    }))
    .filter(
      (chapter) =>
        chapter.polishedText?.trim() ||
        chapter.finalText?.trim() ||
        chapter.draftText?.trim(),
    );

  return (
    <div className="space-y-6">
      <AutoRefresh
        enabled={
          hasActiveCoverImageTask ||
          hasActiveWechatLayoutCandidateTask
        }
      />

      <Link
        className="inline-flex items-center gap-2 text-sm font-medium text-ink-700 transition hover:text-signal-600"
        href={`/projects/${project.id}`}
      >
        <ArrowLeft aria-hidden="true" className="h-4 w-4" />
        返回项目
      </Link>

      <header className="rounded-lg border border-ink-950/10 bg-white p-6 shadow-panel">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-sm font-semibold text-signal-600">
              发布与格式导出
            </p>
            <h1 className="mt-2 text-3xl font-semibold tracking-normal text-ink-950">
              {project.title} 发布与导出
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-ink-700">
              整理公众号、番茄小说、项目备份和 Station Cat 网站同步材料。默认排版模式只整理格式，不改正文。
            </p>
          </div>
        </div>
      </header>

      <section className="grid gap-4 md:grid-cols-3">
        <InfoTile
          icon={FileText}
          label="章节"
          value={`${formatNumber(project._count.chapters)} 个`}
        />
        <InfoTile
          icon={FileText}
          label="可导出章节"
          value={`${formatNumber(wechatLayoutChapters.length)} 个`}
        />
        <InfoTile
          icon={FileJson}
          label="AI 任务"
          value={`${formatNumber(project._count.aiTasks)} 条`}
        />
      </section>

      <WechatLayoutExportPanel
        candidateTasks={wechatLayoutCandidateTasks}
        chapters={wechatLayoutChapters}
        generateAction={generateWechatLayoutCandidates.bind(null, project.id)}
        hasApiKey={hasApiKey}
        initialChapterId={resolvedSearchParams?.wechatChapterId}
        projectTitle={project.title}
      />

      <FanqieLayoutExportPanel
        chapters={wechatLayoutChapters}
        initialChapterId={resolvedSearchParams?.fanqieChapterId}
        projectTitle={project.title}
      />

      <section className="space-y-4 rounded-lg border border-ink-950/10 bg-white p-4 shadow-panel">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2 text-sm font-semibold text-signal-600">
            <ImageIcon aria-hidden="true" className="h-4 w-4" />
            书籍封面
          </div>
          <p className="text-xs text-ink-700">
            {cover.dataUrl ? "已配置封面" : "未配置封面"} / 最大 8MB
          </p>
        </div>
        <div className="grid gap-4 xl:grid-cols-[180px_1fr]">
          <div className="overflow-hidden rounded-lg border border-ink-950/10 bg-paper-50">
            {cover.dataUrl ? (
              <img
                alt={cover.altText || `${project.title} 封面`}
                className="aspect-[3/4] w-full object-cover"
                src={cover.dataUrl}
              />
            ) : (
              <div className="flex aspect-[3/4] items-center justify-center p-4 text-center text-xs leading-5 text-ink-700">
                暂无封面
              </div>
            )}
          </div>

          <div className="space-y-3">
            <h2 className="text-base font-semibold text-ink-950">
              上传或生成封面
            </h2>

            <div className="grid gap-2 text-sm text-ink-700 sm:grid-cols-4">
              <InfoBlock compact label="文件名" value={cover.fileName} />
              <InfoBlock compact label="图片类型" value={cover.mimeType} />
              <InfoBlock
                compact
                label="文件大小"
                value={formatCoverImageSize(cover.sizeBytes)}
              />
              <InfoBlock compact label="更新时间" value={cover.updatedAt} />
            </div>

            <form
              action={uploadProjectCover.bind(null, project.id)}
              className="grid gap-3 rounded-lg border border-ink-950/10 bg-paper-50 p-3 xl:grid-cols-[minmax(180px,1fr)_minmax(220px,1.2fr)_auto] xl:items-end"
            >
              <label className="space-y-1.5">
                <span className="text-xs font-semibold text-ink-700">
                  选择封面图片
                </span>
                <input
                  accept={coverImageAcceptAttribute()}
                  className="w-full rounded-md border border-ink-950/15 bg-white px-3 py-2 text-sm text-ink-950"
                  name="coverImage"
                  required
                  type="file"
                />
              </label>
              <label className="space-y-1.5">
                <span className="text-xs font-semibold text-ink-700">
                  封面说明
                </span>
                <input
                  className="min-h-10 w-full rounded-md border border-ink-950/15 bg-white px-3 py-2 text-sm text-ink-950"
                  defaultValue={cover.altText ?? project.title}
                  name="coverAltText"
                  placeholder="用于网站 alt 文本和导入说明"
                />
              </label>
              <div className="flex flex-col gap-2 sm:flex-row xl:flex-col">
                <button
                  className="inline-flex min-h-9 items-center justify-center gap-2 rounded-md bg-ink-950 px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-ink-800"
                  type="submit"
                >
                  <UploadCloud aria-hidden="true" className="h-4 w-4" />
                  {cover.dataUrl ? "替换封面" : "上传封面"}
                </button>
                {cover.dataUrl ? (
                  <button
                    className="inline-flex min-h-9 items-center justify-center gap-2 rounded-md border border-red-300 bg-white px-3 py-1.5 text-sm font-semibold text-red-700 transition hover:bg-red-50"
                    formAction={removeProjectCover.bind(null, project.id)}
                    formNoValidate
                    type="submit"
                  >
                    <Trash2 aria-hidden="true" className="h-4 w-4" />
                    删除
                  </button>
                ) : null}
              </div>
            </form>

            <div className="rounded-lg border border-ink-950/10 bg-paper-50 p-3">
              <div className="flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <h2 className="text-base font-semibold text-ink-950">
                    AI 生成封面候选图
                  </h2>
                  <p className="mt-1 text-xs leading-5 text-ink-700">
                    生成结果只作为候选图展示。点击“采用为封面”后，才会写入项目封面并随 Station Cat 发布包上传。
                  </p>
                </div>
                <Link
                  className="inline-flex min-h-9 items-center justify-center rounded-md border border-ink-950/15 bg-white px-3 py-1.5 text-sm font-semibold text-ink-800 transition hover:bg-paper-100"
                  href="/ai-settings"
                >
                  图片模型设置
                </Link>
              </div>

              <div className="mt-3 grid gap-2 text-sm text-ink-700 sm:grid-cols-2">
                <InfoBlock compact label="图片模型" value={imageSettings.model} />
                <InfoBlock
                  compact
                  label="图片 API"
                  value={
                    imageSettings.hasApiKey
                      ? `${imageSettings.apiBaseUrl} / ${imageSettings.maskedApiKey}`
                      : "未配置"
                  }
                />
              </div>

              {coverImageErrorMessage(resolvedSearchParams?.coverImageError) ? (
                <p className="mt-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm leading-6 text-red-700">
                  {coverImageErrorMessage(resolvedSearchParams?.coverImageError)}
                </p>
              ) : null}

              {!imageSettings.hasApiKey ? (
                <p className="mt-3 rounded-md bg-white px-3 py-2 text-sm leading-6 text-ink-700">
                  未配置图片生成 API Key，暂不能生成新的封面图。你仍然可以上传本机封面。
                </p>
              ) : null}

              <PreserveScrollForm
                action={generateProjectCoverImage.bind(null, project.id)}
                className="mt-4 grid gap-3"
                preserveKey={`cover-image-generation-${project.id}`}
                statusText="已开始生成封面候选图，页面会留在当前位置并自动刷新结果。"
              >
                <label className="space-y-1.5">
                  <span className="text-xs font-semibold text-ink-700">
                    封面提示词
                  </span>
                  <textarea
                    className="min-h-20 w-full rounded-md border border-ink-950/15 bg-white px-3 py-2 text-sm leading-6 text-ink-950"
                    defaultValue={coverPromptDefault}
                    maxLength={3000}
                    name="coverPrompt"
                    placeholder="可复用已有封面提示词，也可以手动改写。"
                  />
                </label>
                <div className="grid gap-3 sm:grid-cols-3">
                  <label className="space-y-1.5">
                    <span className="text-xs font-semibold text-ink-700">
                      用途
                    </span>
                    <select
                      className="min-h-10 w-full rounded-md border border-ink-950/15 bg-white px-3 py-2 text-sm text-ink-950"
                      defaultValue="book_cover"
                      name="coverTarget"
                    >
                      {coverImageTargets.map((target) => (
                        <option key={target.key} value={target.key}>
                          {target.label} / {target.aspectRatio}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="space-y-1.5">
                    <span className="text-xs font-semibold text-ink-700">
                      候选图数量
                    </span>
                    <select
                      className="min-h-10 w-full rounded-md border border-ink-950/15 bg-white px-3 py-2 text-sm text-ink-950"
                      defaultValue="1"
                      name="imageCount"
                    >
                      {[1, 2, 3, 4].map((count) => (
                        <option key={count} value={count}>
                          {count} 张
                        </option>
                      ))}
                    </select>
                  </label>
                  <button
                    className={`inline-flex min-h-10 items-center justify-center gap-2 self-end rounded-md px-3 py-2 text-sm font-semibold transition ${
                      imageSettings.hasApiKey && !hasActiveCoverImageTask
                        ? "bg-ink-950 text-white hover:bg-ink-800"
                        : "cursor-not-allowed border border-ink-950/15 bg-white text-ink-700"
                    }`}
                    disabled={!imageSettings.hasApiKey || hasActiveCoverImageTask}
                    type="submit"
                  >
                    <Sparkles aria-hidden="true" className="h-4 w-4" />
                    {hasActiveCoverImageTask ? "生成中" : "生成候选图"}
                  </button>
                </div>
              </PreserveScrollForm>

              {coverImageTasks.length > 0 ? (
                <details className="mt-4 rounded-lg border border-ink-950/10 bg-white p-3">
                  <summary className="cursor-pointer text-sm font-semibold text-ink-950">
                    最近封面生成任务（{formatNumber(coverImageTasks.length)}）
                  </summary>
                  <div className="mt-3 space-y-3">
                    {coverImageTasks.map((task) => (
                      <CoverImageTaskCard
                        key={task.id}
                        projectId={project.id}
                        projectTitle={project.title}
                        task={task}
                      />
                    ))}
                  </div>
                </details>
              ) : null}
            </div>
          </div>
        </div>
      </section>

      <section className="space-y-5 rounded-lg border border-ink-950/10 bg-white p-5 shadow-panel">
        <div className="flex items-center gap-2 text-sm font-semibold text-signal-600">
          <Globe2 aria-hidden="true" className="h-4 w-4" />
          发布目标与一键发布准备
        </div>
        <div>
          <h2 className="text-base font-semibold text-ink-950">
            Station Cat 全局发布
          </h2>
          <p className="mt-1 text-sm leading-6 text-ink-700">
            这里是推荐使用的主发布入口：API Base URL、Station Cat Publish Token
            和默认发布模式都从本机全局设置读取，所有项目共用同一套网站配置。
          </p>
        </div>

        <article className="rounded-lg border border-signal-600/20 bg-paper-50 p-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-ink-700">
                <span className="rounded-md bg-white px-2.5 py-1">
                  本机全局配置
                </span>
                <span>{publishModeLabel(stationCatSettings.defaultMode)}</span>
                <span>
                  Token：
                  {stationCatSettings.hasToken
                    ? stationCatSettings.maskedToken
                    : "未配置"}
                </span>
              </div>
              <h3 className="mt-2 text-lg font-semibold text-ink-950">
                发送到 Station Cat
              </h3>
              <p className="mt-1 break-all text-sm text-ink-700">
                {stationCatSettings.apiBaseUrl}/api/novelforge/import
              </p>
              <p className="mt-2 text-sm leading-6 text-ink-700">
                全局配置保存在本机设置中，所有项目共用同一套 API Base URL 和
                Station Cat Publish Token。软件会在后台维护一个内部同步记录，用来保存远端 ID、预览链接、发布链接和增量上传状态。
              </p>
            </div>
            <Link
              className="inline-flex min-h-10 items-center justify-center rounded-md border border-ink-950/15 bg-white px-3 py-2 text-sm font-semibold text-ink-800 transition hover:bg-paper-100"
              href="/ai-settings"
            >
              修改全局设置
            </Link>
          </div>

          <form
            action={prepareGlobalStationCatPublishRun.bind(null, project.id)}
            className="mt-4 grid gap-3 rounded-lg border border-ink-950/10 bg-white p-4 lg:grid-cols-[minmax(150px,180px)_minmax(170px,220px)_minmax(220px,1fr)_auto] lg:items-end"
          >
            <PublishRunFormControls
              canSubmit={canUseGlobalStationCat}
              chapters={publishableChapters}
              defaultMode={stationCatSettings.defaultMode}
              disabledMessage="需要先在本机设置中保存 Station Cat Publish Token，才能调用网站导入接口。"
              submitLabel="发送到 Station Cat"
            />
          </form>

          {latestGlobalStationCatRun ? (
            <PublishRunResultCard latestRun={latestGlobalStationCatRun} />
          ) : (
            <div className="mt-4 rounded-lg border border-dashed border-ink-950/20 bg-white p-4 text-sm leading-6 text-ink-700">
              还没有全局发布记录。点击上方按钮后，会在这里显示最近一次同步结果、预览链接、发布链接和本次变更条目。
            </div>
          )}
        </article>

        <details className="rounded-lg border border-ink-950/10 bg-paper-50 p-4">
          <summary className="cursor-pointer text-sm font-semibold text-ink-950">
            高级：项目专属发布目标（可选）
          </summary>
          <p className="mt-2 text-sm leading-6 text-ink-700">
            一般只需要使用上面的全局 Station Cat 发布入口。只有当某个项目要发布到不同网站、测试环境或备用接口时，才需要在这里新增项目专属目标。
          </p>

          <form
            action={savePublishTarget.bind(null, project.id)}
            className="mt-4 grid gap-3 rounded-lg border border-ink-950/10 bg-white p-4 lg:grid-cols-[1fr_1fr_1fr_auto]"
          >
            <label className="space-y-1.5">
              <span className="text-xs font-semibold text-ink-700">目标名称</span>
              <input
                className="min-h-10 w-full rounded-md border border-ink-950/15 bg-white px-3 py-2 text-sm text-ink-950"
                name="name"
                placeholder="备用网站或测试环境"
              />
            </label>
            <label className="space-y-1.5">
              <span className="text-xs font-semibold text-ink-700">目标平台</span>
              <select
                className="min-h-10 w-full rounded-md border border-ink-950/15 bg-white px-3 py-2 text-sm text-ink-950"
                name="platformKey"
                defaultValue="station_cat"
              >
                {publishPlatformOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-1.5">
              <span className="text-xs font-semibold text-ink-700">默认模式</span>
              <select
                className="min-h-10 w-full rounded-md border border-ink-950/15 bg-white px-3 py-2 text-sm text-ink-950"
                name="defaultMode"
                defaultValue="draft"
              >
                {publishModeOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <button
              className="inline-flex min-h-10 items-center justify-center gap-2 self-end rounded-md bg-ink-950 px-3 py-2 text-sm font-semibold text-white transition hover:bg-ink-800"
              type="submit"
            >
              <PackageCheck aria-hidden="true" className="h-4 w-4" />
              新增目标
            </button>
            <label className="space-y-1.5 lg:col-span-2">
              <span className="text-xs font-semibold text-ink-700">
                API Base URL
              </span>
              <input
                className="min-h-10 w-full rounded-md border border-ink-950/15 bg-white px-3 py-2 text-sm text-ink-950"
                name="apiBaseUrl"
                placeholder="https://wwwstationcat.org/api/novelforge"
                type="url"
              />
            </label>
            <label className="space-y-1.5 lg:col-span-2">
              <span className="text-xs font-semibold text-ink-700">
                发布 Token（Station Cat Publish Token）
              </span>
              <input
                autoComplete="off"
                className="min-h-10 w-full rounded-md border border-ink-950/15 bg-white px-3 py-2 text-sm text-ink-950"
                name="token"
                placeholder="与目标网站端 NOVELFORGE_PUBLISH_TOKEN 保持一致"
                type="password"
              />
            </label>
          </form>

          {customPublishTargets.length === 0 ? (
            <div className="mt-4 rounded-lg border border-dashed border-ink-950/20 bg-white p-5 text-sm text-ink-700">
              还没有自定义目标。当前项目会使用全局 Station Cat 配置发布。
            </div>
          ) : (
            <div className="mt-4 grid gap-4">
              {customPublishTargets.map((target) => {
                const latestRun = target.runs[0];
                const canSubmitPublish =
                  target.platformKey !== "station_cat" ||
                  Boolean(target.apiBaseUrl && target.tokenSecret);
                const submitLabel =
                  target.platformKey === "station_cat"
                    ? "发送到 Station Cat"
                    : "一键准备发布";

                return (
                  <article
                    className="rounded-lg border border-ink-950/10 bg-paper-50 p-4"
                    key={target.id}
                  >
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-ink-700">
                        <span className="rounded-md bg-white px-2.5 py-1">
                          {platformLabel(target.platformKey)}
                        </span>
                        <span>{publishModeLabel(target.defaultMode)}</span>
                        <span>Token：{maskPublishToken(target.tokenSecret)}</span>
                      </div>
                      <h3 className="mt-2 text-lg font-semibold text-ink-950">
                        {target.name}
                      </h3>
                      <p className="mt-1 break-all text-sm text-ink-700">
                        {target.apiBaseUrl || "尚未填写 API Base URL"}
                      </p>
                      {target.platformKey === "station_cat" ? (
                        <p className="mt-2 break-all rounded-md border border-ink-950/10 bg-white px-3 py-2 text-xs leading-5 text-ink-700">
                          API 合约：POST{" "}
                          {target.apiBaseUrl
                            ? stationCatEndpointLabel(target.apiBaseUrl)
                            : "/api/novelforge/import"}
                          ，Authorization: Bearer Token。Token 应与网站端
                          NOVELFORGE_PUBLISH_TOKEN 保持一致。
                        </p>
                      ) : null}
                    </div>
                  </div>

                  <form
                    action={savePublishTarget.bind(null, project.id)}
                    className="mt-4 grid gap-3 lg:grid-cols-[1fr_1fr_1fr_auto]"
                  >
                    <input name="targetId" type="hidden" value={target.id} />
                    <label className="space-y-1.5">
                      <span className="text-xs font-semibold text-ink-700">
                        目标名称
                      </span>
                      <input
                        className="min-h-10 w-full rounded-md border border-ink-950/15 bg-white px-3 py-2 text-sm text-ink-950"
                        defaultValue={target.name}
                        name="name"
                      />
                    </label>
                    <label className="space-y-1.5">
                      <span className="text-xs font-semibold text-ink-700">
                        平台
                      </span>
                      <select
                        className="min-h-10 w-full rounded-md border border-ink-950/15 bg-white px-3 py-2 text-sm text-ink-950"
                        defaultValue={target.platformKey}
                        name="platformKey"
                      >
                        {publishPlatformOptions.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="space-y-1.5">
                      <span className="text-xs font-semibold text-ink-700">
                        默认模式
                      </span>
                      <select
                        className="min-h-10 w-full rounded-md border border-ink-950/15 bg-white px-3 py-2 text-sm text-ink-950"
                        defaultValue={target.defaultMode}
                        name="defaultMode"
                      >
                        {publishModeOptions.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </label>
                    <button
                      className="inline-flex min-h-10 items-center justify-center gap-2 self-end rounded-md border border-ink-950/15 bg-white px-3 py-2 text-sm font-semibold text-ink-800 transition hover:bg-paper-100"
                      type="submit"
                    >
                      <KeyRound aria-hidden="true" className="h-4 w-4" />
                      保存目标
                    </button>
                    <label className="space-y-1.5 lg:col-span-2">
                      <span className="text-xs font-semibold text-ink-700">
                        API Base URL
                      </span>
                      <input
                        className="min-h-10 w-full rounded-md border border-ink-950/15 bg-white px-3 py-2 text-sm text-ink-950"
                        defaultValue={target.apiBaseUrl ?? ""}
                        name="apiBaseUrl"
                        type="url"
                      />
                    </label>
                    <label className="space-y-1.5">
                      <span className="text-xs font-semibold text-ink-700">
                        更新 Token
                        {target.platformKey === "station_cat"
                          ? "（Station Cat Publish Token）"
                          : ""}
                      </span>
                      <input
                        autoComplete="off"
                        className="min-h-10 w-full rounded-md border border-ink-950/15 bg-white px-3 py-2 text-sm text-ink-950"
                        name="token"
                        placeholder="留空则保留当前 Token"
                        type="password"
                      />
                    </label>
                    <label className="flex items-center gap-2 self-end rounded-md border border-ink-950/10 bg-white px-3 py-2 text-sm text-ink-700">
                      <input name="clearToken" type="checkbox" />
                      清除 Token
                    </label>
                  </form>

                  <form
                    action={preparePublishRun.bind(null, project.id, target.id)}
                    className="mt-4 grid gap-3 rounded-lg border border-ink-950/10 bg-white p-4 lg:grid-cols-[minmax(150px,180px)_minmax(170px,220px)_minmax(220px,1fr)_auto] lg:items-end"
                  >
                    <PublishRunFormControls
                      canSubmit={canSubmitPublish}
                      chapters={publishableChapters}
                      defaultMode={target.defaultMode}
                      disabledMessage="需要先保存 API Base URL 和 Station Cat Publish Token，才能调用网站导入接口。"
                      submitLabel={submitLabel}
                    />
                  </form>

                  {latestRun ? (
                    <PublishRunResultCard latestRun={latestRun} />
                  ) : null}
                  </article>
                );
              })}
            </div>
          )}
        </details>
      </section>

      <section className="space-y-3 rounded-lg border border-ink-950/10 bg-white p-4 shadow-panel">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="flex items-center gap-2 text-sm font-semibold text-signal-600">
              <Download aria-hidden="true" className="h-4 w-4" />
              项目导出
            </div>
            <h2 className="mt-1 text-base font-semibold text-ink-950">
              Markdown / JSON 本地备份
            </h2>
          </div>
          <p className="max-w-2xl text-xs leading-5 text-ink-700">
            包含项目、设定、角色、章节、结构化记忆、历史发布数据和 AI 任务引用。
          </p>
        </div>

        <div className="grid gap-3 xl:grid-cols-3">
          <CopyExportPanel
            compact
            content={standardPublishPackage}
            filename={`${baseFilename}-standard-publish-package.json`}
            mimeType="application/json;charset=utf-8"
            rows={8}
            title="标准发布包 JSON"
          />
          <CopyExportPanel
            compact
            content={markdownExport}
            filename={`${baseFilename}-project-export.md`}
            rows={8}
            title="项目 Markdown 导出"
          />
          <CopyExportPanel
            compact
            content={jsonExport}
            filename={`${baseFilename}-project-export.json`}
            mimeType="application/json;charset=utf-8"
            rows={8}
            title="项目 JSON 导出"
          />
        </div>
      </section>
    </div>
  );
}

type PublishRunResultRecord = {
  changedItemsJson?: string | null;
  createdAt: Date;
  errorMessage?: string | null;
  mode?: string | null;
  previewUrl?: string | null;
  publishUrl?: string | null;
  resultMessage?: string | null;
  status?: string | null;
};

function PublishRunResultCard({
  latestRun,
}: {
  latestRun: PublishRunResultRecord;
}) {
  const changedItems = parseChangedItems(latestRun.changedItemsJson);

  return (
    <div className="mt-4 rounded-lg border border-ink-950/10 bg-white p-4">
      <div className="flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-sm font-semibold text-ink-950">
            最近结果：{publishModeLabel(latestRun.mode)} /{" "}
            {publishRunStatusLabel(latestRun.status)}
          </p>
          <p className="mt-1 text-sm leading-6 text-ink-700">
            {latestRun.resultMessage || "暂无结果说明。"}
          </p>
          {latestRun.errorMessage ? (
            <p className="mt-1 text-sm leading-6 text-red-700">
              错误：{latestRun.errorMessage}
            </p>
          ) : null}
        </div>
        <div className="text-sm text-ink-700">
          {formatDate(latestRun.createdAt)}
        </div>
      </div>
      <div className="mt-3 grid gap-2 text-sm text-ink-700 lg:grid-cols-2">
        <ResultLink label="预览链接" value={latestRun.previewUrl} />
        <ResultLink label="发布链接" value={latestRun.publishUrl} />
      </div>
      {changedItems.length > 0 ? (
        <div className="mt-3 rounded-md bg-paper-50 p-3">
          <p className="text-xs font-semibold text-ink-700">本次变更条目</p>
          <ul className="mt-2 space-y-1 text-sm text-ink-700">
            {changedItems.slice(0, 8).map((item) => (
              <li key={`${item.localType}:${item.localId}`}>
                {item.changeType === "update" ? "更新" : "新增"}：
                {item.label}
                {item.remoteId ? ` / 远端 ${item.remoteId}` : ""}
                {item.remoteStatus ? ` / ${item.remoteStatus}` : ""}
                {item.remoteMessage ? ` / ${item.remoteMessage}` : ""}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

function InfoTile({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-lg border border-ink-950/10 bg-white p-4 shadow-panel">
      <div className="flex items-center gap-2 text-sm text-ink-700">
        <Icon aria-hidden="true" className="h-4 w-4 text-signal-600" />
        {label}
      </div>
      <p className="mt-2 text-base font-semibold text-ink-950">{value}</p>
    </div>
  );
}

type PublishChapterOption = {
  id: string;
  chapterNumber: number | null;
  title: string;
};

type CoverImageTaskRecord = {
  adoptionState?: string | null;
  createdAt: Date;
  errorMessage?: string | null;
  id: string;
  inputContextSummary?: string | null;
  model?: string | null;
  outputJson?: string | null;
  outputText?: string | null;
  status?: string | null;
};

function PublishRunFormControls({
  canSubmit,
  chapters,
  defaultMode,
  disabledMessage,
  submitLabel,
}: {
  canSubmit: boolean;
  chapters: PublishChapterOption[];
  defaultMode: string;
  disabledMessage: string;
  submitLabel: string;
}) {
  const defaultChapterId = chapters[chapters.length - 1]?.id ?? "";

  return (
    <>
      <label className="space-y-1.5">
        <span className="text-xs font-semibold text-ink-700">本次模式</span>
        <select
          className="min-h-10 w-full rounded-md border border-ink-950/15 bg-white px-3 py-2 text-sm text-ink-950"
          defaultValue={defaultMode}
          name="publishMode"
        >
          {publishModeOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>

      <label className="space-y-1.5">
        <span className="text-xs font-semibold text-ink-700">上传范围</span>
        <select
          className="min-h-10 w-full rounded-md border border-ink-950/15 bg-white px-3 py-2 text-sm text-ink-950"
          defaultValue="all"
          name="uploadScope"
        >
          {publishUploadScopeOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>

      <label className="space-y-1.5">
        <span className="text-xs font-semibold text-ink-700">
          指定章节（选择“指定章节”时生效）
        </span>
        <select
          className="min-h-10 w-full rounded-md border border-ink-950/15 bg-white px-3 py-2 text-sm text-ink-950 disabled:bg-paper-50 disabled:text-ink-600"
          defaultValue={defaultChapterId}
          disabled={chapters.length === 0}
          name="uploadChapterId"
        >
          {chapters.length === 0 ? (
            <option value="">暂无已定稿章节</option>
          ) : (
            chapters.map((chapter) => (
              <option key={chapter.id} value={chapter.id}>
                {chapterOptionLabel(chapter)}
              </option>
            ))
          )}
        </select>
      </label>

      <div className="space-y-2">
        <label className="flex min-h-10 items-center gap-2 rounded-md border border-ink-950/10 bg-paper-50 px-3 py-2 text-sm text-ink-700">
          <input defaultChecked name="onlyChanged" type="checkbox" />
          仅上传变更
        </label>
        <PublishSubmitButton disabled={!canSubmit} idleLabel={submitLabel} />
      </div>

      <p className="text-xs leading-5 text-ink-700 lg:col-span-4">
        默认上传所有变更；选择“指定章节”后，只会把所选章节作为本次变更条目发送，不会连带封面或其他章节。取消“仅上传变更”可强制重传所选范围。
      </p>

      {!canSubmit ? (
        <p className="text-sm leading-6 text-ink-700 lg:col-span-4">
          {disabledMessage}
        </p>
      ) : null}
    </>
  );
}

function CoverImageTaskCard({
  projectId,
  projectTitle,
  task,
}: {
  projectId: string;
  projectTitle: string;
  task: CoverImageTaskRecord;
}) {
  const output = parseCoverImageTaskOutput(task.outputJson);
  const images = output?.images ?? [];
  const canAdopt =
    task.status === "completed" &&
    task.adoptionState === "not_reviewed" &&
    images.length > 0;

  return (
    <article className="rounded-lg border border-ink-950/10 bg-white p-3">
      <div className="flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-ink-700">
            <span className="rounded-md bg-paper-100 px-2 py-0.5">
              {aiTaskStatusLabel(task.status)}
            </span>
            <span className="rounded-md bg-paper-100 px-2 py-0.5">
              {aiTaskAdoptionLabel(task.adoptionState)}
            </span>
            <span>{formatDate(task.createdAt)}</span>
          </div>
          <p className="mt-1.5 text-sm font-semibold text-ink-950">
            {task.model || "未记录模型"} / 封面图生成
          </p>
          <p className="mt-1 line-clamp-2 text-xs leading-5 text-ink-700">
            {task.inputContextSummary || "暂无上下文摘要。"}
          </p>
          {task.outputText ? (
            <p className="mt-1 line-clamp-2 text-xs leading-5 text-ink-700">
              {task.outputText}
            </p>
          ) : null}
          {task.errorMessage ? (
            <p className="mt-1 text-xs leading-5 text-red-700">
              {task.errorMessage}
            </p>
          ) : null}
        </div>

        {canAdopt ? (
          <form action={rejectGeneratedProjectCover.bind(null, projectId, task.id)}>
            <button
              className="inline-flex min-h-9 items-center justify-center gap-2 rounded-md border border-red-300 bg-white px-3 py-1.5 text-sm font-semibold text-red-700 transition hover:bg-red-50"
              type="submit"
            >
              <XCircle aria-hidden="true" className="h-4 w-4" />
              拒绝整组
            </button>
          </form>
        ) : null}
      </div>

      {images.length > 0 ? (
        <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {images.map((image, index) => {
            const previewSrc = coverImagePreviewSrc(projectId, image);
            const canAdoptImage = canAdopt && Boolean(previewSrc);

            return (
              <div
                className="rounded-lg border border-ink-950/10 bg-paper-50 p-2"
                key={`${task.id}:${index}`}
              >
                {previewSrc ? (
                  <img
                    alt={`封面候选图 ${index + 1}`}
                    className="aspect-[2/3] w-full rounded-md bg-white object-cover"
                    src={previewSrc}
                  />
                ) : (
                  <div className="flex aspect-[2/3] items-center justify-center rounded-md bg-white p-3 text-center text-xs text-ink-700">
                    候选图资产不可预览，请重新生成。
                  </div>
                )}
                {image.revisedPrompt ? (
                  <p className="mt-2 line-clamp-3 text-xs leading-5 text-ink-700">
                    {image.revisedPrompt}
                  </p>
                ) : null}
                {canAdoptImage ? (
                  <form
                    action={adoptGeneratedProjectCover.bind(
                      null,
                      projectId,
                      task.id,
                    )}
                    className="mt-3 space-y-2"
                  >
                    <input name="imageIndex" type="hidden" value={index} />
                    <input
                      className="min-h-10 w-full rounded-md border border-ink-950/15 bg-white px-3 py-2 text-sm text-ink-950"
                      defaultValue={projectTitle}
                      name="coverAltText"
                      placeholder="封面说明"
                    />
                    <button
                      className="inline-flex min-h-9 w-full items-center justify-center gap-2 rounded-md bg-ink-950 px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-ink-800"
                      type="submit"
                    >
                      <CheckCircle2 aria-hidden="true" className="h-4 w-4" />
                      采用为封面
                    </button>
                  </form>
                ) : null}
              </div>
            );
          })}
        </div>
      ) : null}
    </article>
  );
}

function InfoBlock({
  compact = false,
  expandable = false,
  label,
  value,
}: {
  compact?: boolean;
  expandable?: boolean;
  label: string;
  value?: string | null;
}) {
  const displayValue = value || "未生成";

  if (compact && expandable && value) {
    return (
      <details className="rounded-lg border border-ink-950/10 bg-paper-50 p-3">
        <summary className="group cursor-pointer list-none">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-semibold text-ink-700">{label}</p>
            <span className="text-[11px] font-semibold text-signal-600 group-open:hidden">
              展开全文
            </span>
            <span className="hidden text-[11px] font-semibold text-signal-600 group-open:inline">
              收起
            </span>
          </div>
          <p className="mt-1 line-clamp-3 whitespace-pre-wrap text-xs leading-5 text-ink-800 group-open:hidden">
            {displayValue}
          </p>
        </summary>
        <p className="mt-2 whitespace-pre-wrap text-xs leading-5 text-ink-800">
          {displayValue}
        </p>
      </details>
    );
  }

  return (
    <div
      className={`rounded-lg border border-ink-950/10 bg-paper-50 ${
        compact ? "p-3" : "p-4"
      }`}
    >
      <p className="text-xs font-semibold text-ink-700">{label}</p>
      <p
        className={`whitespace-pre-wrap text-ink-800 ${
          compact
            ? "mt-1 line-clamp-3 text-xs leading-5"
            : "mt-2 text-sm leading-6"
        }`}
      >
        {displayValue}
      </p>
    </div>
  );
}

function coverImagePreviewSrc(
  projectId: string,
  image: {
  assetPath?: string | null;
  mimeType?: string | null;
},
) {
  if (!image.assetPath || !image.mimeType) {
    return null;
  }

  return `/projects/${projectId}/cover-assets?assetPath=${encodeURIComponent(
    image.assetPath,
  )}`;
}

function coverImageErrorMessage(error?: string | null) {
  if (error === "missingImageApiKey") {
    return "图片生成 API Key 尚未配置，请先到本机接入设置里填写。";
  }

  if (error === "missingGeneratedImage") {
    return "没有找到可采用的封面候选图，请重新生成。";
  }

  if (error === "invalidPrompt") {
    return "封面提示词不能超过 3000 字，请缩短后重新生成。";
  }

  return null;
}

function ResultLink({
  label,
  value,
}: {
  label: string;
  value?: string | null;
}) {
  if (!value) {
    return (
      <div>
        <span className="font-semibold text-ink-950">{label}：</span>
        待网站 API 返回
      </div>
    );
  }

  return (
    <a
      className="inline-flex items-center gap-1 font-semibold text-signal-600 hover:text-signal-500"
      href={value}
      rel="noreferrer"
      target="_blank"
    >
      {label}
      <span className="break-all">{value}</span>
    </a>
  );
}

function parseChangedItems(value?: string | null): {
  localType: string;
  localId: string;
  label: string;
  changeType: string;
  remoteId: string;
  remoteStatus: string;
  remoteMessage: string;
}[] {
  if (!value) {
    return [];
  }

  try {
    const parsed = JSON.parse(value);

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.flatMap((item) => {
      if (!isRecord(item)) {
        return [];
      }

      const localType = stringValue(item.localType);
      const localId = stringValue(item.localId);
      const label = stringValue(item.label);
      const changeType = stringValue(item.changeType);
      const remoteId = stringValue(item.remoteId);
      const remoteStatus = stringValue(item.remoteStatus);
      const remoteMessage = stringValue(item.remoteMessage);

      return localType && localId && label
        ? [{ localType, localId, label, changeType, remoteId, remoteStatus, remoteMessage }]
        : [];
    });
  } catch {
    return [];
  }
}

function publishRunStatusLabel(value?: string | null) {
  if (value === "completed") {
    return "成功";
  }

  if (value === "failed") {
    return "失败";
  }

  return value || "未知";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function stringValue(value: unknown) {
  return typeof value === "string" ? value : "";
}

function chapterOptionLabel(chapter: PublishChapterOption) {
  const numberLabel =
    chapter.chapterNumber == null ? "?" : formatNumber(chapter.chapterNumber);

  return `第 ${numberLabel} 章：${chapter.title}`;
}

function stationCatEndpointLabel(apiBaseUrl: string) {
  try {
    return buildStationCatImportEndpoint(apiBaseUrl);
  } catch {
    return "API Base URL 格式异常，请重新保存目标";
  }
}

function safeFilename(value: string) {
  return (
    value
      .trim()
      .replace(/[\\/:*?"<>|]+/g, "-")
      .replace(/\s+/g, "-")
      .slice(0, 80) || "novelforge-project"
  );
}
