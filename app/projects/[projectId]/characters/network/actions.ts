"use server";

import { revalidatePath } from "next/cache";
import { notFound, redirect } from "next/navigation";
import { z } from "zod";
import {
  buildCharacterRelationshipGenerationContext,
  characterRelationshipGenerationTaskType,
  parseCharacterRelationshipGenerationOutput,
  type ParsedCharacterRelationshipDraft,
} from "@/lib/ai/character-relationships";
import { expireStaleCharacterRelationshipAiTasks } from "@/lib/ai/character-relationship-task-maintenance";
import { hasConfiguredOpenAIKey } from "@/lib/ai/openai-client";
import { ensureDefaultPromptTemplate } from "@/lib/ai/prompt-template-store";
import { activeAiTaskStatuses } from "@/lib/ai/status";
import { startLoggedOpenAITextTask } from "@/lib/ai/task-logger";
import {
  normalizeRelationshipDirection,
  normalizeRelationshipStatus,
  normalizeRelationshipType,
} from "@/lib/character-relationship-fields";
import { prisma } from "@/lib/prisma";
import { assertProjectExists as assertProject } from "@/lib/server-actions/project-guards";

const optionalText = z
  .preprocess(
    (value) => {
      if (value == null) {
        return "";
      }

      return typeof value === "string" && value.trim() === "" ? "" : value;
    },
    z.string().trim().max(12000),
  )
  .default("");

const requiredRelationId = z.string().trim().min(1);
const requiredSummary = z.string().trim().min(1).max(12000);

const optionalRelationId = z
  .preprocess((value) => {
    if (typeof value !== "string" || value.trim() === "") {
      return null;
    }

    return value.trim();
  }, z.string().nullable())
  .default(null);

const relationshipSchema = z.object({
  sourceCharacterId: requiredRelationId,
  targetCharacterId: requiredRelationId,
  relationshipType: z
    .string()
    .optional()
    .transform((value) => normalizeRelationshipType(value)),
  direction: z
    .string()
    .optional()
    .transform((value) => normalizeRelationshipDirection(value)),
  status: z
    .string()
    .optional()
    .transform((value) => normalizeRelationshipStatus(value)),
  summary: requiredSummary,
  dynamics: optionalText,
  evidence: optionalText,
  sourceChapterId: optionalRelationId,
});

const relationshipAdoptionStatuses = ["active", "tension", "hidden"];

export async function createCharacterRelationship(
  projectId: string,
  formData: FormData,
) {
  await assertProject(projectId);
  const values = parseRelationshipForm(formData, projectId);
  await validateRelationshipReferences(projectId, values);
  await assertCreateRelationshipCharactersAreActive(projectId, values);
  await assertNoDuplicateRelationship(projectId, values);

  await prisma.characterRelationship.create({
    data: {
      projectId,
      ...values,
    },
  });

  revalidateRelationshipPaths(projectId);
  redirect(`/projects/${projectId}/characters/network`);
}

export async function updateCharacterRelationship(
  projectId: string,
  relationshipId: string,
  formData: FormData,
) {
  await assertProject(projectId);
  const values = parseRelationshipForm(formData, projectId);
  await validateRelationshipReferences(projectId, values);

  const relationship = await prisma.characterRelationship.findFirst({
    where: {
      id: relationshipId,
      projectId,
    },
    select: {
      id: true,
    },
  });

  if (!relationship) {
    redirectRelationshipError(projectId, "recordNotFound");
  }

  await assertNoDuplicateRelationship(projectId, values, relationshipId);

  await prisma.characterRelationship.update({
    where: {
      id: relationshipId,
    },
    data: values,
  });

  revalidateRelationshipPaths(projectId);
  redirect(`/projects/${projectId}/characters/network`);
}

export async function archiveCharacterRelationship(
  projectId: string,
  relationshipId: string,
) {
  await assertProject(projectId);

  const relationship = await prisma.characterRelationship.findFirst({
    where: {
      id: relationshipId,
      projectId,
    },
    select: {
      id: true,
    },
  });

  if (!relationship) {
    redirectRelationshipError(projectId, "recordNotFound");
  }

  await prisma.characterRelationship.update({
    where: {
      id: relationshipId,
    },
    data: {
      status: "archived",
    },
  });

  revalidateRelationshipPaths(projectId);
  redirect(`/projects/${projectId}/characters/network`);
}

