"use server";

import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { notFound, redirect } from "next/navigation";
import {
  findDefaultPromptTemplate,
  syncDefaultPromptTemplatesForProject,
} from "@/lib/ai/prompt-template-store";
import { pruneProjectAiTasks } from "@/lib/ai/task-retention";
import { stringifyAiTaskPayload } from "@/lib/ai/task-logger";
import {
  getConfiguredOpenAIModel,
  hasConfiguredOpenAIKey,
} from "@/lib/ai/openai-client";
import { prisma } from "@/lib/prisma";

type PromptTemplateCopySource = {
  contextNotes: string | null;
  key: string;
  name: string;
  outputFormat: string;
  responseSchema: string | null;
  systemPrompt: string;
  taskType: string;
  userPrompt: string;
  version: number;
};

async function assertProject(projectId: string) {
  const project = await prisma.project.findUnique({
    where: {
      id: projectId,
    },
    select: {
      id: true,
    },
  });

  if (!project) {
    notFound();
  }
}

export async function syncDefaultPromptTemplates(projectId: string) {
  await assertProject(projectId);

  await syncDefaultPromptTemplatesForProject(projectId);

  revalidatePath(`/projects/${projectId}`);
  revalidatePath(`/projects/${projectId}/ai`);
  redirect(`/projects/${projectId}/ai`);
}

export async function recordLocalAiReadinessCheck(projectId: string) {
  await assertProject(projectId);

  const model = getConfiguredOpenAIModel();
  const hasApiKey = hasConfiguredOpenAIKey();
  const completedAt = new Date();

  await prisma.aiTask.create({
    data: {
      projectId,
      taskType: "ai_readiness_check",
      model,
      status: "completed",
      adoptionState: "not_reviewed",
      inputContextSummary: "本地 AI 任务记录管线检查，未调用外部模型。",
      inputJson: stringifyAiTaskPayload({
        model,
        hasApiKey,
        externalCall: false,
      }),
      outputText: hasApiKey
        ? "AI 任务记录已就绪，服务端已检测到 API key。"
        : "AI 任务记录已就绪，尚未配置 API key。",
      outputJson: stringifyAiTaskPayload({
        aiTaskLogging: "ready",
        serverOnlyKeyAccess: true,
        externalCall: false,
      }),
      startedAt: completedAt,
      completedAt,
    },
  });

  await pruneProjectAiTasks(projectId);

  revalidatePath(`/projects/${projectId}`);
  revalidatePath(`/projects/${projectId}/ai`);
  redirect(`/projects/${projectId}/ai`);
}

export async function copyPromptTemplateVersion(
  projectId: string,
  templateId: string,
) {
  await assertProject(projectId);

  const template = await prisma.aiPromptTemplate.findFirst({
    where: {
      id: templateId,
      projectId,
    },
  });

  if (!template) {
    notFound();
  }

  await createPromptTemplateCopy(projectId, template);

  revalidatePath(`/projects/${projectId}`);
  revalidatePath(`/projects/${projectId}/ai`);
  redirect(`/projects/${projectId}/ai?templateStatus=copied`);
}

async function createPromptTemplateCopy(
  projectId: string,
  template: PromptTemplateCopySource,
) {
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const latest = await prisma.aiPromptTemplate.aggregate({
      where: {
        projectId,
        key: template.key,
      },
      _max: {
        version: true,
      },
    });
    const nextVersion = (latest._max.version ?? template.version) + 1;

    try {
      await prisma.aiPromptTemplate.create({
        data: {
          projectId,
          key: template.key,
          name: `${template.name} 副本`,
          taskType: template.taskType,
          version: nextVersion,
          outputFormat: template.outputFormat,
          systemPrompt: template.systemPrompt,
          userPrompt: template.userPrompt,
          contextNotes: template.contextNotes,
          responseSchema: template.responseSchema,
          status: "active",
        },
      });
      return;
    } catch (error) {
      if (!isUniqueConstraintError(error) || attempt === 1) {
        throw error;
      }
    }
  }
}

function isUniqueConstraintError(error: unknown) {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002"
  );
}

export async function togglePromptTemplateStatus(
  projectId: string,
  templateId: string,
) {
  await assertProject(projectId);

  const template = await prisma.aiPromptTemplate.findFirst({
    where: {
      id: templateId,
      projectId,
    },
    select: {
      id: true,
      key: true,
      status: true,
    },
  });

  if (!template) {
    notFound();
  }

  if (template.status === "active") {
    const activeCount = await prisma.aiPromptTemplate.count({
      where: {
        projectId,
        key: template.key,
        status: "active",
      },
    });

    if (activeCount <= 1) {
      revalidatePath(`/projects/${projectId}/ai`);
      redirect(`/projects/${projectId}/ai?templateError=lastActive`);
    }
  }

  await prisma.aiPromptTemplate.update({
    where: {
      id: template.id,
    },
    data: {
      status: template.status === "active" ? "inactive" : "active",
    },
  });

  revalidatePath(`/projects/${projectId}`);
  revalidatePath(`/projects/${projectId}/ai`);
  redirect(`/projects/${projectId}/ai?templateStatus=toggled`);
}

export async function resetPromptTemplateToDefault(
  projectId: string,
  templateId: string,
) {
  await assertProject(projectId);

  const template = await prisma.aiPromptTemplate.findFirst({
    where: {
      id: templateId,
      projectId,
    },
  });

  if (!template) {
    notFound();
  }

  const defaultTemplate = findDefaultPromptTemplate(template.key);

  if (!defaultTemplate) {
    revalidatePath(`/projects/${projectId}/ai`);
    redirect(`/projects/${projectId}/ai?templateError=noDefault`);
  }

  await prisma.aiPromptTemplate.update({
    where: {
      id: template.id,
    },
    data: {
      name: defaultTemplate.name,
      taskType: defaultTemplate.taskType,
      outputFormat: defaultTemplate.outputFormat,
      systemPrompt: defaultTemplate.systemPrompt,
      userPrompt: defaultTemplate.userPrompt,
      contextNotes: defaultTemplate.contextNotes,
      responseSchema: defaultTemplate.responseSchema,
      status: "active",
    },
  });

  revalidatePath(`/projects/${projectId}`);
  revalidatePath(`/projects/${projectId}/ai`);
  redirect(`/projects/${projectId}/ai?templateStatus=reset`);
}
