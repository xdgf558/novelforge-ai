import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, FileClock, Pencil } from "lucide-react";
import { formatDate } from "@/lib/format";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type ShortStoryBlueprintHistoryPageProps = {
  params: Promise<{
    projectId: string;
  }>;
};

export default async function ShortStoryBlueprintHistoryPage({
  params,
}: ShortStoryBlueprintHistoryPageProps) {
  const { projectId } = await params;
  const project = await prisma.project.findFirst({
    where: {
      id: projectId,
      workType: "short_story",
    },
    select: {
      id: true,
      title: true,
    },
  });

  if (!project) {
    notFound();
  }

  const versions = await prisma.shortStoryBlueprintVersion.findMany({
    where: {
      projectId,
    },
    orderBy: {
      versionNumber: "desc",
    },
  });

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 border-b border-ink-950/10 pb-5 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <Link
            className="mb-4 inline-flex items-center gap-2 text-sm font-medium text-ink-700 transition hover:text-signal-600"
            href={`/projects/${project.id}/blueprint`}
          >
            <ArrowLeft aria-hidden="true" className="h-4 w-4" />
            返回短故事蓝图
          </Link>
          <p className="text-sm font-semibold text-signal-600">
            {project.title}
          </p>
          <h1 className="mt-2 text-2xl font-semibold tracking-normal text-ink-950">
            蓝图历史
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-ink-700">
            手动保存、采用 AI 草案和恢复历史都会留下快照。打开版本后可以查看或恢复。
          </p>
        </div>

        <Link
          className="inline-flex min-h-10 items-center gap-2 rounded-md border border-ink-950/15 bg-white px-3 py-2 text-sm font-semibold text-ink-800 transition hover:bg-paper-100"
          href={`/projects/${project.id}/blueprint`}
        >
          <Pencil aria-hidden="true" className="h-4 w-4" />
          编辑当前蓝图
        </Link>
      </header>

      {versions.length === 0 ? (
        <section className="py-12 text-center">
          <FileClock
            aria-hidden="true"
            className="mx-auto h-8 w-8 text-signal-600"
          />
          <h2 className="mt-4 text-lg font-semibold text-ink-950">
            还没有蓝图版本
          </h2>
          <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-ink-700">
            保存正式蓝图或采用一份 AI 草案后，历史快照会出现在这里。
          </p>
        </section>
      ) : (
        <section className="border-y border-ink-950/10">
          <div className="grid grid-cols-[88px_1fr_120px_160px] border-b border-ink-950/10 bg-paper-50 px-4 py-3 text-sm font-semibold text-ink-800 max-md:hidden">
            <div>版本</div>
            <div>修改原因</div>
            <div>来源</div>
            <div>时间</div>
          </div>

          <div className="divide-y divide-ink-950/10">
            {versions.map((version) => (
              <Link
                className="grid gap-2 px-4 py-4 text-sm transition hover:bg-paper-50 md:grid-cols-[88px_1fr_120px_160px] md:items-center"
                href={`/projects/${project.id}/blueprint/history/${version.id}`}
                key={version.id}
              >
                <div className="font-semibold text-ink-950">
                  v{version.versionNumber}
                </div>
                <div className="text-ink-700">
                  {version.changeReason || "未填写修改原因"}
                </div>
                <div className="text-ink-700">
                  {blueprintSourceLabel(version.sourceType)}
                </div>
                <div className="text-ink-700">
                  {formatDate(version.createdAt)}
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function blueprintSourceLabel(sourceType: string) {
  if (sourceType === "ai_short_story_blueprint") {
    return "AI 采用";
  }

  if (sourceType === "rollback") {
    return "历史恢复";
  }

  return "手动保存";
}
