import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  BarChart3,
  Bot,
  CheckCircle2,
  GitBranch,
  History,
  ListChecks,
  Pencil,
  RefreshCw,
  ShieldAlert,
  Sparkles,
  Trash2,
} from "lucide-react";
import {
  adoptChapterDraft,
  adoptChapterBeats,
  adoptChapterPolish,
  deleteChapter,
  fetchChapterReaderFeedback,
  generateChapterDraft,
  generateChapterBeats,
  generateChapterPolish,
  generateChapterSummary,
  updateChapterReaderRemoteId,
} from "@/app/projects/[projectId]/chapters/actions";
import { generateContinuityReport } from "@/app/projects/[projectId]/continuity/actions";
import { generatePendingUpdates } from "@/app/projects/[projectId]/pending-updates/actions";
import { AutoRefresh } from "@/components/auto-refresh";
import { AiBudgetNotice } from "@/components/ai/ai-budget-notice";
import { ChapterSnapshot } from "@/components/chapters/chapter-snapshot";
import { PreserveScrollForm } from "@/components/preserve-scroll-form";
import { hasConfirmedChapterBeats } from "@/lib/ai/chapter-drafts";
import {
  hasPolishableChapterText,
  isExcerptedChapterPolishInputJson,
  isSegmentedChapterPolishInputJson,
} from "@/lib/ai/chapter-polishes";
import { hasConfirmedChapterText } from "@/lib/ai/chapter-summaries";
import type { ReaderFeedbackSignal } from "@/lib/ai/reader-feedback-context";
import { loadReaderFeedbackSignalsForChapterGeneration } from "@/lib/ai/reader-feedback-signal-store";
import {
  activeAiTaskStatuses,
  aiTaskAdoptionLabel,
  aiTaskStatusLabel,
  isActiveAiTaskStatus,
} from "@/lib/ai/status";
import {
  staleAiTaskCutoff,
  staleAiTaskErrorMessage,
} from "@/lib/ai/task-timeouts";
import { chapterStatusLabel, formatChapterWordCount } from "@/lib/chapter-fields";
import { hasConfiguredOpenAIKey } from "@/lib/ai/openai-client";
import { getAiRuntimeEnvForTaskType } from "@/lib/ai/local-config";
import { formatDate, formatNumber } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import {
  storylineStatusLabel,
  storylineTypeLabel,
} from "@/lib/storyline-fields";

export const dynamic = "force-dynamic";

type ChapterPageProps = {
  params: Promise<{
    projectId: string;
    chapterId: string;
  }>;
  searchParams?: Promise<{
    polishError?: string;
    readerFeedbackError?: string;
    readerFeedbackMessage?: string;
    readerFeedbackSaved?: string;
  }>;
};

