"use server";

import { revalidatePath } from "next/cache";
import { notFound, redirect } from "next/navigation";
import { z } from "zod";
import {
  projectSettingFields,
  projectSettingSnapshot,
  type ProjectSettingFieldName,
  type ProjectSettingValues,
} from "@/lib/project-setting-fields";
import { prisma } from "@/lib/prisma";

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
