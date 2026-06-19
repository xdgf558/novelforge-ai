import { notFound } from "next/navigation";
import { createChapter } from "@/app/projects/[projectId]/chapters/actions";
import { ChapterForm } from "@/components/chapters/chapter-form";
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

  return (
    <ChapterForm
      action={createChapter.bind(null, project.id)}
      initialValues={{
        chapterNumber: nextChapterNumber,
        title: `第 ${nextChapterNumber} 章`,
      }}
      project={project}
      submitLabel="创建章节"
      subtitle="只需要先填写章节号、标题和目标。保存后进入章节详情页，再用 AI 生成节拍和草稿。"
      title="新建章节"
    />
  );
}
