"use server";

import { revalidatePath } from "next/cache";
import { notFound, redirect } from "next/navigation";
import { z } from "zod";
import {
  buildCharacterGenerationContext,
  hasCharacterDraftValues,
  parseCharacterGenerationOutput,
} from "@/lib/ai/characters";
import {
  characterGenerationTaskType,
  expireStaleCharacterAiTasks,
} from "@/lib/ai/character-task-maintenance";
import { ensureDefaultPromptTemplate } from "@/lib/ai/prompt-template-store";
import { activeAiTaskStatuses } from "@/lib/ai/status";
import { startLoggedOpenAITextTask } from "@/lib/ai/task-logger";
import {
  characterFieldNames,
  characterSnapshot,
  characterStatusOptions,
  characterTextFields,
  type CharacterFieldName,
  type CharacterTextFieldName,
  type CharacterValues,
} from "@/lib/character-fields";
import { prisma } from "@/lib/prisma";

const characterGenerationTemplateKey = characterGenerationTaskType;

const optionalCharacterText = z
  .preprocess(
    (value) => (typeof value === "string" && value.trim() === "" ? "" : value),
    z.string().trim().max(8000),
  )
  .default("");

const statusValues = characterStatusOptions.map((option) => option.value) as [
  string,
  ...string[],
];

const characterSchema = z.object({
  name: z.string().trim().min(1, "请输入角色姓名").max(120),
  status: z.enum(statusValues).default("active"),
  ...(Object.fromEntries(
    characterTextFields.map((field) => [field.name, optionalCharacterText]),
  ) as Record<
    CharacterTextFieldName,
    z.ZodDefault<z.ZodEffects<z.ZodString, string, unknown>>
  >),
});

const changeReasonSchema = z
  .preprocess(
    (value) =>
      typeof value === "string" && value.trim() === "" ? undefined : value,
    z.string().trim().max(1000).optional(),
  );

const characterGenerationRequestSchema = z.object({
  targetRole: z
    .preprocess(
      (value) =>
        typeof value === "string" && value.trim() === "" ? "" : value,
      z.string().trim().max(120),
    )
    .default(""),
  brief: z
    .preprocess(
      (value) =>
        typeof value === "string" && value.trim() === "" ? "" : value,
      z.string().trim().max(3000),
    )
    .default(""),
});

function parseCharacterForm(formData: FormData) {
  const values = characterSchema.parse(
    Object.fromEntries(
      characterFieldNames.map((fieldName) => [
        fieldName,
        formData.get(fieldName),
      ]),
    ),
  ) as CharacterValues;

  const changeReason = changeReasonSchema.parse(formData.get("changeReason"));

  return {
    values,
    changeReason,
  };
}

function parseCharacterGenerationRequest(formData: FormData) {
  return characterGenerationRequestSchema.parse({
    targetRole: formData.get("targetRole"),
    brief: formData.get("brief"),
  });
}

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

export async function createCharacter(projectId: string, formData: FormData) {
  await assertProject(projectId);

  const { values, changeReason } = parseCharacterForm(formData);
  const snapshot = characterSnapshot(values);

  const character = await prisma.$transaction(async (tx) => {
    const createdCharacter = await tx.character.create({
      data: {
        projectId,
        ...snapshot,
      },
    });

    await tx.characterVersion.create({
      data: {
        projectId,
        characterId: createdCharacter.id,
        versionNumber: 1,
        snapshotJson: JSON.stringify(snapshot),
        changeReason,
        sourceType: "manual",
      },
    });

    return createdCharacter;
  });

  revalidatePath(`/projects/${projectId}`);
  revalidatePath(`/projects/${projectId}/characters`);
  redirect(`/projects/${projectId}/characters/${character.id}`);
}

export async function updateCharacter(
  projectId: string,
  characterId: string,
  formData: FormData,
) {
  const character = await prisma.character.findFirst({
    where: {
      id: characterId,
      projectId,
    },
    select: {
      id: true,
    },
  });

  if (!character) {
    notFound();
  }

  const { values, changeReason } = parseCharacterForm(formData);
  const snapshot = characterSnapshot(values);

  await prisma.$transaction(async (tx) => {
    await tx.character.update({
      where: {
        id: characterId,
      },
      data: snapshot,
    });

    const versionCount = await tx.characterVersion.count({
      where: {
        characterId,
      },
    });

    await tx.characterVersion.create({
      data: {
        projectId,
        characterId,
        versionNumber: versionCount + 1,
        snapshotJson: JSON.stringify(snapshot),
        changeReason,
        sourceType: "manual",
      },
    });
  });

  revalidatePath(`/projects/${projectId}`);
  revalidatePath(`/projects/${projectId}/characters`);
  revalidatePath(`/projects/${projectId}/characters/${characterId}`);
  revalidatePath(`/projects/${projectId}/characters/${characterId}/history`);
  redirect(`/projects/${projectId}/characters/${characterId}`);
}

export async function deleteCharacter(projectId: string, characterId: string) {
  const character = await prisma.character.findFirst({
    where: {
      id: characterId,
      projectId,
    },
    select: {
      id: true,
    },
  });

  if (!character) {
    notFound();
  }

  await prisma.character.delete({
    where: {
      id: characterId,
    },
  });

  revalidatePath(`/projects/${projectId}`);
  revalidatePath(`/projects/${projectId}/characters`);
  redirect(`/projects/${projectId}/characters`);
}

