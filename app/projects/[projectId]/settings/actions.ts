"use server";

import { revalidatePath } from "next/cache";
import { notFound, redirect } from "next/navigation";
import { z } from "zod";
import {
  buildProjectSettingGenerationContext,
  hasProjectSettingDraftValues,
  parseProjectSettingGenerationOutput,
} from "@/lib/ai/project-settings";
import { ensureDefaultPromptTemplate } from "@/lib/ai/prompt-template-store";
import { activeAiTaskStatuses } from "@/lib/ai/status";
import { startLoggedOpenAITextTask } from "@/lib/ai/task-logger";
import {
  projectSettingFields,
  projectSettingSnapshot,
  projectSettingValuesFromRecord,
  type ProjectSettingFieldName,
  type ProjectSettingValues,
} from "@/lib/project-setting-fields";
import { prisma } from "@/lib/prisma";

const projectSettingTemplateKey = "project_setting_generation";

const settingSchema = z.object(
  Object.fromEntries(
    projectSettingFields.map((field) => [
      field.name,
      z
        .preprocess(
          (value) =>
            typeof value === "string" && value.trim() === ""
              ? ""
              : value,
          z.string().trim().max(8000),
        )
        .default(""),
    ]),
  ) as Record<
    ProjectSettingFieldName,
    z.ZodDefault<z.ZodEffects<z.ZodString, string, unknown>>
  >,
);

const changeReasonSchema = z
  .preprocess(
    (value) =>
      typeof value === "string" && value.trim() === "" ? undefined : value,
    z.string().trim().max(1000).optional(),
  );

function parseSettingForm(formData: FormData) {
  const values = settingSchema.parse(
    Object.fromEntries(
      projectSettingFields.map((field) => [field.name, formData.get(field.name)]),
    ),
  ) as ProjectSettingValues;

  const changeReason = changeReasonSchema.parse(formData.get("changeReason"));

  return {
    values,
    changeReason,
  };
}

export async function saveProjectSetting(projectId: string, formData: FormData) {
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

  const { values, changeReason } = parseSettingForm(formData);
  const snapshot = projectSettingSnapshot(values);

  await prisma.$transaction(async (tx) => {
    const setting = await tx.projectSetting.upsert({
      where: {
        projectId,
      },
      create: {
        projectId,
        ...snapshot,
      },
      update: snapshot,
    });

    const versionCount = await tx.settingVersion.count({
      where: {
        projectId,
      },
    });

    await tx.settingVersion.create({
      data: {
        projectId,
        settingId: setting.id,
        versionNumber: versionCount + 1,
        snapshotJson: JSON.stringify(snapshot),
        changeReason,
        sourceType: "manual",
      },
    });
  });

  revalidatePath(`/projects/${projectId}`);
  revalidatePath(`/projects/${projectId}/settings`);
  revalidatePath(`/projects/${projectId}/settings/history`);
  redirect(`/projects/${projectId}/settings`);
}

export async function generateProjectSettingDraft(projectId: string) {
  const activeTask = await findActiveProjectSettingGenerationTask(projectId);

  if (activeTask) {
    revalidateProjectSettingPaths(projectId);
    redirect(`/projects/${projectId}/settings`);
  }

  const project = await prisma.project.findUnique({
    where: {
      id: projectId,
    },
    include: {
      setting: true,
    },
  });

  if (!project) {
    notFound();
  }

  const template = await ensureDefaultPromptTemplate(
    projectId,
    projectSettingTemplateKey,
  );
  const context = buildProjectSettingGenerationContext({
    project,
    setting: project.setting,
  });

  await startLoggedOpenAITextTask(
    {
      projectId,
      promptTemplateId: template.id,
      taskType: template.taskType,
      model: undefined,
      inputContextSummary: context.inputContextSummary,
      inputJson: context.inputJson,
    },
    {
      systemPrompt: template.systemPrompt,
      developerPrompt: [
        template.userPrompt,
        template.contextNotes,
        template.responseSchema
          ? `请严格输出符合以下 JSON Schema 的 JSON：\n${template.responseSchema}`
          : "",
      ]
        .filter(Boolean)
        .join("\n\n"),
      input: context.inputText,
    },
  );

  revalidateProjectSettingPaths(projectId);
  redirect(`/projects/${projectId}/settings`);
}

export async function adoptProjectSettingDraft(
  projectId: string,
  taskId: string,
) {
  const task = await prisma.aiTask.findFirst({
    where: {
      id: taskId,
      projectId,
      taskType: projectSettingTemplateKey,
      status: "completed",
    },
    select: {
      id: true,
      inputContextSummary: true,
      outputText: true,
    },
  });

  if (!task) {
    notFound();
  }

  const draftValues = parseProjectSettingGenerationOutput(task.outputText);

  if (!hasProjectSettingDraftValues(draftValues)) {
    revalidateProjectSettingPaths(projectId);
    redirect(`/projects/${projectId}/settings`);
  }

  await prisma.$transaction(async (tx) => {
    const currentSetting = await tx.projectSetting.findUnique({
      where: {
        projectId,
      },
    });
    const values = {
      ...projectSettingValuesFromRecord(currentSetting),
      ...draftValues,
    };
    const snapshot = projectSettingSnapshot(values);
    const setting = await tx.projectSetting.upsert({
      where: {
        projectId,
      },
      create: {
        projectId,
        ...snapshot,
      },
      update: snapshot,
    });
    const versionCount = await tx.settingVersion.count({
      where: {
        projectId,
      },
    });

    await tx.settingVersion.create({
      data: {
        projectId,
        settingId: setting.id,
        versionNumber: versionCount + 1,
        snapshotJson: JSON.stringify(snapshot),
        changeReason: `采用 AI 总设定草案：${task.inputContextSummary}`,
        sourceType: "ai_project_setting",
      },
    });

    await tx.aiTask.update({
      where: {
        id: task.id,
      },
      data: {
        adoptionState: "adopted",
      },
    });
  });

  revalidateProjectSettingPaths(projectId);
  redirect(`/projects/${projectId}/settings`);
}

async function findActiveProjectSettingGenerationTask(projectId: string) {
  return prisma.aiTask.findFirst({
    where: {
      projectId,
      taskType: projectSettingTemplateKey,
      status: {
        in: [...activeAiTaskStatuses],
      },
    },
    select: {
      id: true,
    },
  });
}

function revalidateProjectSettingPaths(projectId: string) {
  revalidatePath(`/projects/${projectId}`);
  revalidatePath(`/projects/${projectId}/acceptance`);
  revalidatePath(`/projects/${projectId}/settings`);
  revalidatePath(`/projects/${projectId}/settings/history`);
}
