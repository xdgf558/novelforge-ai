import { notFound } from "next/navigation";
import {
  adoptShortStoryBlueprintDraft,
  generateShortStoryBlueprintDraft,
  rejectShortStoryBlueprintDraft,
  saveShortStoryBlueprint,
} from "./actions";
import { AutoRefresh } from "@/components/auto-refresh";
import { ShortStoryBlueprintWorkspace } from "@/components/short-stories/blueprint-workspace";
import { hasConfiguredOpenAIKey } from "@/lib/ai/openai-client";
import { expireStaleShortStoryBlueprintTasks } from "@/lib/ai/short-story-blueprint-task-maintenance";
import { shortStoryBlueprintTaskType } from "@/lib/ai/short-story-blueprints";
import { isActiveAiTaskStatus } from "@/lib/ai/status";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type ShortStoryBlueprintPageProps = {
  params: Promise<{
    projectId: string;
  }>;
  searchParams?: Promise<{
    blueprintError?: string;
  }>;
};

export default async function ShortStoryBlueprintPage({
  params,
  searchParams,
}: ShortStoryBlueprintPageProps) {
  const { projectId } = await params;
  const resolvedSearchParams = await searchParams;
  await expireStaleShortStoryBlueprintTasks(projectId);

  const project = await prisma.project.findFirst({
    where: {
      id: projectId,
      workType: "short_story",
    },
    include: {
      shortStoryBlueprint: true,
      _count: {
        select: {
          shortStoryBlueprintVersions: true,
        },
      },
      aiTasks: {
        where: {
          taskType: shortStoryBlueprintTaskType,
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

  const hasActiveTasks = project.aiTasks.some((task) =>
    isActiveAiTaskStatus(task.status),
  );

  return (
    <>
      <AutoRefresh enabled={hasActiveTasks} />
      <ShortStoryBlueprintWorkspace
        adoptAction={adoptShortStoryBlueprintDraft.bind(null, project.id)}
        blueprint={project.shortStoryBlueprint}
        errorMessage={blueprintErrorMessage(
          resolvedSearchParams?.blueprintError,
        )}
        generateAction={generateShortStoryBlueprintDraft.bind(null, project.id)}
        hasApiKey={hasConfiguredOpenAIKey()}
        project={project}
        rejectAction={rejectShortStoryBlueprintDraft.bind(null, project.id)}
        saveAction={saveShortStoryBlueprint.bind(null, project.id)}
        tasks={project.aiTasks}
        versionCount={project._count.shortStoryBlueprintVersions}
      />
    </>
  );
}

function blueprintErrorMessage(error?: string) {
  if (error === "empty") {
    return "正式蓝图至少需要填写一项内容。";
  }

  if (error === "invalidDraft") {
    return "这份 AI 草案缺少核心前提、核心冲突或结局，暂不能采用。可以重新生成或手动填写。";
  }

  if (error === "alreadyReviewed") {
    return "这份蓝图草案已经被处理，请查看最新正式版本。";
  }

  if (error === "invalidVersion") {
    return "历史蓝图快照无法读取，未修改当前正式蓝图。";
  }

  return null;
}
