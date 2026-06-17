import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  Bot,
  CheckCircle2,
  History,
  ListChecks,
  Pencil,
  Sparkles,
  Trash2,
} from "lucide-react";
import {
  adoptChapterDraft,
  adoptChapterBeats,
  deleteChapter,
  generateChapterDraft,
  generateChapterBeats,
  generateChapterSummary,
} from "@/app/projects/[projectId]/chapters/actions";
import { generatePendingUpdates } from "@/app/projects/[projectId]/pending-updates/actions";
import { ChapterSnapshot } from "@/components/chapters/chapter-snapshot";
import { hasConfirmedChapterBeats } from "@/lib/ai/chapter-drafts";
import { hasConfirmedChapterText } from "@/lib/ai/chapter-summaries";
import {
  aiTaskAdoptionLabel,
  aiTaskStatusLabel,
  isActiveAiTaskStatus,
} from "@/lib/ai/status";
import { chapterStatusLabel, formatChapterWordCount } from "@/lib/chapter-fields";
import { hasConfiguredOpenAIKey } from "@/lib/ai/openai-client";
import { formatDate, formatNumber } from "@/lib/format";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type ChapterPageProps = {
  params: Promise<{
    projectId: string;
    chapterId: string;
  }>;
};

export default async function ChapterPage({ params }: ChapterPageProps) {
  const { projectId, chapterId } = await params;
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
        },
      },
      aiTasks: {
        where: {
          taskType: {
            in: [
              "chapter_beat_generation",
              "chapter_draft_generation",
              "chapter_summary_extraction",
              "pending_update_extraction",
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
    },
  });

  if (!chapter) {
    notFound();
  }

  const hasApiKey = hasConfiguredOpenAIKey();
  const beatTasks = chapter.aiTasks.filter(
    (task) => task.taskType === "chapter_beat_generation",
  );
  const draftTasks = chapter.aiTasks.filter(
    (task) => task.taskType === "chapter_draft_generation",
  );
  const summaryTasks = chapter.aiTasks.filter(
    (task) => task.taskType === "chapter_summary_extraction",
  );
  const pendingUpdateTasks = chapter.aiTasks.filter(
    (task) => task.taskType === "pending_update_extraction",
  );
  const hasConfirmedBeats = hasConfirmedChapterBeats(chapter);
  const hasConfirmedText = hasConfirmedChapterText(chapter);

  return (
    <div className="space-y-6">
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

      <ChapterBeatAiPanel
        chapterId={chapter.id}
        hasApiKey={hasApiKey}
        projectId={chapter.project.id}
        tasks={beatTasks}
      />

      <ChapterDraftAiPanel
        chapterId={chapter.id}
        hasApiKey={hasApiKey}
        hasConfirmedBeats={hasConfirmedBeats}
        projectId={chapter.project.id}
        tasks={draftTasks}
      />

      <ChapterSummaryAiPanel
        chapterId={chapter.id}
        hasApiKey={hasApiKey}
        hasConfirmedText={hasConfirmedText}
        projectId={chapter.project.id}
        tasks={summaryTasks}
      />

      <ChapterPendingUpdatePanel
        chapterId={chapter.id}
        hasApiKey={hasApiKey}
        hasConfirmedText={hasConfirmedText}
        pendingUpdateCount={chapter._count.pendingUpdates}
        projectId={chapter.project.id}
        tasks={pendingUpdateTasks}
      />

      <ChapterSnapshot values={chapter} />
    </div>
  );
}

type ChapterAiTask = {
  id: string;
  taskType: string;
  status: string;
  adoptionState: string;
  inputContextSummary: string;
  outputText: string | null;
  errorMessage: string | null;
  model: string;
  createdAt: Date;
  promptTemplate: {
    name: string;
    version: number;
  } | null;
};

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

        <form action={generateChapterBeats.bind(null, projectId, chapterId)}>
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
        </form>
      </div>

      {!hasApiKey ? (
        <p className="mt-4 rounded-md bg-paper-50 px-3 py-2 text-sm text-ink-700">
          未配置 API Key，暂不能调用模型；已有任务记录仍可查看和采用。
        </p>
      ) : null}

      {hasActiveGeneration ? (
        <p className="mt-4 rounded-md bg-paper-50 px-3 py-2 text-sm text-ink-700">
          当前章节已有节拍生成任务进行中，完成前不会重复发起新的模型调用。
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

        <form action={generateChapterDraft.bind(null, projectId, chapterId)}>
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
        </form>
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
          当前章节已有草稿生成任务进行中，完成前不会重复发起新的模型调用。
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

        <form action={generateChapterSummary.bind(null, projectId, chapterId)}>
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
        </form>
      </div>

      {!hasApiKey ? (
        <p className="mt-4 rounded-md bg-paper-50 px-3 py-2 text-sm text-ink-700">
          未配置 API Key，暂不能调用模型；已有摘要任务仍可查看。
        </p>
      ) : null}

      {!hasConfirmedText ? (
        <p className="mt-4 rounded-md bg-paper-50 px-3 py-2 text-sm text-ink-700">
          生成章节摘要前需要先在定稿正文中保存作者确认后的章节文本。
        </p>
      ) : null}

      {hasActiveGeneration ? (
        <p className="mt-4 rounded-md bg-paper-50 px-3 py-2 text-sm text-ink-700">
          当前章节已有摘要生成任务进行中，完成前不会重复发起新的模型调用。
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

        <form action={generatePendingUpdates.bind(null, projectId, chapterId)}>
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
        </form>
      </div>

      {!hasApiKey ? (
        <p className="mt-4 rounded-md bg-paper-50 px-3 py-2 text-sm text-ink-700">
          未配置 API Key，暂不能调用模型；已有待审核更新仍可在列表页查看。
        </p>
      ) : null}

      {!hasConfirmedText ? (
        <p className="mt-4 rounded-md bg-paper-50 px-3 py-2 text-sm text-ink-700">
          提取待审核更新前需要先保存作者确认后的定稿正文。
        </p>
      ) : null}

      {hasActiveGeneration ? (
        <p className="mt-4 rounded-md bg-paper-50 px-3 py-2 text-sm text-ink-700">
          当前章节已有待更新提取任务进行中，完成前不会重复发起新的模型调用。
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
