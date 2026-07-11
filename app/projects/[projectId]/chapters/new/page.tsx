import { notFound } from "next/navigation";
import { createChapter } from "@/app/projects/[projectId]/chapters/actions";
import { ChapterForm } from "@/components/chapters/chapter-form";
import {
  buildChapterOutlinePrefill,
  selectChapterOutlineForPrefill,
} from "@/lib/chapter-outline-prefill";
import { prisma } from "@/lib/prisma";
import { isShortStoryProject } from "@/lib/projects/work-types";
import { recommendShortStoryWritingUnits } from "@/lib/short-stories/writing-units";

export const dynamic = "force-dynamic";

type NewChapterPageProps = {
  params: Promise<{
    projectId: string;
  }>;
  searchParams?: Promise<{
    chapterError?: string;
  }>;
};

export default async function NewChapterPage({
  params,
  searchParams,
}: NewChapterPageProps) {
  const { projectId } = await params;
  const { chapterError } = (await searchParams) ?? {};
  const project = await prisma.project.findUnique({
    where: {
      id: projectId,
    },
  });

  if (!project) {
    notFound();
  }

  const shortStoryProject = isShortStoryProject(project.workType);
  const unitRecommendation = recommendShortStoryWritingUnits({
    totalWordTarget: project.totalWordTarget,
    unitWordMin: project.chapterWordMin,
    unitWordMax: project.chapterWordMax,
  });

  const chapterNumberAggregate = await prisma.chapter.aggregate({
    where: {
      projectId,
    },
    _max: {
      chapterNumber: true,
    },
  });

  const nextChapterNumber =
    (chapterNumberAggregate._max.chapterNumber ?? 0) + 1;
  const matchingChapterOutlines = shortStoryProject
    ? []
    : await prisma.outline.findMany({
        where: {
          projectId,
          level: "chapter",
          status: {
            not: "archived",
          },
          chapterNumber: nextChapterNumber,
        },
        orderBy: [
          {
            updatedAt: "desc",
          },
          {
            createdAt: "desc",
          },
        ],
        take: 5,
      });
  const chapterOutlinePrefill = buildChapterOutlinePrefill(
    selectChapterOutlineForPrefill(matchingChapterOutlines),
  );
  const defaultChapterTitle =
    chapterOutlinePrefill?.title ??
    (shortStoryProject
      ? `单元 ${nextChapterNumber}`
      : `第 ${nextChapterNumber} 章`);

  return (
    <ChapterForm
      action={createChapter.bind(null, project.id)}
      initialValues={{
        chapterNumber: nextChapterNumber,
        goal: chapterOutlinePrefill?.goal,
        title: defaultChapterTitle,
        unitWordTarget: shortStoryProject
          ? unitRecommendation.unitWordTarget
          : 0,
      }}
      formMessage={
        chapterError === "duplicate-number"
          ? `这个${shortStoryProject ? "单元序号" : "章节号"}已经存在，请改用其他编号。`
          : undefined
      }
      project={project}
      submitLabel={shortStoryProject ? "创建写作单元" : "创建章节"}
      subtitle={
        shortStoryProject
          ? `建议全篇拆成 ${unitRecommendation.unitCount} 个内部写作单元，每单元约 ${unitRecommendation.unitWordTarget.toLocaleString("zh-CN")} 字。先确认本单元的目标、冲突、转折和兑现任务，保存后再生成细化节拍与正文。`
          : chapterOutlinePrefill
          ? `已读取第 ${nextChapterNumber} 章章节大纲“${
              chapterOutlinePrefill.sourceOutlineTitle ?? defaultChapterTitle
            }”，可调整后保存。保存后进入章节详情页，再用 AI 生成节拍和草稿。`
          : "只需要先填写章节号、标题和目标。保存后进入章节详情页，再用 AI 生成节拍和草稿。"
      }
      title={shortStoryProject ? "新建写作单元" : "新建章节"}
    />
  );
}
