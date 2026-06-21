import { notFound } from "next/navigation";
import { createChapter } from "@/app/projects/[projectId]/chapters/actions";
import { ChapterForm } from "@/components/chapters/chapter-form";
import {
  buildChapterOutlinePrefill,
  selectChapterOutlineForPrefill,
} from "@/lib/chapter-outline-prefill";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type NewChapterPageProps = {
  params: Promise<{
    projectId: string;
  }>;
};

export default async function NewChapterPage({ params }: NewChapterPageProps) {
  const { projectId } = await params;
  const project = await prisma.project.findUnique({
    where: {
      id: projectId,
    },
  });

  if (!project) {
    notFound();
  }

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
  const matchingChapterOutlines = await prisma.outline.findMany({
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
    chapterOutlinePrefill?.title ?? `第 ${nextChapterNumber} 章`;

  return (
    <ChapterForm
      action={createChapter.bind(null, project.id)}
      initialValues={{
        chapterNumber: nextChapterNumber,
        goal: chapterOutlinePrefill?.goal,
        title: defaultChapterTitle,
      }}
      project={project}
      submitLabel="创建章节"
      subtitle={
        chapterOutlinePrefill
          ? `已读取第 ${nextChapterNumber} 章章节大纲“${
              chapterOutlinePrefill.sourceOutlineTitle ?? defaultChapterTitle
            }”，可调整后保存。保存后进入章节详情页，再用 AI 生成节拍和草稿。`
          : "只需要先填写章节号、标题和目标。保存后进入章节详情页，再用 AI 生成节拍和草稿。"
      }
      title="新建章节"
    />
  );
}
