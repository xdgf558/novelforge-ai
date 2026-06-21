"use server";

import { revalidatePath } from "next/cache";
import { notFound, redirect } from "next/navigation";
import { z } from "zod";
import {
  normalizeRelationshipDirection,
  normalizeRelationshipStatus,
  normalizeRelationshipType,
} from "@/lib/character-relationship-fields";
import { prisma } from "@/lib/prisma";

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

type RelationshipValues = z.infer<typeof relationshipSchema>;

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

function redirectRelationshipError(projectId: string, code: string): never {
  redirect(`/projects/${projectId}/characters/network?relationshipError=${code}`);
}

function revalidateRelationshipPaths(projectId: string) {
  revalidatePath(`/projects/${projectId}`);
  revalidatePath(`/projects/${projectId}/characters`);
  revalidatePath(`/projects/${projectId}/characters/network`);
  revalidatePath(`/projects/${projectId}/publish`);
}
