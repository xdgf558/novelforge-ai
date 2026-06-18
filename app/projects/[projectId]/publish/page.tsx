import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  CheckCircle2,
  Download,
  FileJson,
  FileText,
  Globe2,
  type LucideIcon,
  KeyRound,
  PackageCheck,
  Send,
  Sparkles,
  UploadCloud,
} from "lucide-react";
import {
  generatePublishPackage,
  markPublishPackageExported,
  preparePublishRun,
  savePublishTarget,
} from "@/app/projects/[projectId]/publish/actions";
import { CopyExportPanel } from "@/components/copy-export-panel";
import { hasConfiguredOpenAIKey } from "@/lib/ai/openai-client";
import { hasConfirmedChapterText } from "@/lib/ai/chapter-summaries";
import { isActiveAiTaskStatus } from "@/lib/ai/status";
import { formatDate, formatNumber } from "@/lib/format";
import {
  buildPublishMarkdown,
  parseStoredStringList,
  publishPackageStatusLabel,
} from "@/lib/publish-packages";
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
  stringifyStandardPublishPackage,
} from "@/lib/publish-platforms";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type PublishPageProps = {
  params: Promise<{
    projectId: string;
  }>;
};

export default async function PublishPage({ params }: PublishPageProps) {
  const { projectId } = await params;
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
  const exportData = buildExportData(project);
  const markdownExport = buildProjectMarkdownExport(exportData);
  const jsonExport = buildProjectJsonExport(exportData);
  const standardPublishPackage = stringifyStandardPublishPackage(
    buildStandardPublishPackage(exportData),
  );
  const baseFilename = safeFilename(project.title || "novelforge-project");

  return (
    <div className="space-y-6">
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
              Phase 11 / 公众号发布包装
            </p>
            <h1 className="mt-2 text-3xl font-semibold tracking-normal text-ink-950">
              {project.title} 发布与导出
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-ink-700">
              从作者确认的定稿正文生成公众号标题、引导语、互动和 Markdown 发布版；所有内容都只供复制或下载，不会自动发布到公众号。
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
          icon={Send}
          label="发布包装"
          value={`${formatNumber(project._count.publishPackages)} 个`}
        />
        <InfoTile
          icon={FileJson}
          label="AI 任务"
          value={`${formatNumber(project._count.aiTasks)} 条`}
        />
      </section>

      <section className="space-y-5 rounded-lg border border-ink-950/10 bg-white p-5 shadow-panel">
        <div className="flex items-center gap-2 text-sm font-semibold text-signal-600">
          <Globe2 aria-hidden="true" className="h-4 w-4" />
          发布目标与一键发布准备
        </div>
        <div>
          <h2 className="text-base font-semibold text-ink-950">
            目标网站与 Token
          </h2>
          <p className="mt-1 text-sm leading-6 text-ink-700">
            软件端会保存目标站点、Token、默认发布模式，并生成标准发布包与增量变更记录。真实上传等网站后台 API 定稿后接入。
          </p>
        </div>

        <form
          action={savePublishTarget.bind(null, project.id)}
          className="grid gap-3 rounded-lg border border-ink-950/10 bg-paper-50 p-4 lg:grid-cols-[1fr_1fr_1fr_auto]"
        >
          <label className="space-y-1.5">
            <span className="text-xs font-semibold text-ink-700">目标名称</span>
            <input
              className="min-h-10 w-full rounded-md border border-ink-950/15 bg-white px-3 py-2 text-sm text-ink-950"
              name="name"
              placeholder="Station Cat 作品后台"
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
            <span className="text-xs font-semibold text-ink-700">API Base URL</span>
            <input
              className="min-h-10 w-full rounded-md border border-ink-950/15 bg-white px-3 py-2 text-sm text-ink-950"
              name="apiBaseUrl"
              placeholder="https://wwwstationcat.org/api/novelforge"
              type="url"
            />
          </label>
          <label className="space-y-1.5 lg:col-span-2">
            <span className="text-xs font-semibold text-ink-700">发布 Token</span>
            <input
              autoComplete="off"
              className="min-h-10 w-full rounded-md border border-ink-950/15 bg-white px-3 py-2 text-sm text-ink-950"
              name="token"
              placeholder="保存到本机 SQLite，界面不回显明文"
              type="password"
            />
          </label>
        </form>

        {project.publishTargets.length === 0 ? (
          <div className="rounded-lg border border-dashed border-ink-950/20 bg-paper-50 p-5 text-sm text-ink-700">
            还没有发布目标。先新增 Station Cat 或其它目标网站，再生成标准包和增量发布记录。
          </div>
        ) : (
          <div className="grid gap-4">
            {project.publishTargets.map((target) => {
              const latestRun = target.runs[0];
              const changedItems = parseChangedItems(latestRun?.changedItemsJson);

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
                    className="mt-4 flex flex-col gap-3 rounded-lg border border-ink-950/10 bg-white p-4 sm:flex-row sm:items-end"
                  >
                    <label className="space-y-1.5">
                      <span className="text-xs font-semibold text-ink-700">
                        本次模式
                      </span>
                      <select
                        className="min-h-10 min-w-40 rounded-md border border-ink-950/15 bg-white px-3 py-2 text-sm text-ink-950"
                        defaultValue={target.defaultMode}
                        name="publishMode"
                      >
                        {publishModeOptions.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="flex min-h-10 items-center gap-2 rounded-md border border-ink-950/10 bg-paper-50 px-3 py-2 text-sm text-ink-700">
                      <input defaultChecked name="onlyChanged" type="checkbox" />
                      仅上传变更
                    </label>
                    <button
                      className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md bg-ink-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-ink-800"
                      type="submit"
                    >
                      <UploadCloud aria-hidden="true" className="h-4 w-4" />
                      一键准备发布
                    </button>
                  </form>

                  {latestRun ? (
                    <div className="mt-4 rounded-lg border border-ink-950/10 bg-white p-4">
                      <div className="flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
                        <div>
                          <p className="text-sm font-semibold text-ink-950">
                            最近结果：{publishModeLabel(latestRun.mode)}
                          </p>
                          <p className="mt-1 text-sm leading-6 text-ink-700">
                            {latestRun.resultMessage || "暂无结果说明。"}
                          </p>
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
                          <p className="text-xs font-semibold text-ink-700">
                            本次变更条目
                          </p>
                          <ul className="mt-2 space-y-1 text-sm text-ink-700">
                            {changedItems.slice(0, 8).map((item) => (
                              <li key={`${item.localType}:${item.localId}`}>
                                {item.changeType === "update" ? "更新" : "新增"}：
                                {item.label}
                              </li>
                            ))}
                          </ul>
                        </div>
                      ) : null}
                    </div>
                  ) : null}
                </article>
              );
            })}
          </div>
        )}
      </section>

      <section className="rounded-lg border border-ink-950/10 bg-white p-5 shadow-panel">
        <div className="flex items-center gap-2 text-sm font-semibold text-signal-600">
          <Sparkles aria-hidden="true" className="h-4 w-4" />
          生成章节发布包装
        </div>
        <h2 className="mt-2 text-base font-semibold text-ink-950">
          选择已定稿章节
        </h2>
        <p className="mt-1 text-sm leading-6 text-ink-700">
          包装上下文只读取章节定稿正文、项目发布定位、最近标题和章节摘要任务输出。未配置 API Key 时仍可复制/下载已有包装与项目导出。
        </p>

        {!hasApiKey ? (
          <p className="mt-4 rounded-md bg-paper-50 px-3 py-2 text-sm text-ink-700">
            未配置 API Key，暂不能生成新的 AI 发布包装。
          </p>
        ) : null}

        <div className="mt-5 grid gap-3 lg:grid-cols-2">
          {project.chapters.length === 0 ? (
            <div className="rounded-lg border border-dashed border-ink-950/20 bg-paper-50 p-5 text-sm text-ink-700">
              还没有章节。先创建并保存定稿正文后，再生成发布包装。
            </div>
          ) : (
            project.chapters.map((chapter) => {
              const hasFinalText = hasConfirmedChapterText(chapter);
              const hasActiveTask = chapter.aiTasks.some((task) =>
                isActiveAiTaskStatus(task.status),
              );
              const canGenerate = hasApiKey && hasFinalText && !hasActiveTask;

              return (
                <article
                  className="rounded-lg border border-ink-950/10 bg-paper-50 p-4"
                  key={chapter.id}
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className="text-xs font-semibold text-signal-600">
                        第 {formatNumber(chapter.chapterNumber)} 章
                      </p>
                      <Link
                        className="mt-1 block text-sm font-semibold text-ink-950 hover:text-signal-600"
                        href={`/projects/${project.id}/chapters/${chapter.id}`}
                      >
                        {chapter.title}
                      </Link>
                      <p className="mt-1 text-xs text-ink-700">
                        已有发布包装 {chapter._count.publishPackages} 个 /{" "}
                        {hasFinalText ? "已保存定稿" : "缺少定稿正文"}
                      </p>
                    </div>

                    <form
                      action={generatePublishPackage.bind(
                        null,
                        project.id,
                        chapter.id,
                      )}
                    >
                      <button
                        className={`inline-flex min-h-10 items-center gap-2 rounded-md px-3 py-2 text-sm font-semibold transition ${
                          canGenerate
                            ? "bg-ink-950 text-white hover:bg-ink-800"
                            : "cursor-not-allowed border border-ink-950/15 bg-white text-ink-700"
                        }`}
                        disabled={!canGenerate}
                        type="submit"
                      >
                        <Sparkles aria-hidden="true" className="h-4 w-4" />
                        {hasActiveTask ? "生成中" : "生成包装"}
                      </button>
                    </form>
                  </div>
                </article>
              );
            })
          )}
        </div>
      </section>

      <section className="space-y-4">
        <div>
          <div className="flex items-center gap-2 text-sm font-semibold text-signal-600">
            <Send aria-hidden="true" className="h-4 w-4" />
            发布包装记录
          </div>
          <h2 className="mt-2 text-base font-semibold text-ink-950">
            可复制到公众号编辑器的材料
          </h2>
        </div>

        {project.publishPackages.length === 0 ? (
          <div className="rounded-lg border border-dashed border-ink-950/20 bg-white p-6 text-sm text-ink-700 shadow-panel">
            还没有发布包装。选择一个已保存定稿的章节生成后，会在这里显示标题候选、正文 Markdown、封面提示词和发布检查清单。
          </div>
        ) : (
          project.publishPackages.map((publishPackage) => {
            const titleCandidates = parseStoredStringList(
              publishPackage.titleCandidatesJson,
            );
            const checklist = parseStoredStringList(publishPackage.checklistJson);
            const markdownBody =
              publishPackage.markdownBody ||
              buildPublishMarkdown({
                selectedTitle: publishPackage.selectedTitle,
                openingGuide: publishPackage.openingGuide,
                chapterSummary: publishPackage.chapterSummary,
                finalText: publishPackage.chapter.finalText,
                endingQuestion: publishPackage.endingQuestion,
                nextChapterPreview: publishPackage.nextChapterPreview,
                commentGuide: publishPackage.commentGuide,
              });
            const filename = `${baseFilename}-chapter-${publishPackage.chapter.chapterNumber}-publish.md`;

            return (
              <article
                className="rounded-lg border border-ink-950/10 bg-white p-5 shadow-panel"
                key={publishPackage.id}
              >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-ink-700">
                      <span className="rounded-md bg-paper-100 px-2.5 py-1">
                        {publishPackageStatusLabel(publishPackage.status)}
                      </span>
                      <span>
                        第 {formatNumber(publishPackage.chapter.chapterNumber)} 章
                      </span>
                      <span>{formatDate(publishPackage.createdAt)}</span>
                    </div>
                    <h3 className="mt-2 text-lg font-semibold text-ink-950">
                      {publishPackage.selectedTitle || "未选择标题"}
                    </h3>
                    <p className="mt-1 text-sm text-ink-700">
                      {publishPackage.chapter.title}
                    </p>
                  </div>

                  {publishPackage.status !== "exported" ? (
                    <form
                      action={markPublishPackageExported.bind(
                        null,
                        project.id,
                        publishPackage.id,
                      )}
                    >
                      <button
                        className="inline-flex min-h-10 items-center gap-2 rounded-md border border-ink-950/15 bg-white px-3 py-2 text-sm font-semibold text-ink-800 transition hover:bg-paper-100"
                        type="submit"
                      >
                        <CheckCircle2 aria-hidden="true" className="h-4 w-4" />
                        标记已导出
                      </button>
                    </form>
                  ) : null}
                </div>

                <div className="mt-4 grid gap-4 lg:grid-cols-2">
                  <InfoBlock label="开头引导" value={publishPackage.openingGuide} />
                  <InfoBlock label="本章摘要" value={publishPackage.chapterSummary} />
                  <InfoBlock label="互动问题" value={publishPackage.endingQuestion} />
                  <InfoBlock label="下章预告" value={publishPackage.nextChapterPreview} />
                  <InfoBlock label="评论引导" value={publishPackage.commentGuide} />
                  <InfoBlock label="封面提示词" value={publishPackage.coverPrompt} />
                </div>

                {titleCandidates.length > 0 ? (
                  <div className="mt-4 rounded-lg border border-ink-950/10 bg-paper-50 p-4">
                    <h4 className="text-sm font-semibold text-ink-950">
                      标题候选
                    </h4>
                    <ul className="mt-2 list-inside list-disc space-y-1 text-sm text-ink-700">
                      {titleCandidates.map((title) => (
                        <li key={title}>{title}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}

                {checklist.length > 0 ? (
                  <div className="mt-4 rounded-lg border border-ink-950/10 bg-paper-50 p-4">
                    <h4 className="text-sm font-semibold text-ink-950">
                      发布检查清单
                    </h4>
                    <ul className="mt-2 list-inside list-disc space-y-1 text-sm text-ink-700">
                      {checklist.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}

                <div className="mt-4">
                  <CopyExportPanel
                    content={markdownBody}
                    filename={filename}
                    rows={14}
                    title="Markdown 发布版"
                  />
                </div>
              </article>
            );
          })
        )}
      </section>

      <section className="space-y-4 rounded-lg border border-ink-950/10 bg-white p-5 shadow-panel">
        <div className="flex items-center gap-2 text-sm font-semibold text-signal-600">
          <Download aria-hidden="true" className="h-4 w-4" />
          项目导出
        </div>
        <h2 className="text-base font-semibold text-ink-950">
          Markdown / JSON 本地备份
        </h2>
        <p className="text-sm leading-6 text-ink-700">
          导出内容包含项目、设定、角色、章节、结构化记忆、待审更新、连续性报告、发布包装和 AI 任务引用，方便本地备份或转移到其他写作工具。
        </p>

        <div className="grid gap-4 lg:grid-cols-2">
          <CopyExportPanel
            content={standardPublishPackage}
            filename={`${baseFilename}-standard-publish-package.json`}
            mimeType="application/json;charset=utf-8"
            rows={18}
            title="标准发布包 JSON"
          />
          <CopyExportPanel
            content={markdownExport}
            filename={`${baseFilename}-project-export.md`}
            rows={18}
            title="项目 Markdown 导出"
          />
          <CopyExportPanel
            content={jsonExport}
            filename={`${baseFilename}-project-export.json`}
            mimeType="application/json;charset=utf-8"
            rows={18}
            title="项目 JSON 导出"
          />
        </div>
      </section>
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

function InfoBlock({
  label,
  value,
}: {
  label: string;
  value?: string | null;
}) {
  return (
    <div className="rounded-lg border border-ink-950/10 bg-paper-50 p-4">
      <p className="text-xs font-semibold text-ink-700">{label}</p>
      <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-ink-800">
        {value || "未生成"}
      </p>
    </div>
  );
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

      return localType && localId && label
        ? [{ localType, localId, label, changeType }]
        : [];
    });
  } catch {
    return [];
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function stringValue(value: unknown) {
  return typeof value === "string" ? value : "";
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
