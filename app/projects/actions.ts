"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const optionalText = z.preprocess(
  (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
  z.string().trim().max(2000).optional(),
);

const optionalInteger = z.preprocess((value) => {
  if (typeof value !== "string" || value.trim() === "") {
    return undefined;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : value;
}, z.number().int().positive().optional());

const projectSchema = z.object({
  title: z.string().trim().min(1, "请输入小说标题").max(120),
  genre: optionalText,
  targetAudience: optionalText,
  platform: optionalText,
  totalWordTarget: optionalInteger,
  chapterWordMin: optionalInteger,
  chapterWordMax: optionalInteger,
  updateFrequency: optionalText,
  description: optionalText,
  wechatPositioning: optionalText,
});

function parseProjectForm(formData: FormData) {
  return projectSchema.parse({
    title: formData.get("title"),
    genre: formData.get("genre"),
    targetAudience: formData.get("targetAudience"),
    platform: formData.get("platform"),
    totalWordTarget: formData.get("totalWordTarget"),
    chapterWordMin: formData.get("chapterWordMin"),
    chapterWordMax: formData.get("chapterWordMax"),
    updateFrequency: formData.get("updateFrequency"),
    description: formData.get("description"),
    wechatPositioning: formData.get("wechatPositioning"),
  });
}

export async function createProject(formData: FormData) {
  const data = parseProjectForm(formData);

  const project = await prisma.project.create({
    data,
  });

  revalidatePath("/");
  redirect(`/projects/${project.id}`);
}

export async function updateProject(projectId: string, formData: FormData) {
  const data = parseProjectForm(formData);

  await prisma.project.update({
    where: {
      id: projectId,
    },
    data,
  });

  revalidatePath("/");
  revalidatePath(`/projects/${projectId}`);
  redirect(`/projects/${projectId}`);
}

export async function deleteProject(projectId: string) {
  await prisma.project.delete({
    where: {
      id: projectId,
    },
  });

  revalidatePath("/");
  redirect("/");
}