export async function generateCharacterRelationshipDrafts(projectId: string) {
  await assertProject(projectId);

  if (!hasConfiguredOpenAIKey()) {
    revalidateRelationshipPaths(projectId);
    redirectRelationshipError(projectId, "missingApiKey");
  }

  await expireStaleCharacterRelationshipAiTasks(projectId);

  const activeTask = await findActiveCharacterRelationshipGenerationTask(projectId);

  if (activeTask) {
    revalidateRelationshipPaths(projectId);
    redirectRelationshipError(projectId, "activeRelationshipTask");
  }

  const [project, characters, relationships, outlines, recentChapters] =
    await Promise.all([
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
          {
            name: "asc",
          },
        ],
        take: 40,
      }),
      prisma.characterRelationship.findMany({
        where: {
          projectId,
          status: {
            not: "archived",
          },
          sourceCharacter: {
            status: {
              not: "archived",
            },
          },
          targetCharacter: {
            status: {
              not: "archived",
            },
          },
        },
        include: {
          sourceCharacter: {
            select: {
              id: true,
              name: true,
            },
          },
          targetCharacter: {
            select: {
              id: true,
              name: true,
            },
          },
          sourceChapter: {
            select: {
              chapterNumber: true,
              title: true,
            },
          },
        },
        orderBy: {
          updatedAt: "desc",
        },
        take: 80,
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
        take: 20,
      }),
      prisma.chapter.findMany({
        where: {
          projectId,
        },
        orderBy: {
          chapterNumber: "desc",
        },
        take: 6,
        select: {
          chapterNumber: true,
          title: true,
          status: true,
          goal: true,
          aiTasks: {
            where: {
              taskType: "chapter_summary_extraction",
              status: "completed",
            },
            orderBy: {
              createdAt: "desc",
            },
            take: 1,
            select: {
              outputText: true,
            },
          },
        },
      }),
    ]);

  if (!project) {
    notFound();
  }

  if (characters.length < 2) {
    revalidateRelationshipPaths(projectId);
    redirectRelationshipError(projectId, "notEnoughCharacters");
  }

  const template = await ensureDefaultPromptTemplate(
    projectId,
    characterRelationshipGenerationTaskType,
  );
  const context = buildCharacterRelationshipGenerationContext({
    project,
    setting: project.setting,
    characters,
    relationships,
    outlines,
    recentChapters: recentChapters.reverse().map((chapter) => ({
      ...chapter,
      summaryOutput: chapter.aiTasks[0]?.outputText ?? "",
    })),
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

  revalidateRelationshipPaths(projectId);
  revalidatePath(`/projects/${projectId}/ai`);
  redirect(`/projects/${projectId}/characters/network`);
}

export async function adoptCharacterRelationshipDrafts(
  projectId: string,
  taskId: string,
) {
  await assertProject(projectId);

  const task = await prisma.aiTask.findFirst({
    where: {
      id: taskId,
      projectId,
      taskType: characterRelationshipGenerationTaskType,
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
    revalidateRelationshipPaths(projectId);
    redirect(`/projects/${projectId}/characters/network`);
  }

  const drafts = parseCharacterRelationshipGenerationOutput(task.outputText);

  if (drafts.length === 0) {
    revalidateRelationshipPaths(projectId);
    redirectRelationshipError(projectId, "invalidRelationshipDraft");
  }

  const [characters, chapters] = await Promise.all([
    prisma.character.findMany({
      where: {
        projectId,
        status: {
          not: "archived",
        },
      },
      select: {
        id: true,
        name: true,
      },
    }),
    prisma.chapter.findMany({
      where: {
        projectId,
      },
      select: {
        id: true,
        chapterNumber: true,
      },
    }),
  ]);
  const relationshipValues = relationshipValuesFromDrafts({
    drafts,
    characters,
    chapters,
  });

  if (relationshipValues.length === 0) {
    revalidateRelationshipPaths(projectId);
    redirectRelationshipError(projectId, "adoptedNoRelationships");
  }

  const createdCount = await prisma.$transaction(async (tx) => {
    const creatableValues: RelationshipValues[] = [];

    for (const values of relationshipValues) {
      const duplicateCount = await tx.characterRelationship.count({
        where: duplicateRelationshipWhere(projectId, values),
      });

      if (duplicateCount > 0) {
        continue;
      }

      creatableValues.push(values);
    }

    if (creatableValues.length === 0) {
      return 0;
    }

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
      return 0;
    }

    for (const values of creatableValues) {
      await tx.characterRelationship.create({
        data: {
          projectId,
          ...values,
        },
      });
    }

    return creatableValues.length;
  });

  revalidateRelationshipPaths(projectId);
  revalidatePath(`/projects/${projectId}/ai`);

  if (createdCount === 0) {
    redirectRelationshipError(projectId, "adoptedNoRelationships");
  }

  redirect(`/projects/${projectId}/characters/network?relationshipAdopted=${createdCount}`);
}

export async function rejectCharacterRelationshipDrafts(
  projectId: string,
  taskId: string,
) {
  await assertProject(projectId);

  await prisma.aiTask.updateMany({
    where: {
      id: taskId,
      projectId,
      taskType: characterRelationshipGenerationTaskType,
      status: "completed",
      adoptionState: "not_reviewed",
    },
    data: {
      adoptionState: "rejected",
    },
  });

  revalidateRelationshipPaths(projectId);
  revalidatePath(`/projects/${projectId}/ai`);
  redirect(`/projects/${projectId}/characters/network`);
}

type RelationshipValues = z.infer<typeof relationshipSchema>;

type RelationshipDraftAdoptionContext = {
  drafts: readonly ParsedCharacterRelationshipDraft[];
  characters: readonly { id: string; name: string }[];
  chapters: readonly { id: string; chapterNumber: number }[];
};

function parseRelationshipForm(
  formData: FormData,
  projectId: string,
): RelationshipValues {
  const parsed = relationshipSchema.safeParse(Object.fromEntries(formData));

  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    const field = issue?.path[0];

    if (issue?.code === "too_big") {
      redirectRelationshipError(projectId, "bodyTooLong");
    }

    if (field === "summary") {
      redirectRelationshipError(projectId, "missingSummary");
    }

    if (field === "sourceCharacterId" || field === "targetCharacterId") {
      redirectRelationshipError(projectId, "missingCharacter");
    }

    redirectRelationshipError(projectId, "invalidForm");
  }

  return parsed.data;
}

async function validateRelationshipReferences(
  projectId: string,
  values: RelationshipValues,
) {
  if (values.sourceCharacterId === values.targetCharacterId) {
    redirectRelationshipError(projectId, "sameCharacter");
  }

  await assertCharacterIdsBelongToProject(projectId, [
    values.sourceCharacterId,
    values.targetCharacterId,
  ]);
  await assertChapterIdsBelongToProject(projectId, [values.sourceChapterId]);
}

async function assertCharacterIdsBelongToProject(
  projectId: string,
  ids: Array<string | null | undefined>,
) {
  const cleanIds = [...new Set(ids.filter(Boolean))] as string[];

  if (cleanIds.length === 0) {
    return;
  }

  const count = await prisma.character.count({
    where: {
      projectId,
      id: {
        in: cleanIds,
      },
    },
  });

  if (count !== cleanIds.length) {
    redirectRelationshipError(projectId, "invalidCharacterReference");
  }
}

async function assertChapterIdsBelongToProject(
  projectId: string,
  ids: Array<string | null | undefined>,
) {
  const cleanIds = [...new Set(ids.filter(Boolean))] as string[];

  if (cleanIds.length === 0) {
    return;
  }

  const count = await prisma.chapter.count({
    where: {
      projectId,
      id: {
        in: cleanIds,
      },
    },
  });

  if (count !== cleanIds.length) {
    redirectRelationshipError(projectId, "invalidChapterReference");
  }
}

async function assertCreateRelationshipCharactersAreActive(
  projectId: string,
  values: RelationshipValues,
) {
  const characterIds = [
    values.sourceCharacterId,
    values.targetCharacterId,
  ];
  const characters = await prisma.character.findMany({
    where: {
      projectId,
      id: {
        in: characterIds,
      },
    },
    select: {
      id: true,
      status: true,
    },
  });

  if (
    characters.length !== characterIds.length ||
    characters.some((character) => character.status === "archived")
  ) {
    redirectRelationshipError(projectId, "archivedCharacterReference");
  }
}

async function assertNoDuplicateRelationship(
  projectId: string,
  values: RelationshipValues,
  relationshipId?: string,
) {
  const duplicateStatuses = ["active", "tension", "hidden"];
  const sameDirectionPair = {
    projectId,
    sourceCharacterId: values.sourceCharacterId,
    targetCharacterId: values.targetCharacterId,
    relationshipType: values.relationshipType,
    direction: values.direction,
    status: {
      in: duplicateStatuses,
    },
  };
  const pairWhere =
    values.direction === "two_way" || values.direction === "unclear"
      ? {
          OR: [
            sameDirectionPair,
            {
              ...sameDirectionPair,
              sourceCharacterId: values.targetCharacterId,
              targetCharacterId: values.sourceCharacterId,
            },
          ],
        }
      : sameDirectionPair;
  const duplicateCount = await prisma.characterRelationship.count({
    where: {
      ...(relationshipId
        ? {
            id: {
              not: relationshipId,
            },
          }
        : {}),
      ...pairWhere,
    },
  });

  if (duplicateCount > 0) {
    redirectRelationshipError(projectId, "duplicateRelationship");
  }
}

async function findActiveCharacterRelationshipGenerationTask(projectId: string) {
  return prisma.aiTask.findFirst({
    where: {
      projectId,
      taskType: characterRelationshipGenerationTaskType,
      status: {
        in: [...activeAiTaskStatuses],
      },
    },
    select: {
      id: true,
    },
  });
}

function relationshipValuesFromDrafts({
  drafts,
  characters,
  chapters,
}: RelationshipDraftAdoptionContext): RelationshipValues[] {
  const characterIdSet = new Set(characters.map((character) => character.id));
  const characterNameMap = uniqueCharacterNameMap(characters);
  const chapterIdSet = new Set(chapters.map((chapter) => chapter.id));
  const chapterNumberMap = new Map(
    chapters.map((chapter) => [chapter.chapterNumber, chapter.id]),
  );
  const values: RelationshipValues[] = [];
  const seenKeys = new Set<string>();

  for (const draft of drafts) {
    const sourceCharacterId = resolveCharacterId(
      draft.sourceCharacterId,
      draft.sourceCharacterName,
      characterIdSet,
      characterNameMap,
    );
    const targetCharacterId = resolveCharacterId(
      draft.targetCharacterId,
      draft.targetCharacterName,
      characterIdSet,
      characterNameMap,
    );

    if (
      !sourceCharacterId ||
      !targetCharacterId ||
      sourceCharacterId === targetCharacterId ||
      !draft.summary.trim()
    ) {
      continue;
    }

    const sourceChapterId =
      draft.sourceChapterId && chapterIdSet.has(draft.sourceChapterId)
        ? draft.sourceChapterId
        : draft.sourceChapterNumber
          ? chapterNumberMap.get(draft.sourceChapterNumber) ?? null
          : null;
    const relationship: RelationshipValues = {
      sourceCharacterId,
      targetCharacterId,
      relationshipType: draft.relationshipType,
      direction: draft.direction,
      status: draft.status,
      summary: draft.summary.trim(),
      dynamics: draft.dynamics.trim(),
      evidence: [draft.evidence, draft.rationale]
        .map((item) => item.trim())
        .filter(Boolean)
        .join("\n\n"),
      sourceChapterId,
    };
    const key = relationshipDuplicateKey(relationship);

    if (seenKeys.has(key)) {
      continue;
    }

    seenKeys.add(key);
    values.push(relationship);
  }

  return values;
}

function uniqueCharacterNameMap(characters: readonly { id: string; name: string }[]) {
  const idsByName = new Map<string, string | null>();

  for (const character of characters) {
    const name = character.name.trim();

    if (!name) {
      continue;
    }

    idsByName.set(name, idsByName.has(name) ? null : character.id);
  }

  return idsByName;
}

function resolveCharacterId(
  id: string | undefined,
  name: string | undefined,
  characterIdSet: ReadonlySet<string>,
  characterNameMap: ReadonlyMap<string, string | null>,
) {
  if (id && characterIdSet.has(id)) {
    return id;
  }

  if (!name) {
    return null;
  }

  return characterNameMap.get(name.trim()) ?? null;
}

function duplicateRelationshipWhere(
  projectId: string,
  values: RelationshipValues,
) {
  const sameDirectionPair = {
    projectId,
    sourceCharacterId: values.sourceCharacterId,
    targetCharacterId: values.targetCharacterId,
    relationshipType: values.relationshipType,
    direction: values.direction,
    status: {
      in: relationshipAdoptionStatuses,
    },
  };

  if (values.direction === "two_way" || values.direction === "unclear") {
    return {
      OR: [
        sameDirectionPair,
        {
          ...sameDirectionPair,
          sourceCharacterId: values.targetCharacterId,
          targetCharacterId: values.sourceCharacterId,
        },
      ],
    };
  }

  return sameDirectionPair;
}

function relationshipDuplicateKey(values: RelationshipValues) {
  const pair =
    values.direction === "two_way" || values.direction === "unclear"
      ? [values.sourceCharacterId, values.targetCharacterId].sort().join("<>")
      : `${values.sourceCharacterId}->${values.targetCharacterId}`;

  return `${pair}:${values.relationshipType}:${values.direction}`;
}

function redirectRelationshipError(projectId: string, code: string): never {
  redirect(`/projects/${projectId}/characters/network?relationshipError=${code}`);
}

function revalidateRelationshipPaths(projectId: string) {
  revalidatePath(`/projects/${projectId}`);
  revalidatePath(`/projects/${projectId}/characters`);
  revalidatePath(`/projects/${projectId}/characters/network`);
  revalidatePath(`/projects/${projectId}/publish`);
}
