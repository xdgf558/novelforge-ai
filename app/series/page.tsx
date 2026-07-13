import Link from "next/link";
import { BookCopy, FileUp, Plus, Users } from "lucide-react";
import { formatDate } from "@/lib/format";
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

  return (
    <div className="space-y-5">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-[#58d7c7]">跨篇创作</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-normal text-[#f5dfbd]">
            系列短故事
          </h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-[#b7a286]">
            每一篇仍是可以独立阅读的完整短故事；系列层只维护共享世界、长期谜团、核心人物累计状态和篇目顺序。
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            className="inline-flex min-h-10 items-center gap-2 rounded-md border border-[#ce8f48]/30 bg-[#ce8f48]/10 px-3 py-2 text-sm font-semibold text-[#f0c98b] transition hover:bg-[#ce8f48]/15"
            href="/series/import"
          >
            <FileUp aria-hidden="true" className="h-4 w-4" />
            导入创作文档
          </Link>
          <Link className="nf-primary-button" href="/series/new">
            <Plus aria-hidden="true" className="h-4 w-4" />
            新建系列
          </Link>
        </div>
      </header>

      {seriesList.length === 0 ? (
        <section className="nf-dashed-panel px-6 py-12 text-center">
          <BookCopy
            aria-hidden="true"
            className="mx-auto h-12 w-12 text-[#58d7c7]"
          />
          <h2 className="mt-4 text-xl font-semibold text-[#f5dfbd]">
            还没有系列短故事
          </h2>
          <p className="mx-auto mt-2 max-w-2xl text-sm leading-6 text-[#b7a286]">
            先建立系列档案，再把现有短故事按顺序加入。单篇蓝图、正文、审校和成稿不会被合并或改写。
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-2">
            <Link
              className="inline-flex min-h-10 items-center gap-2 rounded-md border border-[#ce8f48]/30 bg-[#ce8f48]/10 px-3 py-2 text-sm font-semibold text-[#f0c98b] transition hover:bg-[#ce8f48]/15"
              href="/series/import"
            >
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
        <section className="grid gap-3 lg:grid-cols-2">
          {seriesList.map((series) => (
            <Link
              className="nf-glass-card block p-5 transition hover:-translate-y-0.5 hover:border-[#58d7c7]/45"
              href={`/series/${series.id}`}
              key={series.id}
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold text-[#58d7c7]">
                    {shortStorySeriesStatusLabel(series.status)}
                  </p>
                  <h2 className="mt-1 text-lg font-semibold text-[#f5dfbd]">
                    {series.title}
                  </h2>
                </div>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-[#ce8f48]/25 bg-[#ce8f48]/10 px-2.5 py-1 text-xs text-[#f0c98b]">
                  <Users aria-hidden="true" className="h-3.5 w-3.5" />
                  {series._count.characters}
                </span>
              </div>
              <p className="mt-3 line-clamp-3 text-sm leading-6 text-[#b7a286]">
                {series.premise || "尚未填写系列定位。"}
              </p>
              <div className="mt-4 border-t border-[#ce8f48]/15 pt-3 text-xs text-[#8d7b63]">
                <p>
                  {series._count.entries} 篇故事
                  {series.entries.length > 0
                    ? ` · ${series.entries.map((entry) => entry.project.title).join("、")}`
                    : " · 尚未加入篇目"}
                </p>
                <p className="mt-1">更新：{formatDate(series.updatedAt)}</p>
              </div>
            </Link>
          ))}
        </section>
      )}
    </div>
  );
}
