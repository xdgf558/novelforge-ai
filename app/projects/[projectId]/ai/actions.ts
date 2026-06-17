"use server";

import { revalidatePath } from "next/cache";
import { notFound, redirect } from "next/navigation";
import { DEFAULT_AI_PROMPT_TEMPLATES } from "@/lib/ai/prompt-templates";
import { stringifyAiTaskPayload } from "@/lib/ai/task-logger";
import {
  getConfiguredOpenAIModel,
  hasConfiguredOpenAIKey,
} from "@/lib/ai/openai-client";
import { prisma } from "@/lib/prisma";

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

  await prisma.$transaction(
    DEFAULT_AI_PROMPT_TEMPLATES.map((template) =>
      prisma.aiPromptTemplate.upsert({
        where: {
          projectId_key_version: {
            projectId,
            key: template.key,
            version: template.version,
          },
        },
        create: {
          projectId,
          key: template.key,
          name: template.name,
          taskType: template.taskType,
          version: template.version,
          outputFormat: template.outputFormat,
          systemPrompt: template.systemPrompt,
          userPrompt: template.userPrompt,
          contextNotes: template.contextNotes,
          responseSchema: template.responseSchema,
          status: "active",
        },
        update: {
          name: template.name,
          taskType: template.taskType,
          outputFormat: template.outputFormat,
          systemPrompt: template.systemPrompt,
          userPrompt: template.userPrompt,
          contextNotes: template.contextNotes,
          responseSchema: template.responseSchema,
          status: "active",
        },
      }),
    ),
  );

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

  revalidatePath(`/projects/${projectId}`);
  revalidatePath(`/projects/${projectId}/ai`);
  redirect(`/projects/${projectId}/ai`);
}
