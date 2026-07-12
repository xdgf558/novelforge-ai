import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, FileDown } from "lucide-react";
import { ManuscriptExportWorkspace } from "@/components/short-stories/manuscript-export-workspace";
import { prisma } from "@/lib/prisma";
import {
  buildProjectJsonExport,
  buildProjectMarkdownExport,
} from "@/lib/project-export";
import {
  buildExportData,
  projectPublishInclude,
} from "@/lib/project-export-data";

export const dynamic = "force-dynamic";

type ShortStoryManuscriptPageProps = {
  params: Promise<{ projectId: string }>;
};

export default async function ShortStoryManuscriptPage({
  params,
}: ShortStoryManuscriptPageProps) {
  const { projectId } = await params;
  const project = await prisma.project.findFirst({
    where: {
      id: projectId,
      workType: "short_story",
    },
    include: projectPublishInclude,
  });

  if (!project) {
    notFound();
  }

  const exportData = buildExportData(project);

  return (
    <div className="space-y-7">
      <header className="border-b border-ink-950/10 pb-5">
        <Link
          className="inline-flex items-center gap-2 text-sm font-medium text-ink-700 transition hover:text-signal-600"
          href={`/projects/${project.id}`}
        >
          <ArrowLeft aria-hidden="true" className="h-4 w-4" />
          返回短故事创作台
        </Link>
        <div className="mt-4 flex items-start gap-3">
          <FileDown
            aria-hidden="true"
            className="mt-1 h-6 w-6 shrink-0 text-signal-600"
          />
          <div>
            <p className="text-sm font-semibold text-signal-600">
              {project.title}
            </p>
            <h1 className="mt-2 text-2xl font-semibold tracking-normal text-ink-950">
              成稿导出
            </h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-ink-700">
              按写作单元顺序组装作者确认的定稿正文，移除内部工作痕迹并生成可复制、TXT 和 Markdown 成稿。整个过程只在浏览器中确定性处理，不写回正文。
            </p>
          </div>
        </div>
      </header>

      <ManuscriptExportWorkspace
        projectId={project.id}
        projectJsonExport={buildProjectJsonExport(exportData)}
        projectMarkdownExport={buildProjectMarkdownExport(exportData)}
        projectTitle={project.title}
        targetWordCount={project.totalWordTarget}
        units={project.chapters}
      />
    </div>
  );
}
