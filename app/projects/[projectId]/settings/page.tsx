import { notFound } from "next/navigation";
import { saveProjectSetting } from "@/app/projects/[projectId]/settings/actions";
import { ProjectSettingForm } from "@/components/settings/project-setting-form";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type ProjectSettingPageProps = {
  params: Promise<{
    projectId: string;
  }>;
};

export default async function ProjectSettingPage({
  params,
}: ProjectSettingPageProps) {
  const { projectId } = await params;
  const project = await prisma.project.findUnique({
    where: {
      id: projectId,
    },
    include: {
      setting: true,
      _count: {
        select: {
          settingVersions: true,
        },
      },
    },
  });

  if (!project) {
    notFound();
  }

  return (
    <ProjectSettingForm
      action={saveProjectSetting.bind(null, project.id)}
      project={project}
      setting={project.setting}
      versionCount={project._count.settingVersions}
    />
  );
}

