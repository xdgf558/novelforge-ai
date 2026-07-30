import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  Bot,
  CheckCircle2,
  Flag,
  GitBranch,
  History,
  ListChecks,
  Pencil,
  ShieldAlert,
  Sparkles,
  Trash2,
} from "lucide-react";
import {
  adoptChapterDraft,
  adoptChapterBeats,
  adoptChapterPolish,
  deleteChapter,
  generateChapterDraft,
  generateChapterBeats,
  generateChapterPolish,
  generateChapterSummary,
} from "@/app/projects/[projectId]/chapters/actions";
import { generateContinuityReport } from "@/app/projects/[projectId]/continuity/actions";
import { generatePendingUpdates } from "@/app/projects/[projectId]/pending-updates/actions";
import { AutoRefresh } from "@/components/auto-refresh";
import { AiBudgetNotice } from "@/components/ai/ai-budget-notice";
import { ChapterSnapshot } from "@/components/chapters/chapter-snapshot";
import { PreserveScrollForm } from "@/components/preserve-scroll-form";
import { hasConfirmedChapterBeats } from "@/lib/ai/chapter-drafts";
import { chapterPlatformTemplateOptions } from "@/lib/ai/chapter-platform-templates";
import {
  hasPolishableChapterText,
  isExcerptedChapterPolishInputJson,
  isSegmentedChapterPolishInputJson,
} from "@/lib/ai/chapter-polishes";
import { hasConfirmedChapterText } from "@/lib/ai/chapter-summaries";
import {
  continuityCheckTaskReviewLabel,
  pendingUpdateTaskReviewLabel,
} from "@/lib/ai/chapter-task-review";
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
import { aiTaskFinalTextIsStale } from "@/lib/chapters/source-text";
import { hasConfiguredOpenAIKey } from "@/lib/ai/openai-client";
import { getAiRuntimeEnvForTaskType } from "@/lib/ai/local-config";
import {
  findForeshadowRecoveryReminders,
  foreshadowRecoveryReason,
  type ForeshadowRecoveryReminder,
} from "@/lib/foreshadows/recovery-reminders";
import { formatDate, formatNumber } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { isShortStoryProject } from "@/lib/projects/work-types";
import {
  foreshadowImportanceLabel,
  foreshadowStatusLabel,
} from "@/lib/story-memory-fields";
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
  }>;
};

