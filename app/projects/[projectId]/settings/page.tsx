import { notFound } from "next/navigation";
import {
  adoptProjectSettingDraft,
  generateProjectSettingDraft,
  saveProjectSetting,
} from "@/app/projects/[projectId]/settings/actions";
import { AutoRefresh } from "@/components/auto-refresh";
import { ProjectSettingForm } from "@/components/settings/project-setting-form";
import { hasConfiguredOpenAIKey } from "@/lib/ai/openai-client";
import { activeAiTaskStatuses, isActiveAiTaskStatus } from "@/lib/ai/status";
import {
  staleAiTaskCutoff,
  staleAiTaskErrorMessage,
} from "@/lib/ai/task-timeouts";
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
  await expireStaleProjectSettingAiTasks(projectId);

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
      aiTasks: {
        where: {
          taskType: "project_setting_generation",
        },
        include: {
          promptTemplate: {
            select: {
              name: true,
              version: true,
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
        take: 5,
      },
    },
  });

  if (!project) {
    notFound();
  }

  const hasActiveAiTasks = project.aiTasks.some((task) =>
    isActiveAiTaskStatus(task.status),
  );

  return (
    <>
      <AutoRefresh enabled={hasActiveAiTasks} />
      <ProjectSettingForm
        action={saveProjectSetting.bind(null, project.id)}
        adoptProjectSettingAction={adoptProjectSettingDraft.bind(null, project.id)}
        aiTasks={project.aiTasks}
        generateProjectSettingAction={generateProjectSettingDraft.bind(
          null,
          project.id,
        )}
        hasApiKey={hasConfiguredOpenAIKey()}
        project={project}
        setting={project.setting}
        versionCount={project._count.settingVersions}
      />
    </>
  );
}

async function expireStaleProjectSettingAiTasks(projectId: string) {
  const now = new Date();
  const cutoff = staleAiTaskCutoff(now);

  await prisma.aiTask.updateMany({
    where: {
      projectId,
      taskType: "project_setting_generation",
      status: {
        in: [...activeAiTaskStatuses],
      },
      OR: [
        {
          startedAt: {
            lt: cutoff,
          },
        },
        {
          startedAt: null,
          createdAt: {
            lt: cutoff,
          },
        },
      ],
    },
    data: {
      status: "failed",
      errorMessage: staleAiTaskErrorMessage,
      completedAt: now,
    },
  });
}