export async function generateCharacterDraft(
  projectId: string,
  formData: FormData,
) {
  await assertProject(projectId);
  await expireStaleCharacterAiTasks(projectId);

  const activeTask = await findActiveCharacterGenerationTask(projectId);

  if (activeTask) {
    revalidateCharacterPaths(projectId);
    redirect(`/projects/${projectId}/characters?characterError=activeCharacterTask`);
  }

  const request = parseCharacterGenerationRequest(formData);
  const [project, characters, relationships, outlines] = await Promise.all([
    prisma.project.findUnique({
      where: {
        id: projectId,
      },
      include: {
        setting: true,
      },
    }),
    prisma.character.findMany({
      where: {
        projectId,
        status: {
          not: "archived",
        },
      },
      orderBy: [
        {
          status: "asc",
        },
        {
          updatedAt: "desc",
        },
      ],
      take: 24,
    }),
    prisma.characterRelationship.findMany({
      where: {
        projectId,
        status: {
          not: "archived",
        },
      },
      include: {
        sourceCharacter: {
          select: {
            name: true,
          },
        },
        targetCharacter: {
          select: {
            name: true,
          },
        },
      },
      orderBy: {
        updatedAt: "desc",
      },
      take: 30,
    }),
    prisma.outline.findMany({
      where: {
        projectId,
        status: {
          not: "archived",
        },
      },
      orderBy: [
        {
          level: "asc",
        },
        {
          sortOrder: "asc",
        },
        {
          updatedAt: "desc",
        },
      ],
      take: 16,
    }),
  ]);

  if (!project) {
    notFound();
  }

  const template = await ensureDefaultPromptTemplate(
    projectId,
    characterGenerationTemplateKey,
  );
  const context = buildCharacterGenerationContext({
    project,
    setting: project.setting,
    characters,
    relationships,
    outlines,
    request,
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

  revalidateCharacterPaths(projectId);
  revalidatePath(`/projects/${projectId}/ai`);
  redirect(`/projects/${projectId}/characters`);
}

export async function adoptCharacterDraft(projectId: string, taskId: string) {
  await assertProject(projectId);

  const task = await prisma.aiTask.findFirst({
    where: {
      id: taskId,
      projectId,
      taskType: characterGenerationTemplateKey,
      status: "completed",
    },
    select: {
      id: true,
      inputContextSummary: true,
      outputText: true,
      adoptionState: true,
    },
  });

  if (!task) {
    notFound();
  }

  if (task.adoptionState !== "not_reviewed") {
    revalidateCharacterPaths(projectId);
    redirect(`/projects/${projectId}/characters`);
  }

  const draft = parseCharacterGenerationOutput(task.outputText);

  if (!hasCharacterDraftValues(draft.values)) {
    revalidateCharacterPaths(projectId);
    redirect(`/projects/${projectId}/characters?characterError=invalidCharacterDraft`);
  }

  const draftValues = {
    ...Object.fromEntries(
      characterFieldNames.map((fieldName) => [fieldName, ""]),
    ),
    status: "active",
    ...draft.values,
  } as CharacterValues;

  if (!statusValues.includes(draftValues.status)) {
    draftValues.status = "active";
  }

  const values = characterSnapshot(draftValues);

  const createdCharacterId = await prisma.$transaction(async (tx) => {
    const adopted = await tx.aiTask.updateMany({
      where: {
        id: task.id,
        adoptionState: "not_reviewed",
      },
      data: {
        adoptionState: "adopted",
      },
    });

    if (adopted.count !== 1) {
      return null;
    }

    const character = await tx.character.create({
      data: {
        projectId,
        ...values,
        notes: [
          values.notes,
          draft.suggestedRelationships.length > 0
            ? `AI 建议关系：\n${draft.suggestedRelationships.join("\n")}`
            : "",
        ]
          .filter(Boolean)
          .join("\n\n"),
      },
    });

    await tx.characterVersion.create({
      data: {
        projectId,
        characterId: character.id,
        versionNumber: 1,
        snapshotJson: JSON.stringify({
          ...values,
          notes: character.notes,
        }),
        changeReason: `采用 AI 人物草案：${task.inputContextSummary}`,
        sourceType: "ai_character_generation",
      },
    });

    return character.id;
  });

  revalidateCharacterPaths(projectId);
  revalidatePath(`/projects/${projectId}/ai`);

  if (!createdCharacterId) {
    redirect(`/projects/${projectId}/characters`);
  }

  redirect(`/projects/${projectId}/characters/${createdCharacterId}`);
}

async function findActiveCharacterGenerationTask(projectId: string) {
  return prisma.aiTask.findFirst({
    where: {
      projectId,
      taskType: characterGenerationTemplateKey,
      status: {
        in: [...activeAiTaskStatuses],
      },
    },
    select: {
      id: true,
    },
  });
}

function revalidateCharacterPaths(projectId: string) {
  revalidatePath(`/projects/${projectId}`);
  revalidatePath(`/projects/${projectId}/characters`);
}
