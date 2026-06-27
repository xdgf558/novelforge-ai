import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, FileText, Plus } from "lucide-react";
import { chapterStatusLabel, formatChapterWordCount } from "@/lib/chapter-fields";
import { formatDate, formatNumber } from "@/lib/format";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type ChapterListPageProps = {
  params: Promise<{
    projectId: string;
  }>;
};

export default async function ChapterListPage({ params }: ChapterListPageProps) {
  const { projectId } = await params;
  const project = await prisma.project.findUnique({
    where: {
      id: projectId,
    },
    select: {
      id: true,
      title: true,
    },
  });

  if (!project) {
    notFound();
  }

  const chapters = await prisma.chapter.findMany({
    where: {
      projectId,
    },
    select: {
      id: true,
      chapterNumber: true,
      title: true,
      status: true,
      goal: true,
      wordCount: true,
      updatedAt: true,
      _count: {
        select: {
          versions: true,
        },
      },
    },
    orderBy: [
      {
        chapterNumber: "asc",
      },
      {
        updatedAt: "desc",
      },
    ],
  });
  const recentChapters = chapters.slice(-3);
  const historicalChapters = chapters.slice(0, Math.max(0, chapters.length - 3));
  const renderChapterLink = (chapter: (typeof chapters)[number]) => (
    <Link
      className="group grid gap-3 border-b border-ink-950/10 px-4 py-3 transition last:border-b-0 hover:bg-paper-50/80 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center"
      href={`/projects/${project.id}/chapters/${chapter.id}`}
      key={chapter.id}
    >
      <div className="min-w-0">
        <div className="flex min-w-0 items-center gap-2">
          <p className="shrink-0 text-xs font-semibold text-signal-600">
            第 {formatNumber(chapter.chapterNumber)} 章
          </p>
          <span className="shrink-0 rounded bg-paper-100 px-2 py-0.5 text-[11px] font-semibold text-ink-700">
            {chapterStatusLabel(chapter.status)}
          </span>
          <h2 className="truncate text-base font-semibold text-ink-950 transition group-hover:text-signal-700">
            {chapter.title}
          </h2>
        </div>
        <p className="mt-1 truncate text-sm text-ink-700">
          目标：{chapter.goal || "未设置"}
        </p>
      </div>

      <dl className="grid grid-cols-3 gap-3 text-xs text-ink-700 sm:w-[18rem]">
        <div className="min-w-0">
          <dt>字数</dt>
          <dd className="mt-0.5 truncate font-semibold text-ink-950">
            {formatChapterWordCount(chapter.wordCount)}
          </dd>
        </div>
        <div className="min-w-0">
          <dt>版本</dt>
          <dd className="mt-0.5 truncate font-semibold text-ink-950">
            {chapter._count.versions}
          </dd>
        </div>
        <div className="min-w-0">
          <dt>更新</dt>
          <dd className="mt-0.5 truncate font-semibold text-ink-950">
            {formatDate(chapter.updatedAt)}
          </dd>
        </div>
      </dl>
    </Link>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <Link
            className="mb-4 inline-flex items-center gap-2 text-sm font-medium text-ink-700 transition hover:text-signal-600"
            href={`/projects/${project.id}`}
          >
            <ArrowLeft aria-hidden="true" className="h-4 w-4" />
            返回项目
          </Link>
          <p className="text-sm font-semibold text-signal-600">
            {project.title}
          </p>
          <h1 className="mt-2 text-2xl font-semibold tracking-normal text-ink-950">
            章节编辑器
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-ink-700">
            管理章节目标、节拍、草稿、定稿和版本快照，为后续摘要提取、AI 生成和连续性检查准备稳定素材。
          </p>
        </div>

        <Link
          className="inline-flex min-h-10 items-center gap-2 rounded-md bg-ink-950 px-3 py-2 text-sm font-semibold text-white transition hover:bg-ink-800"
          href={`/projects/${project.id}/chapters/new`}
        >
          <Plus aria-hidden="true" className="h-4 w-4" />
          新建章节
        </Link>
      </div>

      {chapters.length === 0 ? (
        <section className="rounded-lg border border-dashed border-ink-950/20 bg-white/72 p-8 text-center">
          <FileText
            aria-hidden="true"
            className="mx-auto h-8 w-8 text-signal-600"
          />
          <h2 className="mt-4 text-lg font-semibold text-ink-950">
            还没有章节
          </h2>
          <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-ink-700">
            先创建第一章，手动记录章节目标、节拍和正文。每次保存都会留下章节版本快照。
          </p>
          <Link
            className="mt-5 inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-ink-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-ink-800"
            href={`/projects/${project.id}/chapters/new`}
          >
            <Plus aria-hidden="true" className="h-4 w-4" />
            创建第一章
          </Link>
        </section>
      ) : (
        <section className="space-y-3">
          <div className="overflow-hidden rounded-lg border border-ink-950/10 bg-white shadow-panel">
            {recentChapters.map(renderChapterLink)}
          </div>

          {historicalChapters.length > 0 ? (
            <details className="rounded-lg border border-ink-950/10 bg-white/80 p-3 shadow-panel">
              <summary className="cursor-pointer text-sm font-semibold text-ink-950">
                历史章节（已折叠 {formatNumber(historicalChapters.length)} 章）
                <span className="ml-2 text-xs font-normal text-ink-700">
                  展开查看第 {formatNumber(historicalChapters[0].chapterNumber)}-
                  {formatNumber(
                    historicalChapters[historicalChapters.length - 1]
                      .chapterNumber,
                  )} 章
                </span>
              </summary>
              <div className="mt-3 overflow-hidden rounded-lg border border-ink-950/10 bg-white">
                {historicalChapters.map(renderChapterLink)}
              </div>
            </details>
          ) : null}
        </section>
      )}
    </div>
  );
}
