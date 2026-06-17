import { notFound } from "next/navigation";
import { updateProject } from "@/app/projects/actions";
import { ProjectForm } from "@/components/project-form";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type EditProjectPageProps = {
  params: Promise<{
    projectId: string;
  }>;
};

export default async function EditProjectPage({ params }: EditProjectPageProps) {
  const { projectId } = await params;
  const project = await prisma.project.findUnique({
    where: {
      id: projectId,
    },
  });

  if (!project) {
    notFound();
  }

  return (
    <ProjectForm
      action={updateProject.bind(null, project.id)}
      project={project}
      submitLabel="保存修改"
      subtitle="这些基础字段会作为后续总设定档、章节生成和公众号发布包装的初始上下文。"
      title="编辑小说项目"
    />
  );
}

