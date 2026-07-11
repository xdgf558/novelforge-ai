import { notFound } from "next/navigation";
import { updateChapter } from "@/app/projects/[projectId]/chapters/actions";
import { ChapterForm } from "@/components/chapters/chapter-form";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type EditChapterPageProps = {
  params: Promise<{
    projectId: string;
    chapterId: string;
  }>;
  searchParams?: Promise<{
    chapterError?: string;
    finalizeError?: string;
    findText?: string;
    focusField?: string;
  }>;
};

export default async function EditChapterPage({
  params,
  searchParams,
}: EditChapterPageProps) {
  const { projectId, chapterId } = await params;
  const { chapterError, finalizeError, findText, focusField } =
    (await searchParams) ?? {};
  const chapter = await prisma.chapter.findFirst({
    where: {
      id: chapterId,
      projectId,
    },
    include: {
      project: true,
      _count: {
        select: {
          versions: true,
        },
      },
    },
  });

  if (!chapter) {
    notFound();
  }

  const formMessage =
    chapterError === "duplicate-number"
      ? "这个章节号已经存在，请改用其他章节号。"
      : finalizeError === "missingPolishedText"
      ? "精修正文为空，无法一键定稿。请先保存精修正文，或采用 AI 精修稿后再定稿。"
      : finalizeError === "missingDraftText"
        ? "草稿正文为空，无法一键定稿。请先保存草稿正文后再定稿。"
        : undefined;

  return (
    <ChapterForm
      action={updateChapter.bind(null, chapter.project.id, chapter.id)}
      chapter={chapter}
      editLocator={
        focusField
          ? {
              fieldName: focusField,
              findText,
            }
          : undefined
      }
      formMessage={formMessage}
      project={chapter.project}
      submitLabel="保存并记录版本"
      subtitle="章节资料会作为后续摘要提取、AI 生成和连续性检查的重要记忆；保存后会生成新的章节快照。"
      title="编辑章节"
      versionCount={chapter._count.versions}
    />
  );
}
