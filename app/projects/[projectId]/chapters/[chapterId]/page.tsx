import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  Bot,
  CheckCircle2,
  History,
  Pencil,
  Sparkles,
  Trash2,
} from "lucide-react";
import {
  adoptChapterBeats,
  deleteChapter,
  generateChapterBeats,
} from "@/app/projects/[projectId]/chapters/actions";
import { ChapterSnapshot } from "@/components/chapters/chapter-snapshot";
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
        },
      },
      aiTasks: {
        where: {
          taskType: "chapter_beat_generation",
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
        take: 5,
      },
    },
  });

  if (!chapter) {
    notFound();
  }

  const hasApiKey = hasConfiguredOpenAIKey();

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
        tasks={chapter.aiTasks}
      />

      <ChapterSnapshot values={chapter} />
    </div>
  );
}

type ChapterBeatTask = {
  id: string;
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
  tasks: readonly ChapterBeatTask[];
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
            生成后会在这里显示最近 5 条任务记录，包含模型、模板版本、状态和输出。
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
