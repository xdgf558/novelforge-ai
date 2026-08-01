import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, FileText, Plus } from "lucide-react";
import { chapterStatusLabel, formatChapterWordCount } from "@/lib/chapter-fields";
import { formatDate, formatNumber } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { isShortStoryProject } from "@/lib/projects/work-types";
import {
  recommendShortStoryWritingUnits,
  shortStoryUnitProgress,
} from "@/lib/short-stories/writing-units";

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
      status: true,
      workType: true,
      totalWordTarget: true,
      chapterWordMin: true,
      chapterWordMax: true,
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
      unitWordTarget: true,
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
  const shortStoryProject = isShortStoryProject(project.workType);
  const canWriteChapters = project.status === "active";
  const unitRecommendation = recommendShortStoryWritingUnits({
    totalWordTarget: project.totalWordTarget,
    unitWordMin: project.chapterWordMin,
    unitWordMax: project.chapterWordMax,
  });
  const currentWordCount = chapters.reduce(
    (total, chapter) => total + chapter.wordCount,
    0,
  );
  const completedUnitCount = chapters.filter((chapter) =>
    ["final", "published"].includes(chapter.status),
  ).length;
  const unitProgress = shortStoryUnitProgress({
    completedUnits: completedUnitCount,
    currentWords: currentWordCount,
    recommendation: unitRecommendation,
    totalUnits: chapters.length,
  });
  const recentChapters = shortStoryProject ? chapters : chapters.slice(-3);
  const historicalChapters = shortStoryProject
    ? []
    : chapters.slice(0, Math.max(0, chapters.length - 3));
  const renderChapterLink = (chapter: (typeof chapters)[number]) => (
    <Link
      className="group grid gap-3 border-b border-ink-950/10 px-4 py-3 transition last:border-b-0 hover:bg-paper-50/80 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center"
      href={`/projects/${project.id}/chapters/${chapter.id}`}
      key={chapter.id}
    >
      <div className="min-w-0">
        <div className="flex min-w-0 items-center gap-2">
          <p className="shrink-0 text-xs font-semibold text-signal-600">
            {shortStoryProject ? "单元" : "第"}{" "}
            {formatNumber(chapter.chapterNumber)}
            {shortStoryProject ? "" : " 章"}
          </p>
          <span className="shrink-0 rounded bg-paper-100 px-2 py-0.5 text-[11px] font-semibold text-ink-700">
            {chapterStatusLabel(chapter.status)}
          </span>
          <h2 className="truncate text-base font-semibold text-ink-950 transition group-hover:text-signal-700">
            {chapter.title}
          </h2>
        </div>
        <p className="mt-1 truncate text-sm text-ink-700">
          {shortStoryProject ? "单元目标" : "目标"}：{chapter.goal || "未设置"}
        </p>
      </div>

      <dl className="grid grid-cols-3 gap-3 text-xs text-ink-700 sm:w-[18rem]">
        <div className="min-w-0">
          <dt>{shortStoryProject ? "正文 / 目标" : "字数"}</dt>
          <dd className="mt-0.5 truncate font-semibold text-ink-950">
            {shortStoryProject
              ? chapter.wordCount.toLocaleString("zh-CN") +
                " / " +
                (chapter.unitWordTarget > 0
                  ? chapter.unitWordTarget.toLocaleString("zh-CN")
                  : "未设") +
                " 字"
              : formatChapterWordCount(chapter.wordCount)}
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
            {shortStoryProject ? "写作单元" : "章节编辑器"}
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-ink-700">
            {shortStoryProject
              ? "把完整短故事拆成有边界的内部写作单元，分别规划、生成、精修和定稿；最终仍会作为一篇完整作品收束。"
              : "管理章节目标、节拍、草稿、定稿和版本快照，为后续摘要提取、AI 生成和连续性检查准备稳定素材。"}
          </p>
        </div>

        {canWriteChapters ? (
          <Link
            className="inline-flex min-h-10 items-center gap-2 rounded-md bg-ink-950 px-3 py-2 text-sm font-semibold text-white transition hover:bg-ink-800"
            href={`/projects/${project.id}/chapters/new`}
          >
            <Plus aria-hidden="true" className="h-4 w-4" />
            新建{shortStoryProject ? "写作单元" : "章节"}
          </Link>
        ) : (
          <Link
            className="inline-flex min-h-10 items-center gap-2 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-950 transition hover:bg-amber-100"
            href={`/projects/${project.id}/edit`}
          >
            作品已完结，重新连载后可编辑
          </Link>
        )}
      </div>

      {shortStoryProject ? (
        <section className="border-y border-ink-950/10 py-4">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <UnitMetric
              label="建议单元数"
              value={`${unitRecommendation.unitCount} 个`}
            />
            <UnitMetric
              label="建议单元字数"
              value={`约 ${unitRecommendation.unitWordTarget.toLocaleString("zh-CN")} 字`}
            />
            <UnitMetric
              label="当前进度"
              value={`${unitProgress.completedUnits} / ${unitProgress.totalUnits} 个已定稿`}
            />
            <UnitMetric
              label="当前正文"
              value={`${unitProgress.currentWords.toLocaleString("zh-CN")} 字`}
            />
          </div>
          <p className="mt-3 text-xs leading-5 text-ink-700">
            {unitRecommendation.hasConfiguredTotal
              ? `按总目标 ${unitRecommendation.totalWordTarget?.toLocaleString("zh-CN")} 字估算；这是规划建议，不会自动创建或删除单元。`
              : "尚未设置总字数目标，当前先按 5 个内部单元估算；你可以在项目编辑中补充目标。"}
          </p>
        </section>
      ) : null}

      {chapters.length === 0 ? (
        <section className="rounded-lg border border-dashed border-ink-950/20 bg-white/72 p-8 text-center">
          <FileText
            aria-hidden="true"
            className="mx-auto h-8 w-8 text-signal-600"
          />
          <h2 className="mt-4 text-lg font-semibold text-ink-950">
            还没有{shortStoryProject ? "写作单元" : "章节"}
          </h2>
          <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-ink-700">
            {shortStoryProject
              ? "先创建第一个写作单元，确认目标、场景推进、冲突、转折和兑现任务。每次保存都会留下版本快照。"
              : "先创建第一章，手动记录章节目标、节拍和正文。每次保存都会留下章节版本快照。"}
          </p>
          {canWriteChapters ? (
            <Link
              className="mt-5 inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-ink-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-ink-800"
              href={`/projects/${project.id}/chapters/new`}
            >
              <Plus aria-hidden="true" className="h-4 w-4" />
              {shortStoryProject ? "创建第一个写作单元" : "创建第一章"}
            </Link>
          ) : null}
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

function UnitMetric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-semibold text-ink-700">{label}</p>
      <p className="mt-1 text-base font-semibold text-ink-950">{value}</p>
    </div>
  );
}
