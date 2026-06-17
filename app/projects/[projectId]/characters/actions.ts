"use server";

import { revalidatePath } from "next/cache";
import { notFound, redirect } from "next/navigation";
import { z } from "zod";
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
