import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, FileClock, Pencil } from "lucide-react";
import { formatDate } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { isShortStoryProject } from "@/lib/projects/work-types";

export const dynamic = "force-dynamic";

type ChapterHistoryPageProps = {
  params: Promise<{
    projectId: string;
    chapterId: string;
  }>;
};

export default async function ChapterHistoryPage({
  params,
}: ChapterHistoryPageProps) {
  const { projectId, chapterId } = await params;
  const chapter = await prisma.chapter.findFirst({
    where: {
      id: chapterId,
      projectId,
    },
    include: {
      project: {
        select: {
          id: true,
          title: true,
          workType: true,
        },
      },
      versions: {
        orderBy: {
          versionNumber: "desc",
        },
      },
    },
  });

  if (!chapter) {
    notFound();
  }

  const shortStoryProject = isShortStoryProject(chapter.project.workType);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <Link
            className="mb-4 inline-flex items-center gap-2 text-sm font-medium text-ink-700 transition hover:text-signal-600"
            href={`/projects/${chapter.project.id}/chapters/${chapter.id}`}
          >
            <ArrowLeft aria-hidden="true" className="h-4 w-4" />
            返回{shortStoryProject ? "单元" : "章节"}详情
          </Link>
          <p className="text-sm font-semibold text-signal-600">
            {chapter.project.title}
          </p>
          <h1 className="mt-2 text-2xl font-semibold tracking-normal text-ink-950">
            {chapter.title} 的历史版本
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-ink-700">
            每次保存{shortStoryProject ? "写作单元" : "章节"}都会留下快照，方便追踪目标、节拍、正文和定稿状态变化。
          </p>
        </div>

        <Link
          className="inline-flex min-h-10 items-center gap-2 rounded-md border border-ink-950/15 bg-white px-3 py-2 text-sm font-semibold text-ink-800 transition hover:bg-paper-100"
          href={`/projects/${chapter.project.id}/chapters/${chapter.id}/edit`}
        >
          <Pencil aria-hidden="true" className="h-4 w-4" />
          编辑{shortStoryProject ? "写作单元" : "章节"}
        </Link>
      </div>

      {chapter.versions.length === 0 ? (
        <section className="rounded-lg border border-dashed border-ink-950/20 bg-white/72 p-8 text-center">
          <FileClock
            aria-hidden="true"
            className="mx-auto h-8 w-8 text-signal-600"
          />
          <h2 className="mt-4 text-lg font-semibold text-ink-950">
            还没有历史版本
          </h2>
          <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-ink-700">
            创建或保存{shortStoryProject ? "写作单元" : "章节"}后，这里会显示版本号、修改原因和创建时间。
          </p>
        </section>
      ) : (
        <section className="overflow-hidden rounded-lg border border-ink-950/10 bg-white shadow-panel">
          <div className="grid grid-cols-[88px_1fr_160px] border-b border-ink-950/10 bg-paper-50 px-4 py-3 text-sm font-semibold text-ink-800 max-sm:hidden">
            <div>版本</div>
            <div>修改原因</div>
            <div>时间</div>
          </div>

          <div className="divide-y divide-ink-950/10">
            {chapter.versions.map((version) => (
              <Link
                className="grid gap-2 px-4 py-4 text-sm transition hover:bg-paper-50 sm:grid-cols-[88px_1fr_160px] sm:items-center"
                href={`/projects/${chapter.project.id}/chapters/${chapter.id}/history/${version.id}`}
                key={version.id}
              >
                <div className="font-semibold text-ink-950">
                  v{version.versionNumber}
                </div>
                <div className="text-ink-700">
                  {version.changeReason || "未填写修改原因"}
                </div>
                <div className="text-ink-700">{formatDate(version.createdAt)}</div>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