export default async function ChapterPage({
  params,
  searchParams,
}: ChapterPageProps) {
  const { projectId, chapterId } = await params;
  const {
    polishError,
    readerFeedbackError,
    readerFeedbackMessage,
    readerFeedbackSaved,
  } = (await searchParams) ?? {};
  await expireStaleChapterAiTasks(projectId, chapterId);

  const chapter = await prisma.chapter.findFirst({
    where: {
      id: chapterId,
      projectId,
    },
    include: {
      project: true,
      _count: {
        select: {
          versions: true,
          pendingUpdates: true,
          continuityReports: true,
        },
      },
      readerAnalytics: {
        orderBy: {
          fetchedAt: "desc",
        },
        take: 1,
      },
      readerInsights: {
        orderBy: {
          fetchedAt: "desc",
        },
        take: 1,
      },
      aiTasks: {
        where: {
          taskType: {
            in: [
              "chapter_beat_generation",
              "chapter_draft_generation",
              "chapter_polish_generation",
              "chapter_summary_extraction",
              "pending_update_extraction",
              "continuity_check",
            ],
          },
        },
        include: {
          promptTemplate: {
            select: {
              name: true,
              version: true,
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
        take: 15,
      },
      storylineChapters: {
        include: {
          storyline: {
            select: {
              id: true,
              name: true,
              type: true,
              status: true,
              coreGoal: true,
              currentProgress: true,
            },
          },
        },
        orderBy: {
          createdAt: "asc",
        },
      },
    },
  });

  if (!chapter) {
    notFound();
  }

  const hasDefaultApiKey = hasConfiguredOpenAIKey();
  const hasDraftApiKey = hasConfiguredOpenAIKey(
    getAiRuntimeEnvForTaskType("chapter_draft_generation"),
  );
  const hasPolishApiKey = hasConfiguredOpenAIKey(
    getAiRuntimeEnvForTaskType("chapter_polish_generation"),
  );
  const beatTasks = chapter.aiTasks.filter(
    (task) => task.taskType === "chapter_beat_generation",
  );
  const draftTasks = chapter.aiTasks.filter(
    (task) => task.taskType === "chapter_draft_generation",
  );
  const polishTasks = chapter.aiTasks.filter(
    (task) => task.taskType === "chapter_polish_generation",
  );
  const summaryTasks = chapter.aiTasks.filter(
    (task) => task.taskType === "chapter_summary_extraction",
  );
  const pendingUpdateTasks = chapter.aiTasks.filter(
    (task) => task.taskType === "pending_update_extraction",
  );
  const continuityTasks = chapter.aiTasks.filter(
    (task) => task.taskType === "continuity_check",
  );
  const hasConfirmedBeats = hasConfirmedChapterBeats(chapter);
  const hasPolishableText = hasPolishableChapterText(chapter);
  const hasConfirmedText = hasConfirmedChapterText(chapter);
  const hasActiveAiTasks = chapter.aiTasks.some((task) =>
    isActiveAiTaskStatus(task.status),
  );
  const [stationCatSyncState, generationFeedbackSignals] = await Promise.all([
    prisma.publishSyncState.findFirst({
      where: {
        projectId: chapter.project.id,
        localType: "chapter",
        localId: chapter.id,
        remoteId: {
          not: null,
        },
        target: {
          platformKey: "station_cat",
          status: "active",
        },
      },
      orderBy: [
        {
          lastSyncedAt: "desc",
        },
        {
          updatedAt: "desc",
        },
      ],
      select: {
        remoteId: true,
        lastSyncedAt: true,
        target: {
          select: {
            name: true,
          },
        },
      },
    }),
    loadReaderFeedbackSignalsForChapterGeneration({
      projectId: chapter.project.id,
      beforeChapterNumber: chapter.chapterNumber,
    }),
  ]);
  const readerRemoteId =
    chapter.readerRemoteId?.trim() || stationCatSyncState?.remoteId?.trim() || "";

  return (
    <div className="space-y-6">
      <AutoRefresh enabled={hasActiveAiTasks} />

      <Link
        className="inline-flex items-center gap-2 text-sm font-medium text-ink-700 transition hover:text-signal-600"
        href={`/projects/${chapter.project.id}/chapters`}
      >
        <ArrowLeft aria-hidden="true" className="h-4 w-4" />
        返回章节列表
      </Link>

      <header className="rounded-lg border border-ink-950/10 bg-white p-6 shadow-panel">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-sm font-semibold text-signal-600">
              {chapter.project.title} / 第 {formatNumber(chapter.chapterNumber)} 章
            </p>
            <h1 className="mt-2 text-3xl font-semibold tracking-normal text-ink-950">
              {chapter.title}
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-ink-700">
              {chapter.goal || "暂未填写章节目标。"}
            </p>
            <p className="mt-2 text-xs text-ink-700">
              {chapterStatusLabel(chapter.status)} /{" "}
              {formatChapterWordCount(chapter.wordCount)}
              / 最近更新：{formatDate(chapter.updatedAt)}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link
              className="inline-flex min-h-10 items-center gap-2 rounded-md border border-ink-950/15 bg-white px-3 py-2 text-sm font-semibold text-ink-800 transition hover:bg-paper-100"
              href={`/projects/${chapter.project.id}/chapters/${chapter.id}/history`}
            >
              <History aria-hidden="true" className="h-4 w-4" />
              历史 {chapter._count.versions}
            </Link>
            <Link
              className="inline-flex min-h-10 items-center gap-2 rounded-md border border-ink-950/15 bg-white px-3 py-2 text-sm font-semibold text-ink-800 transition hover:bg-paper-100"
              href={`/projects/${chapter.project.id}/chapters/${chapter.id}/edit`}
            >
              <Pencil aria-hidden="true" className="h-4 w-4" />
              编辑
            </Link>
            <form
              action={deleteChapter.bind(null, chapter.project.id, chapter.id)}
            >
              <button
                className="inline-flex min-h-10 items-center gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-100"
                type="submit"
              >
                <Trash2 aria-hidden="true" className="h-4 w-4" />
                删除
              </button>
            </form>
          </div>
        </div>
      </header>

      <AiBudgetNotice projectId={chapter.project.id} />

      <ChapterStorylinesPanel
        projectId={chapter.project.id}
        storylines={chapter.storylineChapters.map((item) => item.storyline)}
      />

      <ChapterReaderFeedbackPanel
        chapterId={chapter.id}
        error={readerFeedbackError}
        errorMessage={readerFeedbackMessage}
        latestAnalytics={chapter.readerAnalytics[0] ?? null}
        latestInsight={chapter.readerInsights[0] ?? null}
        generationFeedbackSignals={generationFeedbackSignals}
        projectId={chapter.project.id}
        readerRemoteId={readerRemoteId}
        saved={readerFeedbackSaved === "1"}
        stationCatSyncState={stationCatSyncState}
        storedReaderRemoteId={chapter.readerRemoteId}
      />

      <ChapterBeatAiPanel
        chapterId={chapter.id}
        hasApiKey={hasDefaultApiKey}
        projectId={chapter.project.id}
        tasks={beatTasks}
      />

      <ChapterDraftAiPanel
        chapterId={chapter.id}
        hasApiKey={hasDraftApiKey}
        hasConfirmedBeats={hasConfirmedBeats}
        projectId={chapter.project.id}
        tasks={draftTasks}
      />

      <ChapterPolishAiPanel
        chapterId={chapter.id}
        hasApiKey={hasPolishApiKey}
        hasPolishableText={hasPolishableText}
        polishError={polishError}
        projectId={chapter.project.id}
        tasks={polishTasks}
      />

      <ChapterSummaryAiPanel
        chapterId={chapter.id}
        hasApiKey={hasDefaultApiKey}
        hasConfirmedText={hasConfirmedText}
        projectId={chapter.project.id}
        tasks={summaryTasks}
      />

      <ChapterPendingUpdatePanel
        chapterId={chapter.id}
        hasApiKey={hasDefaultApiKey}
        hasConfirmedText={hasConfirmedText}
        pendingUpdateCount={chapter._count.pendingUpdates}
        projectId={chapter.project.id}
        tasks={pendingUpdateTasks}
      />

      <ChapterContinuityPanel
        chapterId={chapter.id}
        continuityReportCount={chapter._count.continuityReports}
        hasApiKey={hasDefaultApiKey}
        hasConfirmedText={hasConfirmedText}
        projectId={chapter.project.id}
        tasks={continuityTasks}
      />

      <ChapterSnapshot values={chapter} />
    </div>
  );
}

function ChapterStorylinesPanel({
  projectId,
  storylines,
}: {
  projectId: string;
  storylines: readonly {
    id: string;
    name: string;
    type: string;
    status: string;
    coreGoal: string | null;
    currentProgress: string | null;
  }[];
}) {
  return (
    <section className="rounded-lg border border-ink-950/10 bg-white p-4 shadow-panel">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm font-semibold text-signal-600">
            <GitBranch aria-hidden="true" className="h-4 w-4" />
            本章故事线
          </div>
          <h2 className="mt-1.5 text-base font-semibold text-ink-950">
            本章推进了哪些线
          </h2>
          <p className="mt-1 text-xs leading-5 text-ink-700">
            这些关联由作者在多故事线模块中手动维护，后续 AI 生成会读取为参考，不会自动改写。
          </p>
        </div>
        <Link
          className="inline-flex min-h-9 items-center gap-2 rounded-md border border-ink-950/15 bg-white px-3 py-2 text-sm font-semibold text-ink-800 transition hover:bg-paper-100"
          href={`/projects/${projectId}/storylines`}
        >
          <GitBranch aria-hidden="true" className="h-4 w-4" />
          管理故事线
        </Link>
      </div>

      {storylines.length === 0 ? (
        <p className="mt-3 rounded-md bg-paper-50 px-3 py-2 text-sm text-ink-700">
          本章还没有关联故事线。可以在“多故事线”里把本章挂到主线、角色线或伏笔线上。
        </p>
      ) : (
        <div className="mt-3 grid gap-2 md:grid-cols-2">
          {storylines.map((storyline) => (
            <article
              className="rounded-md border border-ink-950/10 bg-paper-50 p-3"
              key={storyline.id}
            >
              <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-ink-700">
                <span className="rounded bg-white px-2 py-0.5">
                  {storylineTypeLabel(storyline.type)}
                </span>
                <span className="rounded bg-white px-2 py-0.5">
                  {storylineStatusLabel(storyline.status)}
                </span>
              </div>
              <h3 className="mt-2 text-sm font-semibold text-ink-950">
                {storyline.name}
              </h3>
              <p className="mt-1 line-clamp-2 text-xs leading-5 text-ink-700">
                {storyline.currentProgress || storyline.coreGoal || "暂未填写进展。"}
              </p>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

async function expireStaleChapterAiTasks(projectId: string, chapterId: string) {
  const now = new Date();
  const cutoff = staleAiTaskCutoff(now);

  await prisma.aiTask.updateMany({
    where: {
      projectId,
      chapterId,
      status: {
        in: [...activeAiTaskStatuses],
      },
      OR: [
        {
          startedAt: {
            lt: cutoff,
          },
        },
        {
          startedAt: null,
          createdAt: {
            lt: cutoff,
          },
        },
      ],
    },
    data: {
      status: "failed",
      errorMessage: staleAiTaskErrorMessage,
      completedAt: now,
    },
  });
}

type ChapterAiTask = {
  id: string;
  taskType: string;
  status: string;
  adoptionState: string;
  inputContextSummary: string;
  inputJson: string | null;
  outputText: string | null;
  errorMessage: string | null;
  model: string;
  createdAt: Date;
  promptTemplate: {
    name: string;
    version: number;
  } | null;
};

type ChapterReaderAnalytics = {
  views: number | null;
  likes: number | null;
  comments: number | null;
  favorites: number | null;
  shares: number | null;
  completionRate: number | null;
  averageReadSeconds: number | null;
  dropOffPoint: string | null;
  engagementScore: number | null;
  rawJson: string;
  fetchedAt: Date;
};

type ChapterReaderInsight = {
  summary: string | null;
  pacing: string | null;
  focus: string | null;
  hookStrategy: string | null;
  riskNotesJson: string | null;
  characterPriorityJson: string | null;
  rawJson: string;
  fetchedAt: Date;
};

type ChapterReaderSyncState = {
  remoteId: string | null;
  lastSyncedAt: Date | null;
  target: {
    name: string;
  };
} | null;

function ChapterReaderFeedbackPanel({
  chapterId,
  error,
  errorMessage,
  generationFeedbackSignals,
  latestAnalytics,
  latestInsight,
  projectId,
  readerRemoteId,
  saved,
  stationCatSyncState,
  storedReaderRemoteId,
}: {
  chapterId: string;
  error?: string;
  errorMessage?: string;
  generationFeedbackSignals: readonly ReaderFeedbackSignal[];
  latestAnalytics: ChapterReaderAnalytics | null;
  latestInsight: ChapterReaderInsight | null;
  projectId: string;
  readerRemoteId: string;
  saved: boolean;
  stationCatSyncState: ChapterReaderSyncState;
  storedReaderRemoteId?: string | null;
}) {
  const canFetch = Boolean(readerRemoteId.trim());
  const errorText =
    error === "missingRemoteId"
      ? "还没有远端章节 ID。请先发布到 Station Cat，或手动填写网站章节 ID。"
      : error === "missingToken"
        ? "Station Cat Token 未配置。请先到本机接入设置里保存发布 Token。"
        : error === "fetchFailed"
          ? `读者反馈拉取失败${errorMessage ? `：${errorMessage}` : "。"}`
          : "";

  return (
    <section
      className="rounded-lg border border-ink-950/10 bg-white p-5 shadow-panel"
      id="reader-feedback"
    >
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm font-semibold text-signal-600">
            <BarChart3 aria-hidden="true" className="h-4 w-4" />
            读者反馈
          </div>
          <h2 className="mt-2 text-base font-semibold text-ink-950">
            从网站拉取章节表现与读者洞察
          </h2>
          <p className="mt-1 max-w-3xl text-sm leading-6 text-ink-700">
            数据只作为下一章规划和作者复盘参考，不会自动修改正文、设定、角色或记忆。
          </p>
        </div>

        <PreserveScrollForm
          action={fetchChapterReaderFeedback.bind(null, projectId, chapterId)}
          preserveKey={`reader-feedback-${projectId}-${chapterId}`}
          statusText="已开始拉取读者反馈，页面会留在当前位置并刷新最新快照。"
        >
          <button
            className={`inline-flex min-h-10 items-center gap-2 rounded-md px-3 py-2 text-sm font-semibold transition ${
              canFetch
                ? "bg-ink-950 text-white hover:bg-ink-800"
                : "cursor-not-allowed border border-ink-950/15 bg-paper-100 text-ink-700"
            }`}
            disabled={!canFetch}
            type="submit"
          >
            <RefreshCw aria-hidden="true" className="h-4 w-4" />
            拉取读者反馈
          </button>
        </PreserveScrollForm>
      </div>

      {saved ? (
        <p className="mt-4 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-800">
          已保存最新读者反馈快照。
        </p>
      ) : null}

      {errorText ? (
        <p className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
          {errorText}
        </p>
      ) : null}

      <div className="mt-5 rounded-lg border border-ink-950/10 bg-paper-50 p-4">
        <form
          action={updateChapterReaderRemoteId.bind(null, projectId, chapterId)}
          className="grid gap-3 lg:grid-cols-[1fr_auto]"
        >
          <label className="block">
            <span className="text-xs font-semibold text-ink-700">
              远端章节 ID
            </span>
            <input
              className="mt-1 w-full rounded-md border border-ink-950/15 bg-white px-3 py-2 text-sm text-ink-950 outline-none transition focus:border-signal-500 focus:ring-2 focus:ring-signal-500/20"
              defaultValue={storedReaderRemoteId ?? stationCatSyncState?.remoteId ?? ""}
              name="readerRemoteId"
              placeholder="发布同步后可自动识别，也可以手动填写网站章节 ID"
            />
          </label>
          <button
            className="inline-flex min-h-10 items-center justify-center self-end rounded-md border border-ink-950/15 bg-white px-3 py-2 text-sm font-semibold text-ink-800 transition hover:bg-paper-100"
            type="submit"
          >
            保存 ID
          </button>
        </form>

        <p className="mt-2 text-xs leading-5 text-ink-700">
          当前使用：{readerRemoteId || "未设置"}
          {stationCatSyncState?.remoteId ? (
            <>
              {" "}
              / 来自 {stationCatSyncState.target.name}
              {stationCatSyncState.lastSyncedAt
                ? `，同步于 ${formatDate(stationCatSyncState.lastSyncedAt)}`
                : ""}
            </>
          ) : null}
        </p>
      </div>

      <div className="mt-5 rounded-lg border border-signal-500/20 bg-signal-50/60 p-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h3 className="text-sm font-semibold text-ink-950">
              当前章生成参考
            </h3>
            <p className="mt-1 text-xs leading-5 text-ink-700">
              生成节拍和草稿时，系统会把最近前序章节的读者反馈压缩成上下文，帮助调整节奏、钩子和角色权重；它不会自动改写正式设定。
            </p>
          </div>
          <span className="rounded-md bg-white px-2.5 py-1 text-xs font-semibold text-ink-700">
            {generationFeedbackSignals.length} 条反馈
          </span>
        </div>
        {generationFeedbackSignals.length > 0 ? (
          <div className="mt-3 grid gap-2 lg:grid-cols-3">
            {generationFeedbackSignals.map((signal) => (
              <div
                className="rounded-md border border-ink-950/10 bg-white px-3 py-2 text-xs leading-5 text-ink-700"
                key={`${signal.chapterNumber}-${signal.fetchedAt?.toISOString() ?? signal.title}`}
              >
                <div className="font-semibold text-ink-950">
                  第 {signal.chapterNumber} 章《{signal.title}》
                </div>
                <div className="mt-1">
                  完成率 {formatRate(signal.completionRate)} / 互动分{" "}
                  {formatMetric(signal.engagementScore)}
                </div>
                <div className="mt-1 line-clamp-2">
                  {signal.focus || signal.hookStrategy || signal.dropOffPoint || "暂无可摘要字段。"}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-3 rounded-md bg-white px-3 py-2 text-sm text-ink-700">
            还没有可用于当前章生成的前序读者反馈。发布并拉取前序章节反馈后，下一章节拍/草稿会自动参考这些信号。
          </p>
        )}
      </div>

      {latestAnalytics || latestInsight ? (
        <div className="mt-5 grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-lg border border-ink-950/10 bg-paper-50 p-4">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-sm font-semibold text-ink-950">章节表现</h3>
              <span className="text-xs text-ink-700">
                {latestAnalytics
                  ? `更新：${formatDate(latestAnalytics.fetchedAt)}`
                  : "暂无数据"}
              </span>
            </div>

            {latestAnalytics ? (
              <>
                <dl className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <ReaderMetric label="阅读量" value={formatMetric(latestAnalytics.views)} />
                  <ReaderMetric
                    label="完成率"
                    value={formatRate(latestAnalytics.completionRate)}
                  />
                  <ReaderMetric
                    label="互动分"
                    value={formatMetric(latestAnalytics.engagementScore)}
                  />
                  <ReaderMetric
                    label="均读时长"
                    value={formatSeconds(latestAnalytics.averageReadSeconds)}
                  />
                  <ReaderMetric label="点赞" value={formatMetric(latestAnalytics.likes)} />
                  <ReaderMetric
                    label="评论"
                    value={formatMetric(latestAnalytics.comments)}
                  />
                  <ReaderMetric
                    label="收藏"
                    value={formatMetric(latestAnalytics.favorites)}
                  />
                  <ReaderMetric label="分享" value={formatMetric(latestAnalytics.shares)} />
                </dl>
                <div className="mt-4 rounded-md bg-white px-3 py-2 text-sm leading-6 text-ink-700">
                  <span className="font-semibold text-ink-950">主要流失点：</span>
                  {latestAnalytics.dropOffPoint || "暂未返回。"}
                </div>
                <RawJsonDetails title="查看读者数据原始 JSON" value={latestAnalytics.rawJson} />
              </>
            ) : (
              <p className="mt-4 text-sm text-ink-700">还没有章节表现快照。</p>
            )}
          </div>

          <div className="rounded-lg border border-ink-950/10 bg-paper-50 p-4">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-sm font-semibold text-ink-950">读者洞察</h3>
              <span className="text-xs text-ink-700">
                {latestInsight
                  ? `更新：${formatDate(latestInsight.fetchedAt)}`
                  : "暂无数据"}
              </span>
            </div>

            {latestInsight ? (
              <div className="mt-4 space-y-3">
                <ReaderInsightBlock label="摘要" value={latestInsight.summary} />
                <ReaderInsightBlock label="节奏" value={latestInsight.pacing} />
                <ReaderInsightBlock label="读者关注" value={latestInsight.focus} />
                <ReaderInsightBlock
                  label="追更钩子"
                  value={latestInsight.hookStrategy}
                />
                <ReaderInsightBlock
                  label="风险提示"
                  value={formatJsonText(latestInsight.riskNotesJson)}
                />
                <ReaderInsightBlock
                  label="角色优先级"
                  value={formatJsonText(latestInsight.characterPriorityJson)}
                />
                <RawJsonDetails title="查看洞察原始 JSON" value={latestInsight.rawJson} />
              </div>
            ) : (
              <p className="mt-4 text-sm text-ink-700">还没有读者洞察快照。</p>
            )}
          </div>
        </div>
      ) : (
        <div className="mt-5 rounded-lg border border-dashed border-ink-950/20 bg-paper-50 p-5 text-sm text-ink-700">
          <p className="font-semibold text-ink-950">还没有读者反馈快照</p>
          <p className="mt-2 leading-6">
            章节发布到 Station Cat 后，可以拉取网站侧的阅读表现、流失点和读者洞察。第一版只做回流和展示，不把这些内容自动写入下一章。
          </p>
        </div>
      )}
    </section>
  );
}

function ReaderMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-ink-950/10 bg-white px-3 py-2">
      <dt className="text-xs font-semibold text-ink-700">{label}</dt>
      <dd className="mt-1 text-base font-semibold text-ink-950">{value}</dd>
    </div>
  );
}

function ReaderInsightBlock({
  label,
  value,
}: {
  label: string;
  value?: string | null;
}) {
  return (
    <div className="rounded-md bg-white px-3 py-2">
      <div className="text-xs font-semibold text-ink-700">{label}</div>
      <div className="mt-1 whitespace-pre-wrap text-sm leading-6 text-ink-800">
        {value || "暂未返回。"}
      </div>
    </div>
  );
}

function RawJsonDetails({ title, value }: { title: string; value: string }) {
  return (
    <details className="mt-3 rounded-md border border-ink-950/10 bg-white px-3 py-2 text-sm text-ink-700">
      <summary className="cursor-pointer font-semibold text-ink-900">
        {title}
      </summary>
      <pre className="mt-3 max-h-72 overflow-auto whitespace-pre-wrap text-xs leading-5 text-ink-700">
        {value}
      </pre>
    </details>
  );
}

function formatMetric(value?: number | null) {
  return value == null ? "未返回" : formatNumber(value);
}

function formatRate(value?: number | null) {
  return value == null ? "未返回" : `${Math.round(value * 1000) / 10}%`;
}

function formatSeconds(value?: number | null) {
  if (value == null) {
    return "未返回";
  }

  if (value < 60) {
    return `${value} 秒`;
  }

  const minutes = Math.floor(value / 60);
  const seconds = value % 60;
  return seconds ? `${minutes} 分 ${seconds} 秒` : `${minutes} 分`;
}

function formatJsonText(value?: string | null) {
  if (!value) {
    return null;
  }

  try {
    const parsed = JSON.parse(value) as unknown;

    if (Array.isArray(parsed)) {
      return parsed.map((item) => `- ${jsonTextItem(item)}`).join("\n");
    }

    if (parsed && typeof parsed === "object") {
      return Object.entries(parsed as Record<string, unknown>)
        .map(([key, item]) => `${key}：${jsonTextItem(item)}`)
        .join("\n");
    }
  } catch {
    return value;
  }

  return value;
}

function jsonTextItem(value: unknown) {
  if (typeof value === "string") {
    return value;
  }

  if (value == null) {
    return "";
  }

  return JSON.stringify(value);
}

function ChapterBeatAiPanel({
  chapterId,
  hasApiKey,
  projectId,
  tasks,
}: {
  chapterId: string;
  hasApiKey: boolean;
  projectId: string;
  tasks: readonly ChapterAiTask[];
}) {
  const hasActiveGeneration = tasks.some((task) =>
    isActiveAiTaskStatus(task.status),
  );
  const canGenerate = hasApiKey && !hasActiveGeneration;

  return (
    <section className="rounded-lg border border-ink-950/10 bg-white p-5 shadow-panel">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm font-semibold text-signal-600">
            <Bot aria-hidden="true" className="h-4 w-4" />
            AI 章节节拍
          </div>
          <h2 className="mt-2 text-base font-semibold text-ink-950">
            生成并审阅章节节拍草案
          </h2>
          <p className="mt-1 max-w-3xl text-sm leading-6 text-ink-700">
            AI 只生成可审阅草案。点击采用后，结果才会写入章节节拍并保存章节版本。
          </p>
        </div>

        <PreserveScrollForm
          action={generateChapterBeats.bind(null, projectId, chapterId)}
          preserveKey={`chapter-beats-${projectId}-${chapterId}`}
          statusText="已开始生成章节节拍，页面会留在当前位置并自动刷新结果。"
        >
          <button
            className={`inline-flex min-h-10 items-center gap-2 rounded-md px-3 py-2 text-sm font-semibold transition ${
              canGenerate
                ? "bg-ink-950 text-white hover:bg-ink-800"
                : "cursor-not-allowed border border-ink-950/15 bg-paper-100 text-ink-700"
            }`}
            disabled={!canGenerate}
            type="submit"
          >
            <Sparkles aria-hidden="true" className="h-4 w-4" />
            {hasActiveGeneration ? "生成中" : "生成节拍"}
          </button>
        </PreserveScrollForm>
      </div>

      {!hasApiKey ? (
        <p className="mt-4 rounded-md bg-paper-50 px-3 py-2 text-sm text-ink-700">
          未配置 API Key，暂不能调用模型；已有任务记录仍可查看和采用。
        </p>
      ) : null}

      {hasActiveGeneration ? (
        <p className="mt-4 rounded-md bg-paper-50 px-3 py-2 text-sm text-ink-700">
          当前章节已有节拍生成任务在后台运行，页面会自动刷新显示结果，完成前不会重复发起新的模型调用。
        </p>
      ) : null}

      {tasks.length === 0 ? (
        <div className="mt-5 rounded-lg border border-dashed border-ink-950/20 bg-paper-50 p-5 text-sm text-ink-700">
          <p className="font-semibold text-ink-950">还没有节拍草案</p>
          <p className="mt-2 leading-6">
            生成后会在这里显示最近任务记录，包含模型、模板版本、状态和输出。
          </p>
        </div>
      ) : (
        <div className="mt-5 space-y-4">
          {tasks.map((task) => {
            const canAdopt =
              task.status === "completed" &&
              task.adoptionState === "not_reviewed" &&
              Boolean(task.outputText?.trim());

            return (
              <article
                className="rounded-lg border border-ink-950/10 bg-paper-50 p-4"
                key={task.id}
              >
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-ink-700">
                      <span className="rounded-md bg-white px-2.5 py-1">
                        {aiTaskStatusLabel(task.status)}
                      </span>
                      <span className="rounded-md bg-white px-2.5 py-1">
                        {aiTaskAdoptionLabel(task.adoptionState)}
                      </span>
                      <span>{formatDate(task.createdAt)}</span>
                    </div>
                    <p className="mt-2 text-sm font-semibold text-ink-950">
                      {task.model}
                      {task.promptTemplate
                        ? ` / ${task.promptTemplate.name} v${task.promptTemplate.version}`
                        : ""}
                    </p>
                    <p className="mt-1 text-xs text-ink-700">
                      {task.inputContextSummary}
                    </p>
                  </div>

                  {canAdopt ? (
                    <form
                      action={adoptChapterBeats.bind(
                        null,
                        projectId,
                        chapterId,
                        task.id,
                      )}
                    >
                      <button
                        className="inline-flex min-h-10 items-center gap-2 rounded-md border border-ink-950/15 bg-white px-3 py-2 text-sm font-semibold text-ink-800 transition hover:bg-paper-100"
                        type="submit"
                      >
                        <CheckCircle2 aria-hidden="true" className="h-4 w-4" />
                        采用
                      </button>
                    </form>
                  ) : null}
                </div>

                <div className="mt-4 max-h-72 overflow-auto whitespace-pre-wrap rounded-md bg-white p-4 text-sm leading-6 text-ink-700">
                  {task.outputText || task.errorMessage || "任务尚未产生输出。"}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}

function ChapterDraftAiPanel({
  chapterId,
  hasApiKey,
  hasConfirmedBeats,
  projectId,
  tasks,
}: {
  chapterId: string;
  hasApiKey: boolean;
  hasConfirmedBeats: boolean;
  projectId: string;
  tasks: readonly ChapterAiTask[];
}) {
  const hasActiveGeneration = tasks.some((task) =>
    isActiveAiTaskStatus(task.status),
  );
  const canGenerate = hasApiKey && hasConfirmedBeats && !hasActiveGeneration;

  return (
    <section className="rounded-lg border border-ink-950/10 bg-white p-5 shadow-panel">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm font-semibold text-signal-600">
            <Bot aria-hidden="true" className="h-4 w-4" />
            AI 章节草稿
          </div>
          <h2 className="mt-2 text-base font-semibold text-ink-950">
            根据已确认节拍生成章节草稿
          </h2>
          <p className="mt-1 max-w-3xl text-sm leading-6 text-ink-700">
            AI 会按当前章节节拍、文风样例、角色说话规则和上一章结尾生成可审阅草稿。点击采用后，结果才会写入草稿正文。
          </p>
        </div>

        <PreserveScrollForm
          action={generateChapterDraft.bind(null, projectId, chapterId)}
          preserveKey={`chapter-draft-${projectId}-${chapterId}`}
          statusText="已开始生成章节草稿，页面会留在当前位置并自动刷新结果。"
        >
          <button
            className={`inline-flex min-h-10 items-center gap-2 rounded-md px-3 py-2 text-sm font-semibold transition ${
              canGenerate
                ? "bg-ink-950 text-white hover:bg-ink-800"
                : "cursor-not-allowed border border-ink-950/15 bg-paper-100 text-ink-700"
            }`}
            disabled={!canGenerate}
            type="submit"
          >
            <Sparkles aria-hidden="true" className="h-4 w-4" />
            {hasActiveGeneration ? "生成中" : "生成草稿"}
          </button>
        </PreserveScrollForm>
      </div>

      {!hasApiKey ? (
        <p className="mt-4 rounded-md bg-paper-50 px-3 py-2 text-sm text-ink-700">
          未配置 API Key，暂不能调用模型；已有草稿任务仍可查看和采用。
        </p>
      ) : null}

      {!hasConfirmedBeats ? (
        <p className="mt-4 rounded-md bg-paper-50 px-3 py-2 text-sm text-ink-700">
          生成草稿前需要先在章节节拍中保存已确认节拍。
        </p>
      ) : null}

      {hasActiveGeneration ? (
        <p className="mt-4 rounded-md bg-paper-50 px-3 py-2 text-sm text-ink-700">
          当前章节已有草稿生成任务在后台运行，页面会自动刷新显示结果，完成前不会重复发起新的模型调用。
        </p>
      ) : null}

      {tasks.length === 0 ? (
        <div className="mt-5 rounded-lg border border-dashed border-ink-950/20 bg-paper-50 p-5 text-sm text-ink-700">
          <p className="font-semibold text-ink-950">还没有草稿任务</p>
          <p className="mt-2 leading-6">
            生成后会在这里显示最近草稿任务，包含模型、模板版本、状态和输出。
          </p>
        </div>
      ) : (
        <div className="mt-5 space-y-4">
          {tasks.map((task) => {
            const canAdopt =
              task.status === "completed" &&
              task.adoptionState !== "adopted" &&
              Boolean(task.outputText?.trim());

            return (
              <article
                className="rounded-lg border border-ink-950/10 bg-paper-50 p-4"
                key={task.id}
              >
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-ink-700">
                      <span className="rounded-md bg-white px-2.5 py-1">
                        {aiTaskStatusLabel(task.status)}
                      </span>
                      <span className="rounded-md bg-white px-2.5 py-1">
                        {aiTaskAdoptionLabel(task.adoptionState)}
                      </span>
                      <span>{formatDate(task.createdAt)}</span>
                    </div>
                    <p className="mt-2 text-sm font-semibold text-ink-950">
                      {task.model}
                      {task.promptTemplate
                        ? ` / ${task.promptTemplate.name} v${task.promptTemplate.version}`
                        : ""}
                    </p>
                    <p className="mt-1 text-xs text-ink-700">
                      {task.inputContextSummary}
                    </p>
                  </div>

                  {canAdopt ? (
                    <form
                      action={adoptChapterDraft.bind(
                        null,
                        projectId,
                        chapterId,
                        task.id,
                      )}
                    >
                      <button
                        className="inline-flex min-h-10 items-center gap-2 rounded-md border border-ink-950/15 bg-white px-3 py-2 text-sm font-semibold text-ink-800 transition hover:bg-paper-100"
                        type="submit"
                      >
                        <CheckCircle2 aria-hidden="true" className="h-4 w-4" />
                        采用
                      </button>
                    </form>
                  ) : null}
                </div>

                <div className="mt-4 max-h-96 overflow-auto whitespace-pre-wrap rounded-md bg-white p-4 text-sm leading-6 text-ink-700">
                  {task.outputText || task.errorMessage || "任务尚未产生输出。"}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}

function ChapterPolishAiPanel({
  chapterId,
  hasApiKey,
  hasPolishableText,
  polishError,
  projectId,
  tasks,
}: {
  chapterId: string;
  hasApiKey: boolean;
  hasPolishableText: boolean;
  polishError?: string;
  projectId: string;
  tasks: readonly ChapterAiTask[];
}) {
  const hasActiveGeneration = tasks.some((task) =>
    isActiveAiTaskStatus(task.status),
  );
  const canGenerate = hasApiKey && hasPolishableText && !hasActiveGeneration;

  return (
    <section className="rounded-lg border border-ink-950/10 bg-white p-5 shadow-panel">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm font-semibold text-signal-600">
            <Sparkles aria-hidden="true" className="h-4 w-4" />
            AI 正文精修
          </div>
          <h2 className="mt-2 text-base font-semibold text-ink-950">
            精修草稿并生成可定稿正文候选
          </h2>
          <p className="mt-1 max-w-3xl text-sm leading-6 text-ink-700">
            AI 会优先读取当前精修正文，其次读取定稿正文，最后回退到草稿正文，并结合章节目标、节拍、文风和角色说话规则，输出可审阅的精修稿。点击采用后，结果只写入精修正文，仍需作者确认后再定稿。
          </p>
        </div>

        <PreserveScrollForm
          action={generateChapterPolish.bind(null, projectId, chapterId)}
          preserveKey={`chapter-polish-${projectId}-${chapterId}`}
          statusText="已开始生成正文精修稿，页面会留在当前位置并自动刷新结果。"
        >
          <button
            className={`inline-flex min-h-10 items-center gap-2 rounded-md px-3 py-2 text-sm font-semibold transition ${
              canGenerate
                ? "bg-ink-950 text-white hover:bg-ink-800"
                : "cursor-not-allowed border border-ink-950/15 bg-paper-100 text-ink-700"
            }`}
            disabled={!canGenerate}
            type="submit"
          >
            <Sparkles aria-hidden="true" className="h-4 w-4" />
            {hasActiveGeneration ? "精修中" : "生成精修稿"}
          </button>
        </PreserveScrollForm>
      </div>

      {!hasApiKey ? (
        <p className="mt-4 rounded-md bg-paper-50 px-3 py-2 text-sm text-ink-700">
          未配置 API Key，暂不能调用模型；已有精修任务仍可查看和采用。
        </p>
      ) : null}

      {!hasPolishableText ? (
        <div className="mt-4 flex flex-col gap-3 rounded-md bg-paper-50 px-3 py-3 text-sm text-ink-700 sm:flex-row sm:items-center sm:justify-between">
          <p className="leading-6">
            生成精修稿前需要先保存草稿正文。已有精修稿或定稿正文时，也可以再次发起精修。
          </p>
          <Link
            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md border border-ink-950/15 bg-white px-3 py-2 text-sm font-semibold text-ink-800 transition hover:bg-paper-100"
            href={`/projects/${projectId}/chapters/${chapterId}/edit#draftText`}
          >
            <Pencil aria-hidden="true" className="h-4 w-4" />
            去填写草稿正文
          </Link>
        </div>
      ) : null}

      {polishError === "excerptedTaskCannotAdopt" ? (
        <p className="mt-4 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm font-medium text-amber-900">
          该历史精修任务只基于超长正文的首/中/尾摘录，不能直接采用到完整精修正文。重新生成精修稿时，系统会自动改用分段精修。
        </p>
      ) : null}

      {hasActiveGeneration ? (
        <p className="mt-4 rounded-md bg-paper-50 px-3 py-2 text-sm text-ink-700">
          当前章节已有正文精修任务在后台运行，页面会自动刷新显示结果，完成前不会重复发起新的模型调用。
        </p>
      ) : null}

      {tasks.length === 0 ? (
        <div className="mt-5 rounded-lg border border-dashed border-ink-950/20 bg-paper-50 p-5 text-sm text-ink-700">
          <p className="font-semibold text-ink-950">还没有精修任务</p>
          <p className="mt-2 leading-6">
            生成后会在这里显示最近精修任务，包含模型、模板版本、状态和输出。
          </p>
        </div>
      ) : (
        <div className="mt-5 space-y-4">
          {tasks.map((task) => {
            const isExcerpted = isExcerptedChapterPolishInputJson(task.inputJson);
            const isSegmented = isSegmentedChapterPolishInputJson(task.inputJson);
            const canAdopt =
              task.status === "completed" &&
              task.adoptionState === "not_reviewed" &&
              !isExcerpted &&
              Boolean(task.outputText?.trim());

            return (
              <article
                className="rounded-lg border border-ink-950/10 bg-paper-50 p-4"
                key={task.id}
              >
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-ink-700">
                      <span className="rounded-md bg-white px-2.5 py-1">
                        {aiTaskStatusLabel(task.status)}
                      </span>
                      <span className="rounded-md bg-white px-2.5 py-1">
                        {aiTaskAdoptionLabel(task.adoptionState)}
                      </span>
                      <span>{formatDate(task.createdAt)}</span>
                    </div>
                    <p className="mt-2 text-sm font-semibold text-ink-950">
                      {task.model}
                      {task.promptTemplate
                        ? ` / ${task.promptTemplate.name} v${task.promptTemplate.version}`
                        : ""}
                    </p>
                    <p className="mt-1 text-xs text-ink-700">
                      {task.inputContextSummary}
                    </p>
                    {isExcerpted ? (
                      <p className="mt-2 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-xs font-medium leading-5 text-amber-900">
                        超长摘录预览任务：可查看模型建议，但不能直接采用到完整精修正文。
                      </p>
                    ) : null}
                    {isSegmented ? (
                      <p className="mt-2 rounded-md border border-signal-500/30 bg-signal-500/10 px-3 py-2 text-xs font-medium leading-5 text-signal-700">
                        自动分段精修任务：系统已按完整正文拆段调用模型，全部完成后会拼接为可采用的精修正文。
                      </p>
                    ) : null}
                  </div>

                  {canAdopt ? (
                    <form
                      action={adoptChapterPolish.bind(
                        null,
                        projectId,
                        chapterId,
                        task.id,
                      )}
                    >
                      <button
                        className="inline-flex min-h-10 items-center gap-2 rounded-md border border-ink-950/15 bg-white px-3 py-2 text-sm font-semibold text-ink-800 transition hover:bg-paper-100"
                        type="submit"
                      >
                        <CheckCircle2 aria-hidden="true" className="h-4 w-4" />
                        采用到精修正文
                      </button>
                    </form>
                  ) : null}
                </div>

                <div className="mt-4 max-h-96 overflow-auto whitespace-pre-wrap rounded-md bg-white p-4 text-sm leading-6 text-ink-700">
                  {task.outputText || task.errorMessage || "任务尚未产生输出。"}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}

function ChapterSummaryAiPanel({
  chapterId,
  hasApiKey,
  hasConfirmedText,
  projectId,
  tasks,
}: {
  chapterId: string;
  hasApiKey: boolean;
  hasConfirmedText: boolean;
  projectId: string;
  tasks: readonly ChapterAiTask[];
}) {
  const hasActiveGeneration = tasks.some((task) =>
    isActiveAiTaskStatus(task.status),
  );
  const canGenerate = hasApiKey && hasConfirmedText && !hasActiveGeneration;

  return (
    <section className="rounded-lg border border-ink-950/10 bg-white p-5 shadow-panel">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm font-semibold text-signal-600">
            <Bot aria-hidden="true" className="h-4 w-4" />
            AI 章节摘要
          </div>
          <h2 className="mt-2 text-base font-semibold text-ink-950">
            从定稿正文提取结构化摘要
          </h2>
          <p className="mt-1 max-w-3xl text-sm leading-6 text-ink-700">
            摘要任务只读取作者确认的定稿正文，输出短摘要、主要事件、角色变化、伏笔和连续性风险。结果先保存在 AI 任务中，不会自动写入正式故事记忆。
          </p>
        </div>

        <PreserveScrollForm
          action={generateChapterSummary.bind(null, projectId, chapterId)}
          preserveKey={`chapter-summary-${projectId}-${chapterId}`}
          statusText="已开始提取章节摘要，页面会留在当前位置并自动刷新结果。"
        >
          <button
            className={`inline-flex min-h-10 items-center gap-2 rounded-md px-3 py-2 text-sm font-semibold transition ${
              canGenerate
                ? "bg-ink-950 text-white hover:bg-ink-800"
                : "cursor-not-allowed border border-ink-950/15 bg-paper-100 text-ink-700"
            }`}
            disabled={!canGenerate}
            type="submit"
          >
            <Sparkles aria-hidden="true" className="h-4 w-4" />
            {hasActiveGeneration ? "生成中" : "生成摘要"}
          </button>
        </PreserveScrollForm>
      </div>

      {!hasApiKey ? (
        <p className="mt-4 rounded-md bg-paper-50 px-3 py-2 text-sm text-ink-700">
          未配置 API Key，暂不能调用模型；已有摘要任务仍可查看。
        </p>
      ) : null}

      {!hasConfirmedText ? (
        <FinalTextRequiredNotice
          actionLabel="生成章节摘要"
          chapterId={chapterId}
          projectId={projectId}
        />
      ) : null}

      {hasActiveGeneration ? (
        <p className="mt-4 rounded-md bg-paper-50 px-3 py-2 text-sm text-ink-700">
          当前章节已有摘要生成任务在后台运行，页面会自动刷新显示结果，完成前不会重复发起新的模型调用。
        </p>
      ) : null}

      {tasks.length === 0 ? (
        <div className="mt-5 rounded-lg border border-dashed border-ink-950/20 bg-paper-50 p-5 text-sm text-ink-700">
          <p className="font-semibold text-ink-950">还没有摘要任务</p>
          <p className="mt-2 leading-6">
            生成后会在这里显示最近摘要任务，包含模型、模板版本、状态和结构化输出。
          </p>
        </div>
      ) : (
        <div className="mt-5 space-y-4">
          {tasks.map((task) => (
            <article
              className="rounded-lg border border-ink-950/10 bg-paper-50 p-4"
              key={task.id}
            >
              <div>
                <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-ink-700">
                  <span className="rounded-md bg-white px-2.5 py-1">
                    {aiTaskStatusLabel(task.status)}
                  </span>
                  <span className="rounded-md bg-white px-2.5 py-1">
                    {aiTaskAdoptionLabel(task.adoptionState)}
                  </span>
                  <span>{formatDate(task.createdAt)}</span>
                </div>
                <p className="mt-2 text-sm font-semibold text-ink-950">
                  {task.model}
                  {task.promptTemplate
                    ? ` / ${task.promptTemplate.name} v${task.promptTemplate.version}`
                    : ""}
                </p>
                <p className="mt-1 text-xs text-ink-700">
                  {task.inputContextSummary}
                </p>
              </div>

              <div className="mt-4 max-h-96 overflow-auto whitespace-pre-wrap rounded-md bg-white p-4 font-mono text-xs leading-6 text-ink-700">
                {task.outputText || task.errorMessage || "任务尚未产生输出。"}
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

function ChapterPendingUpdatePanel({
  chapterId,
  hasApiKey,
  hasConfirmedText,
  pendingUpdateCount,
  projectId,
  tasks,
}: {
  chapterId: string;
  hasApiKey: boolean;
  hasConfirmedText: boolean;
  pendingUpdateCount: number;
  projectId: string;
  tasks: readonly ChapterAiTask[];
}) {
  const hasActiveGeneration = tasks.some((task) =>
    isActiveAiTaskStatus(task.status),
  );
  const canGenerate = hasApiKey && hasConfirmedText && !hasActiveGeneration;

  return (
    <section className="rounded-lg border border-ink-950/10 bg-white p-5 shadow-panel">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm font-semibold text-signal-600">
            <ListChecks aria-hidden="true" className="h-4 w-4" />
            设定更新待确认
          </div>
          <h2 className="mt-2 text-base font-semibold text-ink-950">
            从定稿正文提取待审核记忆变化
          </h2>
          <p className="mt-1 max-w-3xl text-sm leading-6 text-ink-700">
            AI 会比较定稿正文、当前设定、角色档案和章节摘要，只生成待审核更新。作者批准前，不会写入正式故事记忆。
          </p>
          <Link
            className="mt-3 inline-flex text-sm font-semibold text-signal-600 hover:underline"
            href={`/projects/${projectId}/pending-updates`}
          >
            查看待审核更新（{pendingUpdateCount}）
          </Link>
        </div>

        <PreserveScrollForm
          action={generatePendingUpdates.bind(null, projectId, chapterId)}
          preserveKey={`pending-updates-${projectId}-${chapterId}`}
          statusText="已开始提取待审核更新，页面会留在当前位置并自动刷新结果。"
        >
          <button
            className={`inline-flex min-h-10 items-center gap-2 rounded-md px-3 py-2 text-sm font-semibold transition ${
              canGenerate
                ? "bg-ink-950 text-white hover:bg-ink-800"
                : "cursor-not-allowed border border-ink-950/15 bg-paper-100 text-ink-700"
            }`}
            disabled={!canGenerate}
            type="submit"
          >
            <Sparkles aria-hidden="true" className="h-4 w-4" />
            {hasActiveGeneration ? "提取中" : "提取更新"}
          </button>
        </PreserveScrollForm>
      </div>

      {!hasApiKey ? (
        <p className="mt-4 rounded-md bg-paper-50 px-3 py-2 text-sm text-ink-700">
          未配置 API Key，暂不能调用模型；已有待审核更新仍可在列表页查看。
        </p>
      ) : null}

      {!hasConfirmedText ? (
        <FinalTextRequiredNotice
          actionLabel="提取待审核更新"
          chapterId={chapterId}
          projectId={projectId}
        />
      ) : null}

      {hasActiveGeneration ? (
        <p className="mt-4 rounded-md bg-paper-50 px-3 py-2 text-sm text-ink-700">
          当前章节已有待更新提取任务在后台运行，页面会自动刷新显示结果，完成前不会重复发起新的模型调用。
        </p>
      ) : null}

      {tasks.length === 0 ? (
        <div className="mt-5 rounded-lg border border-dashed border-ink-950/20 bg-paper-50 p-5 text-sm text-ink-700">
          <p className="font-semibold text-ink-950">还没有提取任务</p>
          <p className="mt-2 leading-6">
            提取后会生成 AI 任务记录，并把结构化建议写入待审核更新列表。
          </p>
        </div>
      ) : (
        <div className="mt-5 space-y-4">
          {tasks.map((task) => (
            <article
              className="rounded-lg border border-ink-950/10 bg-paper-50 p-4"
              key={task.id}
            >
              <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-ink-700">
                <span className="rounded-md bg-white px-2.5 py-1">
                  {aiTaskStatusLabel(task.status)}
                </span>
                <span className="rounded-md bg-white px-2.5 py-1">
                  {aiTaskAdoptionLabel(task.adoptionState)}
                </span>
                <span>{formatDate(task.createdAt)}</span>
              </div>
              <p className="mt-2 text-sm font-semibold text-ink-950">
                {task.model}
                {task.promptTemplate
                  ? ` / ${task.promptTemplate.name} v${task.promptTemplate.version}`
                  : ""}
              </p>
              <p className="mt-1 text-xs text-ink-700">
                {task.inputContextSummary}
              </p>
              <div className="mt-4 max-h-72 overflow-auto whitespace-pre-wrap rounded-md bg-white p-4 font-mono text-xs leading-6 text-ink-700">
                {task.outputText || task.errorMessage || "任务尚未产生输出。"}
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

function ChapterContinuityPanel({
  chapterId,
  continuityReportCount,
  hasApiKey,
  hasConfirmedText,
  projectId,
  tasks,
}: {
  chapterId: string;
  continuityReportCount: number;
  hasApiKey: boolean;
  hasConfirmedText: boolean;
  projectId: string;
  tasks: readonly ChapterAiTask[];
}) {
  const hasActiveGeneration = tasks.some((task) =>
    isActiveAiTaskStatus(task.status),
  );
  const canGenerate = hasApiKey && hasConfirmedText && !hasActiveGeneration;

  return (
    <section className="rounded-lg border border-ink-950/10 bg-white p-5 shadow-panel">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm font-semibold text-signal-600">
            <ShieldAlert aria-hidden="true" className="h-4 w-4" />
            连续性检查
          </div>
          <h2 className="mt-2 text-base font-semibold text-ink-950">
            检查章节与正式故事记忆的冲突
          </h2>
          <p className="mt-1 max-w-3xl text-sm leading-6 text-ink-700">
            AI 会读取定稿正文、总设定、角色档案、世界规则、时间线、伏笔池和最近摘要，只生成风险报告和修复建议，不会自动修改正式记忆。
          </p>
          <Link
            className="mt-3 inline-flex text-sm font-semibold text-signal-600 hover:underline"
            href={`/projects/${projectId}/continuity`}
          >
            查看连续性报告（{continuityReportCount}）
          </Link>
        </div>

        <PreserveScrollForm
          action={generateContinuityReport.bind(null, projectId, chapterId)}
          preserveKey={`continuity-${projectId}-${chapterId}`}
          statusText="已开始运行连续性检查，页面会留在当前位置并自动刷新结果。"
        >
          <button
            className={`inline-flex min-h-10 items-center gap-2 rounded-md px-3 py-2 text-sm font-semibold transition ${
              canGenerate
                ? "bg-ink-950 text-white hover:bg-ink-800"
                : "cursor-not-allowed border border-ink-950/15 bg-paper-100 text-ink-700"
            }`}
            disabled={!canGenerate}
            type="submit"
          >
            <Sparkles aria-hidden="true" className="h-4 w-4" />
            {hasActiveGeneration ? "检查中" : "运行检查"}
          </button>
        </PreserveScrollForm>
      </div>

      {!hasApiKey ? (
        <p className="mt-4 rounded-md bg-paper-50 px-3 py-2 text-sm text-ink-700">
          未配置 API Key，暂不能调用模型；已有连续性报告仍可在报告页查看。
        </p>
      ) : null}

      {!hasConfirmedText ? (
        <FinalTextRequiredNotice
          actionLabel="运行连续性检查"
          chapterId={chapterId}
          projectId={projectId}
        />
      ) : null}

      {hasActiveGeneration ? (
        <p className="mt-4 rounded-md bg-paper-50 px-3 py-2 text-sm text-ink-700">
          当前章节已有连续性检查任务在后台运行，页面会自动刷新显示结果，完成前不会重复发起新的模型调用。
        </p>
      ) : null}

      {tasks.length === 0 ? (
        <div className="mt-5 rounded-lg border border-dashed border-ink-950/20 bg-paper-50 p-5 text-sm text-ink-700">
          <p className="font-semibold text-ink-950">还没有检查任务</p>
          <p className="mt-2 leading-6">
            检查后会保存 AI 任务记录，并把可解析问题写入连续性报告列表。
          </p>
        </div>
      ) : (
        <div className="mt-5 space-y-4">
          {tasks.map((task) => (
            <article
              className="rounded-lg border border-ink-950/10 bg-paper-50 p-4"
              key={task.id}
            >
              <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-ink-700">
                <span className="rounded-md bg-white px-2.5 py-1">
                  {aiTaskStatusLabel(task.status)}
                </span>
                <span className="rounded-md bg-white px-2.5 py-1">
                  {aiTaskAdoptionLabel(task.adoptionState)}
                </span>
                <span>{formatDate(task.createdAt)}</span>
              </div>
              <p className="mt-2 text-sm font-semibold text-ink-950">
                {task.model}
                {task.promptTemplate
                  ? ` / ${task.promptTemplate.name} v${task.promptTemplate.version}`
                  : ""}
              </p>
              <p className="mt-1 text-xs text-ink-700">
                {task.inputContextSummary}
              </p>
              <div className="mt-4 max-h-72 overflow-auto whitespace-pre-wrap rounded-md bg-white p-4 font-mono text-xs leading-6 text-ink-700">
                {task.outputText || task.errorMessage || "任务尚未产生输出。"}
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

function FinalTextRequiredNotice({
  actionLabel,
  chapterId,
  projectId,
}: {
  actionLabel: string;
  chapterId: string;
  projectId: string;
}) {
  return (
    <div className="mt-4 flex flex-col gap-3 rounded-md bg-paper-50 px-3 py-3 text-sm text-ink-700 sm:flex-row sm:items-center sm:justify-between">
      <p className="leading-6">
        {actionLabel}
        前需要先把作者确认后的正文保存到编辑页的“定稿正文”字段。
      </p>
      <Link
        className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md border border-ink-950/15 bg-white px-3 py-2 text-sm font-semibold text-ink-800 transition hover:bg-paper-100"
        href={`/projects/${projectId}/chapters/${chapterId}/edit#finalText`}
      >
        <Pencil aria-hidden="true" className="h-4 w-4" />
        去填写定稿正文
      </Link>
    </div>
  );
}
