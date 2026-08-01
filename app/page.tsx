import type { ReactNode } from "react";
import Link from "next/link";
import {
  Activity,
  ArrowUpRight,
  BookCopy,
  BookOpenText,
  CalendarClock,
  Plus,
  Target,
  Waves,
} from "lucide-react";
import { prisma } from "@/lib/prisma";
import { formatDate, formatNumber, formatWordRange } from "@/lib/format";
import { loadProjectActivitySummaries } from "@/lib/project-activity";
import {
  isShortStoryProject,
  projectWorkTypeLabel,
} from "@/lib/projects/work-types";
import { projectStatusLabel } from "@/lib/projects/status";

export const dynamic = "force-dynamic";

type HomePageProps = {
  searchParams?: Promise<{
    projectCompleted?: string;
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
          : activeFilter === "archived"
            ? {
                status: {
                  in: ["archived", "completed"],
                },
              }
            : {
                status: "active",
              },
      orderBy: {
        updatedAt: "desc",
      },
      include: {
        shortStorySeriesEntry: {
          select: {
            series: {
              select: {
                id: true,
                title: true,
              },
            },
          },
        },
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
    <div className="space-y-4">
      <header className="nf-page-header">
        <div>
          <p className="nf-page-eyebrow">项目库</p>
          <h1>创作项目</h1>
          <p className="nf-page-description">
            管理本机上的长篇连载、独立短故事与系列作品。
          </p>
        </div>
        <Link className="nf-primary-button" href="/projects/new">
          <Plus aria-hidden="true" className="h-4 w-4" />
          新建项目
        </Link>
      </header>

      {resolvedSearchParams?.projectCompleted === "1" ? (
        <section className="nf-project-library-notice" role="status">
          <BookOpenText aria-hidden="true" className="h-4 w-4" />
          <p>
            作品已标记为完结，并已收录到归档目录。全部章节、设定、记忆与任务记录均已保留。
          </p>
        </section>
      ) : null}

      <section className="nf-summary-strip" aria-label="项目概览">
        <SummaryMetric
          icon={BookOpenText}
          label="项目"
          value={formatNumber(totalProjectCount)}
        />
        <SummaryMetric
          icon={Waves}
          label="进行中"
          value={formatNumber(activeProjectCount)}
        />
        <SummaryMetric
          accent="amber"
          icon={Target}
          label="目标字数"
          value={hasTotalWordTarget ? formatNumber(totalWordTarget) : "未设置"}
        />
        <SummaryMetric
          icon={CalendarClock}
          label="本地存储"
          value="SQLite"
        />
      </section>

      <div className="nf-project-library-layout">
        <section className="min-w-0">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <nav className="nf-segmented-control" aria-label="项目状态筛选">
              <ProjectFilterLink active={activeFilter === "active"} href="/">
                活跃
              </ProjectFilterLink>
              <ProjectFilterLink
                active={activeFilter === "archived"}
                href="/?projectStatus=archived"
              >
                归档目录
              </ProjectFilterLink>
              <ProjectFilterLink
                active={activeFilter === "all"}
                href="/?projectStatus=all"
              >
                全部
              </ProjectFilterLink>
            </nav>
            <p className="text-[10px] text-[var(--nf-text-faint)]">
              {projects.length} 个结果 · 按最近活动排序
            </p>
          </div>

          {projects.length === 0 ? (
            <section className="nf-empty-state">
              <BookOpenText
                aria-hidden="true"
                className="h-7 w-7 text-[var(--nf-cyan)]"
              />
              <h2>
                {activeFilter === "archived" ? "还没有归档项目" : "还没有创作项目"}
              </h2>
              <p>
                {activeFilter === "archived"
                  ? "归档项目会保留全部正文、记忆与 AI 任务记录。"
                  : "创建项目后即可进入设定、大纲、章节与审校工作流。"}
              </p>
              {activeFilter === "archived" ? null : (
                <Link className="nf-primary-button mt-3" href="/projects/new">
                  <Plus aria-hidden="true" className="h-4 w-4" />
                  创建第一个项目
                </Link>
              )}
            </section>
          ) : (
            <div className="space-y-2">
              {projects.map((project) => {
                const latestActivity =
                  project.activitySummary?.latestActivityAt ?? project.updatedAt;

                return (
                  <Link
                    className="nf-project-row"
                    href={`/projects/${project.id}`}
                    key={project.id}
                  >
                    <span
                      className={
                        isShortStoryProject(project.workType)
                          ? "nf-project-row-mark nf-project-row-mark-short"
                          : "nf-project-row-mark"
                      }
                    >
                      {isShortStoryProject(project.workType) ? (
                        <BookCopy aria-hidden="true" className="h-4 w-4" />
                      ) : (
                        <BookOpenText aria-hidden="true" className="h-4 w-4" />
                      )}
                    </span>

                    <span className="min-w-0 flex-1">
                      <span className="flex flex-wrap items-center gap-2">
                        <span className="truncate text-sm font-semibold text-[var(--nf-text-main)]">
                          {project.title}
                        </span>
                        <span className="nf-status-label">
                          {projectWorkTypeLabel(project.workType)}
                        </span>
                        {project.shortStorySeriesEntry ? (
                          <span className="nf-status-label nf-status-label-amber">
                            {project.shortStorySeriesEntry.series.title}
                          </span>
                        ) : null}
                      </span>
                      <span className="mt-1 block truncate text-[10px] text-[var(--nf-text-faint)]">
                        {project.genre || "未设置题材"} ·{" "}
                        {project.platform || "未设置平台"} ·{" "}
                        {isShortStoryProject(project.workType)
                          ? `${formatNumber(project.totalWordTarget)} 字目标`
                          : `${formatWordRange(project.chapterWordMin, project.chapterWordMax)} / 章`}
                      </span>
                    </span>

                    <span className="hidden shrink-0 text-right sm:block">
                      <span className="block text-[10px] text-[var(--nf-text-muted)]">
                        {formatDate(latestActivity)}
                      </span>
                      <span className="mt-1 block text-[9px] text-[var(--nf-text-faint)]">
                        {projectStatusLabel(project.status)}
                      </span>
                    </span>
                    <ArrowUpRight
                      aria-hidden="true"
                      className="h-4 w-4 shrink-0 text-[var(--nf-text-faint)]"
                    />
                  </Link>
                );
              })}
            </div>
          )}
        </section>

        <aside className="nf-activity-panel">
          <div className="nf-panel-heading">
            <span className="flex items-center gap-2">
              <Activity
                aria-hidden="true"
                className="h-3.5 w-3.5 text-[var(--nf-cyan)]"
              />
              最近活动
            </span>
          </div>
          {projects.length === 0 ? (
            <p className="nf-panel-empty">暂无最近活动</p>
          ) : (
            <div>
              {projects.slice(0, 6).map((project) => (
                <Link
                  className="nf-activity-row"
                  href={`/projects/${project.id}`}
                  key={`recent-${project.id}`}
                >
                  <span className="nf-activity-dot" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[11px] font-medium text-[var(--nf-text-secondary)]">
                      {project.title}
                    </span>
                    <span className="mt-0.5 block text-[9px] text-[var(--nf-text-faint)]">
                      {formatDate(
                        project.activitySummary?.latestActivityAt ??
                          project.updatedAt,
                      )}
                    </span>
                  </span>
                </Link>
              ))}
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}

function SummaryMetric({
  accent = "cyan",
  icon: Icon,
  label,
  value,
}: {
  accent?: "amber" | "cyan";
  icon: typeof BookOpenText;
  label: string;
  value: string;
}) {
  return (
    <div className="nf-summary-metric">
      <Icon
        aria-hidden="true"
        className={
          accent === "amber"
            ? "h-3.5 w-3.5 text-[var(--nf-amber)]"
            : "h-3.5 w-3.5 text-[var(--nf-cyan)]"
        }
      />
      <span className="text-[9px] text-[var(--nf-text-faint)]">{label}</span>
      <strong>{value}</strong>
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
    <Link className={active ? "nf-segment-active" : ""} href={href}>
      {children}
    </Link>
  );
}
