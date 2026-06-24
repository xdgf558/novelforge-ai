import type { ReactNode } from "react";
import Link from "next/link";
import {
  Activity,
  BookOpenText,
  Clock3,
  Plus,
  Target,
  Waves,
} from "lucide-react";
import { prisma } from "@/lib/prisma";
import { formatDate, formatNumber, formatWordRange } from "@/lib/format";
import { loadProjectActivitySummaries } from "@/lib/project-activity";
import {
  EmptyStationIllustration,
  StatCardBackdrop,
} from "@/components/story-illustrations";

export const dynamic = "force-dynamic";

type HomePageProps = {
  searchParams?: Promise<{
    projectStatus?: string;
  }>;
};

export default async function HomePage({ searchParams }: HomePageProps) {
  const resolvedSearchParams = await searchParams;
  const activeFilter = normalizeProjectStatusFilter(
    resolvedSearchParams?.projectStatus,
  );
  const [
    rawProjects,
    activeProjectCount,
    totalProjectCount,
    wordTargetAggregate,
  ] = await Promise.all([
    prisma.project.findMany({
      where:
        activeFilter === "all"
          ? undefined
          : {
              status: activeFilter,
            },
      orderBy: {
        updatedAt: "desc",
      },
    }),
    prisma.project.count({
      where: {
        status: "active",
      },
    }),
    prisma.project.count(),
    prisma.project.aggregate({
      _sum: {
        totalWordTarget: true,
      },
    }),
  ]);

  const activitySummaries = await loadProjectActivitySummaries(rawProjects);
  const projects = rawProjects
    .map((project) => ({
      ...project,
      activitySummary: activitySummaries.get(project.id),
    }))
    .sort(
      (left, right) =>
        (right.activitySummary?.latestActivityAt ?? right.updatedAt).getTime() -
        (left.activitySummary?.latestActivityAt ?? left.updatedAt).getTime(),
    );
  const totalWordTarget = wordTargetAggregate._sum.totalWordTarget;
  const hasTotalWordTarget = totalWordTarget != null && totalWordTarget > 0;

  return (
    <div className="space-y-7">
      <header className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-[#58d7c7]">本地工作台</p>
          <h1 className="mt-4 text-4xl font-semibold tracking-normal text-[#f5dfbd] sm:text-5xl">
            小说项目
          </h1>
          <p className="mt-4 max-w-3xl text-base leading-8 text-[#b7a286]">
            本地项目、总设定档、角色库、章节编辑器和 AI 任务记录已接入，后续生成能力会沿着这个记忆底座继续扩展。
          </p>
        </div>
        <Link className="nf-primary-button w-fit" href="/projects/new">
          <Plus aria-hidden="true" className="h-5 w-5" />
          新建项目
        </Link>
      </header>

      <section className="grid gap-4 md:grid-cols-3">
        <div className="nf-glass-card min-h-36 p-6">
          <StatCardBackdrop className="absolute bottom-0 right-0 h-28 w-44 opacity-80" />
          <div className="relative flex items-center gap-3 text-sm text-[#dac39f]">
            <BookOpenText aria-hidden="true" className="h-5 w-5 text-[#58d7c7]" />
            项目总数
          </div>
          <p className="relative mt-5 text-4xl font-semibold text-[#f5dfbd]">
            {totalProjectCount}
          </p>
          <p className="relative mt-2 text-sm text-[#8d7b63]">所有小说项目</p>
        </div>

        <div className="nf-glass-card min-h-36 p-6">
          <StatCardBackdrop className="absolute bottom-0 right-0 h-28 w-44 opacity-65" />
          <div className="relative flex items-center gap-3 text-sm text-[#dac39f]">
            <Waves aria-hidden="true" className="h-5 w-5 text-[#58d7c7]" />
            活跃项目
          </div>
          <p className="relative mt-5 text-4xl font-semibold text-[#f5dfbd]">
            {activeProjectCount}
          </p>
          <p className="relative mt-2 text-sm text-[#8d7b63]">正在创作的项目</p>
        </div>

        <div className="nf-glass-card min-h-36 p-6">
          <StatCardBackdrop className="absolute bottom-0 right-0 h-28 w-44 opacity-65" />
          <div className="relative flex items-center gap-3 text-sm text-[#dac39f]">
            <Target aria-hidden="true" className="h-5 w-5 text-[#ffc274]" />
            目标字数
          </div>
          <p className="relative mt-5 text-3xl font-semibold text-[#f5dfbd] sm:text-4xl">
            {hasTotalWordTarget ? formatNumber(totalWordTarget) : "未设置"}
          </p>
          <p className="relative mt-2 text-sm text-[#8d7b63]">
            {hasTotalWordTarget ? "所有项目目标合计" : "当前目标字数未设置"}
          </p>
        </div>
      </section>

      <nav className="flex flex-wrap gap-2" aria-label="项目状态筛选">
        <ProjectFilterLink active={activeFilter === "active"} href="/">
          活跃项目
        </ProjectFilterLink>
        <ProjectFilterLink
          active={activeFilter === "archived"}
          href="/?projectStatus=archived"
        >
          已归档
        </ProjectFilterLink>
        <ProjectFilterLink active={activeFilter === "all"} href="/?projectStatus=all">
          全部项目
        </ProjectFilterLink>
      </nav>

      {projects.length === 0 ? (
        <section className="nf-dashed-panel px-6 py-10 text-center sm:px-10">
          <div className="relative mx-auto max-w-3xl">
            <EmptyStationIllustration className="mx-auto h-auto w-full max-w-sm opacity-95" />
            <h2 className="mt-2 text-2xl font-semibold text-[#f5dfbd]">
              {activeFilter === "archived" ? "还没有归档项目" : "还没有小说项目"}
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-sm leading-7 text-[#b7a286]">
              {activeFilter === "archived"
                ? "项目归档后会从默认活跃列表中隐藏，但仍可在这里恢复和查看。"
                : "创建第一个项目后，系统会把标题、题材、读者、字数目标和公众号定位保存到本地 SQLite。"}
            </p>
            {activeFilter === "archived" ? null : (
              <Link className="nf-primary-button mt-7" href="/projects/new">
                <Plus aria-hidden="true" className="h-5 w-5" />
                创建第一个项目
              </Link>
            )}
          </div>
        </section>
      ) : (
        <section className="grid gap-4 lg:grid-cols-2">
          {projects.map((project) => (
            <Link
              className="nf-glass-card block p-5 transition hover:-translate-y-0.5 hover:border-[#58d7c7]/45 hover:shadow-[0_24px_60px_rgba(0,0,0,0.28)]"
              href={`/projects/${project.id}`}
              key={project.id}
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-[#f5dfbd]">
                    {project.title}
                  </h2>
                  <p className="mt-1 text-sm text-[#a99573]">
                    {project.genre || "未设置题材"} / {project.platform || "未设置平台"}
                  </p>
                </div>
                <span className="w-fit rounded-full border border-[#58d7c7]/25 bg-[#58d7c7]/10 px-3 py-1 text-xs font-semibold text-[#8be7dd]">
                  {project.status === "active" ? "进行中" : "已归档"}
                </span>
              </div>

              <dl className="mt-5 grid gap-3 text-sm sm:grid-cols-3">
                <div>
                  <dt className="text-[#8d7b63]">目标读者</dt>
                  <dd className="mt-1 font-medium text-[#dac39f]">
                    {project.targetAudience || "未设置"}
                  </dd>
                </div>
                <div>
                  <dt className="text-[#8d7b63]">单章字数</dt>
                  <dd className="mt-1 font-medium text-[#dac39f]">
                    {formatWordRange(project.chapterWordMin, project.chapterWordMax)}
                  </dd>
                </div>
                <div>
                  <dt className="text-[#8d7b63]">更新</dt>
                  <dd className="mt-1 font-medium text-[#dac39f]">
                    {project.updateFrequency || "未设置"}
                  </dd>
                </div>
              </dl>

              <p className="mt-4 text-xs text-[#8d7b63]">
                最近活动：
                {formatDate(
                  project.activitySummary?.latestActivityAt ?? project.updatedAt,
                )}
              </p>
            </Link>
          ))}
        </section>
      )}

      <section className="nf-glass-card p-5">
        <div className="flex items-center gap-3 text-sm text-[#dac39f]">
          <Clock3 aria-hidden="true" className="h-5 w-5 text-[#ffc274]" />
          最近活动
        </div>
        {projects.length === 0 ? (
          <p className="mt-4 text-sm text-[#9f8b6d]">
            暂无最近活动，开始创作吧。
          </p>
        ) : (
          <div className="mt-4 grid gap-3">
            {projects.slice(0, 3).map((project) => (
              <Link
                className="flex items-center justify-between gap-4 rounded-xl border border-[#ce8f48]/15 bg-[#071719]/70 px-4 py-3 transition hover:border-[#58d7c7]/30 hover:bg-[#0b2225]"
                href={`/projects/${project.id}`}
                key={`recent-${project.id}`}
              >
                <div>
                  <p className="font-medium text-[#f5dfbd]">{project.title}</p>
                  <p className="mt-1 text-xs text-[#8d7b63]">
                    {project.genre || "未设置题材"}
                  </p>
                </div>
                <div className="flex items-center gap-2 text-xs text-[#a99573]">
                  <Activity aria-hidden="true" className="h-4 w-4 text-[#58d7c7]" />
                  {formatDate(
                    project.activitySummary?.latestActivityAt ?? project.updatedAt,
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function normalizeProjectStatusFilter(value?: string) {
  return value === "archived" || value === "all" ? value : "active";
}

function ProjectFilterLink({
  active,
  children,
  href,
}: {
  active: boolean;
  children: ReactNode;
  href: string;
}) {
  return (
    <Link
      className={`inline-flex min-h-10 items-center rounded-md border px-3 py-2 text-sm font-semibold transition ${
        active
          ? "border-[#58d7c7]/45 bg-[#58d7c7]/15 text-[#dffcf6]"
          : "border-[#ce8f48]/15 bg-[#071719]/70 text-[#dac39f] hover:border-[#58d7c7]/30 hover:bg-[#0b2225]"
      }`}
      href={href}
    >
      {children}
    </Link>
  );
}
