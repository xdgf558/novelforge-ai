import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, History, Pencil, Trash2 } from "lucide-react";
import { deleteChapter } from "@/app/projects/[projectId]/chapters/actions";
import { ChapterSnapshot } from "@/components/chapters/chapter-snapshot";
import { chapterStatusLabel } from "@/lib/chapter-fields";
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
    },
  });

  if (!chapter) {
    notFound();
  }

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
              {chapterStatusLabel(chapter.status)} / {formatNumber(chapter.wordCount)} 字
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

      <ChapterSnapshot values={chapter} />
    </div>
  );
}
