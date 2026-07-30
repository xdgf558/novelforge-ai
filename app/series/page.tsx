import Link from "next/link";
import {
  ArrowUpRight,
  BookCopy,
  FileUp,
  LibraryBig,
  Plus,
  Users,
} from "lucide-react";
import { formatDate, formatNumber } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { shortStorySeriesStatusLabel } from "@/lib/short-story-series/fields";

export const dynamic = "force-dynamic";

export default async function ShortStorySeriesPage() {
  const seriesList = await prisma.shortStorySeries.findMany({
    orderBy: [
      {
        status: "asc",
      },
      {
        updatedAt: "desc",
      },
    ],
    include: {
      _count: {
        select: {
          entries: true,
          characters: true,
        },
      },
      entries: {
        orderBy: [
          {
            sortOrder: "asc",
          },
          {
            createdAt: "asc",
          },
        ],
        take: 3,
        select: {
          project: {
            select: {
              title: true,
            },
          },
        },
      },
    },
  });
  const activeSeriesCount = seriesList.filter(
    (series) => series.status === "active",
  ).length;
  const totalEntryCount = seriesList.reduce(
    (total, series) => total + series._count.entries,
    0,
  );
  const totalCharacterCount = seriesList.reduce(
    (total, series) => total + series._count.characters,
    0,
  );

  return (
    <div className="space-y-4">
      <header className="nf-page-header">
        <div>
          <p className="nf-page-eyebrow">跨篇创作</p>
          <h1>系列短故事</h1>
          <p className="nf-page-description">
            维护共享连续性、篇目顺序和跨篇人物状态。
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link className="nf-secondary-button" href="/series/import">
            <FileUp aria-hidden="true" className="h-4 w-4" />
            导入创作文档
          </Link>
          <Link className="nf-primary-button" href="/series/new">
            <Plus aria-hidden="true" className="h-4 w-4" />
            新建系列
          </Link>
        </div>
      </header>

      <section className="nf-summary-strip" aria-label="系列概览">
        <SeriesMetric
          icon={BookCopy}
          label="系列"
          value={formatNumber(seriesList.length)}
        />
        <SeriesMetric
          icon={LibraryBig}
          label="连载中"
          value={formatNumber(activeSeriesCount)}
        />
        <SeriesMetric
          accent="amber"
          icon={BookCopy}
          label="篇目"
          value={formatNumber(totalEntryCount)}
        />
        <SeriesMetric
          icon={Users}
          label="持续人物"
          value={formatNumber(totalCharacterCount)}
        />
      </section>

      {seriesList.length === 0 ? (
        <section className="nf-empty-state">
          <BookCopy
            aria-hidden="true"
            className="h-7 w-7 text-[var(--nf-cyan)]"
          />
          <h2>还没有系列短故事</h2>
          <p>
            导入创作圣经或手动建立系列，再把独立短故事按阅读顺序加入。
          </p>
          <div className="mt-3 flex flex-wrap justify-center gap-2">
            <Link className="nf-secondary-button" href="/series/import">
              <FileUp aria-hidden="true" className="h-4 w-4" />
              导入创作文档
            </Link>
            <Link className="nf-primary-button" href="/series/new">
              <Plus aria-hidden="true" className="h-4 w-4" />
              建立第一个系列
            </Link>
          </div>
        </section>
      ) : (
        <section className="space-y-2">
          {seriesList.map((series) => (
            <Link
              className="nf-series-row"
              href={`/series/${series.id}`}
              key={series.id}
            >
              <span className="nf-project-row-mark nf-project-row-mark-short">
                <BookCopy aria-hidden="true" className="h-4 w-4" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex flex-wrap items-center gap-2">
                  <span className="truncate text-sm font-semibold text-[var(--nf-text-main)]">
                    {series.title}
                  </span>
                  <span className="nf-status-label">
                    {shortStorySeriesStatusLabel(series.status)}
                  </span>
                </span>
                <span className="mt-1 line-clamp-1 block text-[10px] text-[var(--nf-text-muted)]">
                  {series.premise || "尚未填写系列定位。"}
                </span>
                <span className="mt-1 block truncate text-[9px] text-[var(--nf-text-faint)]">
                  {series.entries.length > 0
                    ? series.entries
                        .map((entry) => entry.project.title)
                        .join(" · ")
                    : "尚未加入短故事项目"}
                </span>
              </span>
              <span className="nf-series-row-stat">
                <strong>{series._count.entries}</strong>
                <span>篇目</span>
              </span>
              <span className="nf-series-row-stat">
                <strong>{series._count.characters}</strong>
                <span>人物</span>
              </span>
              <span className="hidden shrink-0 text-right md:block">
                <span className="block text-[9px] text-[var(--nf-text-faint)]">
                  最近更新
                </span>
                <span className="mt-1 block text-[10px] text-[var(--nf-text-muted)]">
                  {formatDate(series.updatedAt)}
                </span>
              </span>
              <ArrowUpRight
                aria-hidden="true"
                className="h-4 w-4 shrink-0 text-[var(--nf-text-faint)]"
              />
            </Link>
          ))}
        </section>
      )}
    </div>
  );
}

function SeriesMetric({
  accent = "cyan",
  icon: Icon,
  label,
  value,
}: {
  accent?: "amber" | "cyan";
  icon: typeof BookCopy;
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