export default async function ChapterPage({
  params,
  searchParams,
}: ChapterPageProps) {
  const { projectId, chapterId } = await params;
  const { polishError } = (await searchParams) ?? {};
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
          continuityReports: true,
        },
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
          pendingUpdates: {
            select: {
              status: true,
            },
          },
          continuityReports: {
            select: {
              status: true,
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

  const shortStoryProject = isShortStoryProject(chapter.project.workType);

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
  const [pendingUpdateReviewCount, foreshadowReminders] = await Promise.all([
    prisma.pendingUpdate.count({
      where: {
        projectId: chapter.project.id,
        chapterId: chapter.id,
        status: "pending",
      },
    }),
    findForeshadowRecoveryReminders({
      projectId: chapter.project.id,
      currentChapterNumber: chapter.chapterNumber,
    }),
  ]);
  return (
    <div className="nf-chapter-workspace space-y-6">
      <AutoRefresh enabled={hasActiveAiTasks} />

      <Link
        className="inline-flex items-center gap-2 text-sm font-medium text-ink-700 transition hover:text-signal-600"
        href={`/projects/${chapter.project.id}/chapters`}
      >
        <ArrowLeft aria-hidden="true" className="h-4 w-4" />
        返回{shortStoryProject ? "写作单元" : "章节"}列表
      </Link>

      <nav className="nf-workflow-nav" aria-label="章节工作流">
        <a href="#chapter-beats">节拍</a>
        <a href="#chapter-draft">草稿</a>
        <a href="#chapter-polish">精修</a>
        <a href="#chapter-summary">摘要</a>
        <a href="#chapter-updates">记忆更新</a>
        <a href="#chapter-continuity">连续性</a>
      </nav>

      <header className="rounded-lg border border-ink-950/10 bg-white p-6 shadow-panel">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-sm font-semibold text-signal-600">
              {chapter.project.title} / {shortStoryProject ? "单元" : "第"}{" "}
              {formatNumber(chapter.chapterNumber)}
              {shortStoryProject ? "" : " 章"}
            </p>
            <h1 className="mt-2 text-3xl font-semibold tracking-normal text-ink-950">
              {chapter.title}
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-ink-700">
              {chapter.goal ||
                `暂未填写${shortStoryProject ? "单元" : "章节"}目标。`}
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

      {shortStoryProject ? null : (
        <ChapterStorylinesPanel
          projectId={chapter.project.id}
          storylines={chapter.storylineChapters.map((item) => item.storyline)}
        />
      )}

      <ChapterBeatAiPanel
        chapterId={chapter.id}
        currentChapterNumber={chapter.chapterNumber}
        foreshadowReminders={foreshadowReminders}
        hasApiKey={hasDefaultApiKey}
        projectId={chapter.project.id}
        tasks={beatTasks}
        unitMode={shortStoryProject}
      />

      <ChapterDraftAiPanel
        chapterId={chapter.id}
        hasApiKey={hasDraftApiKey}
        hasConfirmedBeats={hasConfirmedBeats}
        projectId={chapter.project.id}
        tasks={draftTasks}
        unitMode={shortStoryProject}
      />

      <ChapterPolishAiPanel
        chapterId={chapter.id}
        hasApiKey={hasPolishApiKey}
        hasPolishableText={hasPolishableText}
        polishError={polishError}
        projectId={chapter.project.id}
        tasks={polishTasks}
        unitMode={shortStoryProject}
      />

      <ChapterSummaryAiPanel
        chapterId={chapter.id}
        finalText={chapter.finalText}
        hasApiKey={hasDefaultApiKey}
        hasConfirmedText={hasConfirmedText}
        projectId={chapter.project.id}
        tasks={summaryTasks}
        unitMode={shortStoryProject}
      />

      <ChapterPendingUpdatePanel
        chapterId={chapter.id}
        finalText={chapter.finalText}
        hasApiKey={hasDefaultApiKey}
        hasConfirmedText={hasConfirmedText}
        pendingUpdateCount={pendingUpdateReviewCount}
        projectId={chapter.project.id}
        tasks={pendingUpdateTasks}
        unitMode={shortStoryProject}
      />

      <ChapterContinuityPanel
        chapterId={chapter.id}
        continuityReportCount={chapter._count.continuityReports}
        finalText={chapter.finalText}
        hasApiKey={hasDefaultApiKey}
        hasConfirmedText={hasConfirmedText}
        projectId={chapter.project.id}
        tasks={continuityTasks}
        unitMode={shortStoryProject}
      />

      <ChapterSnapshot values={chapter} workType={chapter.project.workType} />
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
      updatedAt: {
        lt: cutoff,
      },
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
  pendingUpdates: {
    status: string;
  }[];
  continuityReports: {
    status: string;
  }[];
};

function ChapterBeatAiPanel({
  chapterId,
  currentChapterNumber,
  foreshadowReminders,
  hasApiKey,
  projectId,
  tasks,
  unitMode,
}: {
  chapterId: string;
  currentChapterNumber: number;
  foreshadowReminders: readonly ForeshadowRecoveryReminder[];
  hasApiKey: boolean;
  projectId: string;
  tasks: readonly ChapterAiTask[];
  unitMode: boolean;
}) {
  const hasActiveGeneration = tasks.some((task) =>
    isActiveAiTaskStatus(task.status),
  );
  const canGenerate = hasApiKey && !hasActiveGeneration;

  return (
    <section
      className="rounded-lg border border-ink-950/10 bg-white p-5 shadow-panel"
      id="chapter-beats"
    >
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm font-semibold text-signal-600">
            <Bot aria-hidden="true" className="h-4 w-4" />
            AI {unitMode ? "单元" : "章节"}节拍
          </div>
          <h2 className="mt-2 text-base font-semibold text-ink-950">
            生成并审阅{unitMode ? "单元" : "章节"}节拍草案
          </h2>
          <p className="mt-1 max-w-3xl text-sm leading-6 text-ink-700">
            AI 只生成可审阅草案。点击采用后，结果才会写入
            {unitMode ? "单元" : "章节"}节拍并保存版本。
          </p>
        </div>

        <PreserveScrollForm
          action={generateChapterBeats.bind(null, projectId, chapterId)}
          preserveKey={`chapter-beats-${projectId}-${chapterId}`}
          statusText={`已开始生成${unitMode ? "单元" : "章节"}节拍，页面会留在当前位置并自动刷新结果。`}
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
          当前{unitMode ? "单元" : "章节"}已有节拍生成任务在后台运行，页面会自动刷新显示结果，完成前不会重复发起新的模型调用。
        </p>
      ) : null}

      <ForeshadowRecoveryReminderPanel
        currentChapterNumber={currentChapterNumber}
        projectId={projectId}
        reminders={foreshadowReminders}
        unitMode={unitMode}
      />

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

function ForeshadowRecoveryReminderPanel({
  currentChapterNumber,
  projectId,
  reminders,
  unitMode,
}: {
  currentChapterNumber: number;
  projectId: string;
  reminders: readonly ForeshadowRecoveryReminder[];
  unitMode: boolean;
}) {
  return (
    <div className="mt-4 rounded-lg border border-signal-500/20 bg-signal-50/60 p-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm font-semibold text-signal-700">
            <Flag aria-hidden="true" className="h-4 w-4" />
            本{unitMode ? "单元" : "章"}建议处理伏笔
          </div>
          <p className="mt-1 text-xs leading-5 text-ink-700">
            生成节拍时会把这些伏笔交给 AI 安排回收、推进或暂缓理由；不会自动改写伏笔池状态。
          </p>
        </div>
        <Link
          className="inline-flex min-h-9 items-center justify-center rounded-md border border-ink-950/15 bg-white px-3 py-2 text-xs font-semibold text-ink-800 transition hover:bg-paper-100"
          href={`/projects/${projectId}/memory#foreshadows`}
        >
          查看伏笔池
        </Link>
      </div>

      {reminders.length === 0 ? (
        <p className="mt-3 rounded-md bg-white px-3 py-2 text-sm text-ink-700">
          暂无到期或标记需要处理的伏笔。
        </p>
      ) : (
        <div className="mt-3 grid gap-2 lg:grid-cols-2">
          {reminders.map((foreshadow) => (
            <ForeshadowRecoveryReminderItem
              currentChapterNumber={currentChapterNumber}
              foreshadow={foreshadow}
              key={foreshadow.id}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function ForeshadowRecoveryReminderItem({
  currentChapterNumber,
  foreshadow,
}: {
  currentChapterNumber: number;
  foreshadow: ForeshadowRecoveryReminder;
}) {
  const relatedItems = [
    foreshadow.relatedCharacters ? `人物：${foreshadow.relatedCharacters}` : "",
    foreshadow.relatedLocations ? `地点：${foreshadow.relatedLocations}` : "",
    foreshadow.relatedFactions ? `势力：${foreshadow.relatedFactions}` : "",
  ].filter(Boolean);

  return (
    <article className="rounded-md border border-ink-950/10 bg-white px-3 py-2">
      <div className="flex flex-wrap items-center gap-1.5 text-xs font-semibold text-ink-700">
        <span className="rounded bg-paper-100 px-2 py-0.5">
          {foreshadowRecoveryReason(foreshadow, currentChapterNumber)}
        </span>
        <span className="rounded bg-paper-100 px-2 py-0.5">
          {foreshadowStatusLabel(foreshadow.status)}
        </span>
        <span className="rounded bg-paper-100 px-2 py-0.5">
          {foreshadowImportanceLabel(foreshadow.importance)}
        </span>
        {foreshadow.expectedResolveChapter ? (
          <span className="rounded bg-paper-100 px-2 py-0.5">
            预计第 {formatNumber(foreshadow.expectedResolveChapter)} 章
          </span>
        ) : null}
      </div>
      <p className="mt-2 line-clamp-3 text-sm leading-6 text-ink-900">
        {foreshadow.content}
      </p>
      <p className="mt-1 text-xs leading-5 text-ink-700">
        {foreshadow.plantedChapter
          ? `埋设：第 ${formatNumber(
              foreshadow.plantedChapter.chapterNumber,
            )} 章《${foreshadow.plantedChapter.title}》`
          : "埋设章节未指定"}
        {relatedItems.length > 0 ? ` / ${relatedItems.join(" / ")}` : ""}
      </p>
    </article>
  );
}

function ChapterDraftAiPanel({
  chapterId,
  hasApiKey,
  hasConfirmedBeats,
  projectId,
  tasks,
  unitMode,
}: {
  chapterId: string;
  hasApiKey: boolean;
  hasConfirmedBeats: boolean;
  projectId: string;
  tasks: readonly ChapterAiTask[];
  unitMode: boolean;
}) {
  const hasActiveGeneration = tasks.some((task) =>
    isActiveAiTaskStatus(task.status),
  );
  const canGenerate = hasApiKey && hasConfirmedBeats && !hasActiveGeneration;

  return (
    <section
      className="rounded-lg border border-ink-950/10 bg-white p-5 shadow-panel"
      id="chapter-draft"
    >
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm font-semibold text-signal-600">
            <Bot aria-hidden="true" className="h-4 w-4" />
            AI {unitMode ? "单元" : "章节"}草稿
          </div>
          <h2 className="mt-2 text-base font-semibold text-ink-950">
            根据已确认节拍生成{unitMode ? "单元" : "章节"}草稿
          </h2>
          <p className="mt-1 max-w-3xl text-sm leading-6 text-ink-700">
            {unitMode
              ? "AI 会按正式蓝图、单元规划、已确认节拍和前序单元结尾生成连续正文，不会重复开篇承诺或强造章末钩子。点击采用后才会写入草稿正文。"
              : "AI 会按当前章节节拍、文风样例、角色说话规则和上一章结尾生成可审阅草稿。点击采用后，结果才会写入草稿正文。"}
          </p>
        </div>

        <PreserveScrollForm
          action={generateChapterDraft.bind(null, projectId, chapterId)}
          className="flex flex-col gap-3 lg:min-w-56"
          preserveKey={`chapter-draft-${projectId}-${chapterId}`}
          statusText={`已开始生成${unitMode ? "单元" : "章节"}草稿，页面会留在当前位置并自动刷新结果。`}
        >
          {unitMode ? (
            <input name="platformTemplate" type="hidden" value="default" />
          ) : (
          <div className="grid gap-1">
            <label
              className="text-xs font-semibold text-ink-700"
              htmlFor={`chapter-draft-platform-${chapterId}`}
            >
              目标平台
            </label>
            <select
              className="min-h-10 rounded-md border border-ink-950/15 bg-white px-3 py-2 text-sm font-semibold text-ink-900 shadow-sm outline-none transition focus:border-signal-500 focus:ring-2 focus:ring-signal-500/20"
              defaultValue="default"
              id={`chapter-draft-platform-${chapterId}`}
              name="platformTemplate"
            >
              {chapterPlatformTemplateOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <p className="text-xs leading-5 text-ink-600">
              番茄小说会强化开篇钩子、爽点反转、手机阅读段落和章末追读感。
            </p>
          </div>
          )}
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
          生成草稿前需要先在{unitMode ? "单元" : "章节"}节拍中保存已确认节拍。
        </p>
      ) : null}

      {hasActiveGeneration ? (
        <p className="mt-4 rounded-md bg-paper-50 px-3 py-2 text-sm text-ink-700">
          当前{unitMode ? "单元" : "章节"}已有草稿生成任务在后台运行，页面会自动刷新显示结果，完成前不会重复发起新的模型调用。
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
  unitMode,
}: {
  chapterId: string;
  hasApiKey: boolean;
  hasPolishableText: boolean;
  polishError?: string;
  projectId: string;
  tasks: readonly ChapterAiTask[];
  unitMode: boolean;
}) {
  const hasActiveGeneration = tasks.some((task) =>
    isActiveAiTaskStatus(task.status),
  );
  const canGenerate = hasApiKey && hasPolishableText && !hasActiveGeneration;

  return (
    <section
      className="rounded-lg border border-ink-950/10 bg-white p-5 shadow-panel"
      id="chapter-polish"
    >
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
            AI 会优先读取当前精修正文，其次读取定稿正文，最后回退到草稿正文，并结合
            {unitMode ? "正式蓝图、单元规划" : "章节目标、节拍"}
            、文风和角色规则输出可审阅精修稿。点击采用后只写入精修正文，仍需作者确认后再定稿。
          </p>
        </div>

        <PreserveScrollForm
          action={generateChapterPolish.bind(null, projectId, chapterId)}
          className="flex flex-col gap-3 lg:min-w-56"
          preserveKey={`chapter-polish-${projectId}-${chapterId}`}
          statusText="已开始生成正文精修稿，页面会留在当前位置并自动刷新结果。"
        >
          {unitMode ? (
            <input name="platformTemplate" type="hidden" value="default" />
          ) : (
          <div className="grid gap-1">
            <label
              className="text-xs font-semibold text-ink-700"
              htmlFor={`chapter-polish-platform-${chapterId}`}
            >
              目标平台
            </label>
            <select
              className="min-h-10 rounded-md border border-ink-950/15 bg-white px-3 py-2 text-sm font-semibold text-ink-900 shadow-sm outline-none transition focus:border-signal-500 focus:ring-2 focus:ring-signal-500/20"
              defaultValue="default"
              id={`chapter-polish-platform-${chapterId}`}
              name="platformTemplate"
            >
              {chapterPlatformTemplateOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <p className="text-xs leading-5 text-ink-600">
              番茄小说会加强自然网文语感、冲突压力、爽点释放和短段落节奏。
            </p>
          </div>
          )}
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
          当前{unitMode ? "单元" : "章节"}已有正文精修任务在后台运行，页面会自动刷新显示结果，完成前不会重复发起新的模型调用。
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
  finalText,
  hasApiKey,
  hasConfirmedText,
  projectId,
  tasks,
  unitMode,
}: {
  chapterId: string;
  finalText?: string | null;
  hasApiKey: boolean;
  hasConfirmedText: boolean;
  projectId: string;
  tasks: readonly ChapterAiTask[];
  unitMode: boolean;
}) {
  const hasActiveGeneration = tasks.some((task) =>
    isActiveAiTaskStatus(task.status),
  );
  const canGenerate = hasApiKey && hasConfirmedText && !hasActiveGeneration;

  return (
    <section
      className="rounded-lg border border-ink-950/10 bg-white p-5 shadow-panel"
      id="chapter-summary"
    >
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm font-semibold text-signal-600">
            <Bot aria-hidden="true" className="h-4 w-4" />
            AI {unitMode ? "单元" : "章节"}摘要
          </div>
          <h2 className="mt-2 text-base font-semibold text-ink-950">
            从定稿正文提取结构化摘要
          </h2>
          <p className="mt-1 max-w-3xl text-sm leading-6 text-ink-700">
            摘要任务只读取作者确认的定稿正文，输出短摘要、主要事件、角色变化、伏笔和连续性风险。本
            {unitMode ? "单元" : "章"}
            明确推进或兑现的旧伏笔会自动进入待确认列表，作者确认前不会修改正式故事记忆。
          </p>
        </div>

        <PreserveScrollForm
          action={generateChapterSummary.bind(null, projectId, chapterId)}
          preserveKey={`chapter-summary-${projectId}-${chapterId}`}
          statusText={
            "已开始提取" +
            (unitMode ? "单元" : "章节") +
            "摘要，页面会留在当前位置并自动刷新结果。"
          }
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
          actionLabel={"生成" + (unitMode ? "单元" : "章节") + "摘要"}
          chapterId={chapterId}
          projectId={projectId}
        />
      ) : null}

      {hasActiveGeneration ? (
        <p className="mt-4 rounded-md bg-paper-50 px-3 py-2 text-sm text-ink-700">
          当前{unitMode ? "单元" : "章节"}
          已有摘要生成任务在后台运行，页面会自动刷新显示结果，完成前不会重复发起新的模型调用。
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
                    {chapterSummaryTaskReviewLabel(task, finalText)}
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

function chapterSummaryTaskReviewLabel(
  task: ChapterAiTask,
  finalText?: string | null,
) {
  if (task.status === "completed") {
    if (aiTaskFinalTextIsStale(task.inputJson, finalText)) {
      return "来源已过期";
    }

    return "供后续任务参考";
  }

  if (task.status === "failed") {
    return "未生成摘要";
  }

  return aiTaskAdoptionLabel(task.adoptionState);
}

function pendingUpdateExtractionReviewLabel(
  task: ChapterAiTask,
  finalText?: string | null,
) {
  if (task.status === "completed") {
    if (aiTaskFinalTextIsStale(task.inputJson, finalText)) {
      return "来源已过期";
    }

    return pendingUpdateTaskReviewLabel(
      task.pendingUpdates.map((update) => update.status),
    );
  }

  if (task.status === "failed") {
    return "未生成更新";
  }

  return aiTaskAdoptionLabel(task.adoptionState);
}

function continuityCheckReviewLabel(
  task: ChapterAiTask,
  finalText?: string | null,
) {
  if (
    task.status === "completed" &&
    aiTaskFinalTextIsStale(task.inputJson, finalText)
  ) {
    return "来源已过期";
  }

  return continuityCheckTaskReviewLabel(
    task.status,
    task.continuityReports.map((report) => report.status),
    aiTaskAdoptionLabel(task.adoptionState),
  );
}

function ChapterPendingUpdatePanel({
  chapterId,
  finalText,
  hasApiKey,
  hasConfirmedText,
  pendingUpdateCount,
  projectId,
  tasks,
  unitMode,
}: {
  chapterId: string;
  finalText?: string | null;
  hasApiKey: boolean;
  hasConfirmedText: boolean;
  pendingUpdateCount: number;
  projectId: string;
  tasks: readonly ChapterAiTask[];
  unitMode: boolean;
}) {
  const hasActiveGeneration = tasks.some((task) =>
    isActiveAiTaskStatus(task.status),
  );
  const canGenerate = hasApiKey && hasConfirmedText && !hasActiveGeneration;

  return (
    <section
      className="rounded-lg border border-ink-950/10 bg-white p-5 shadow-panel"
      id="chapter-updates"
    >
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
            AI 会比较定稿正文、当前设定、角色档案和
            {unitMode ? "单元" : "章节"}
            摘要，只生成待审核更新。作者批准前，不会写入正式故事记忆。
          </p>
          <Link
            className="mt-3 inline-flex text-sm font-semibold text-signal-600 hover:underline"
            href={`/projects/${projectId}/pending-updates`}
          >
            {pendingUpdateCount > 0
              ? `查看待审核更新（${pendingUpdateCount}）`
              : "查看更新记录"}
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
          当前{unitMode ? "单元" : "章节"}
          已有待更新提取任务在后台运行，页面会自动刷新显示结果，完成前不会重复发起新的模型调用。
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
                  {pendingUpdateExtractionReviewLabel(task, finalText)}
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
  finalText,
  hasApiKey,
  hasConfirmedText,
  projectId,
  tasks,
  unitMode,
}: {
  chapterId: string;
  continuityReportCount: number;
  finalText?: string | null;
  hasApiKey: boolean;
  hasConfirmedText: boolean;
  projectId: string;
  tasks: readonly ChapterAiTask[];
  unitMode: boolean;
}) {
  const hasActiveGeneration = tasks.some((task) =>
    isActiveAiTaskStatus(task.status),
  );
  const canGenerate = hasApiKey && hasConfirmedText && !hasActiveGeneration;

  return (
    <section
      className="rounded-lg border border-ink-950/10 bg-white p-5 shadow-panel"
      id="chapter-continuity"
    >
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm font-semibold text-signal-600">
            <ShieldAlert aria-hidden="true" className="h-4 w-4" />
            连续性检查
          </div>
          <h2 className="mt-2 text-base font-semibold text-ink-950">
            检查{unitMode ? "写作单元" : "章节"}与正式故事记忆的冲突
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
          当前{unitMode ? "单元" : "章节"}
          已有连续性检查任务在后台运行，页面会自动刷新显示结果，完成前不会重复发起新的模型调用。
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
                  {continuityCheckReviewLabel(task, finalText)}
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
