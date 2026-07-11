import { notFound } from "next/navigation";

import { prisma } from "@/lib/prisma";

export async function assertProjectExists(projectId: string) {
  const project = await prisma.project.findUnique({
    where: {
      id: projectId,
    },
    select: {
      id: true,
      workType: true,
    },
  });

  if (!project) {
    notFound();
  }

  return project;
}

export async function assertShortStoryProject(projectId: string) {
  const project = await prisma.project.findFirst({
    where: {
      id: projectId,
      workType: "short_story",
    },
    select: {
      id: true,
      workType: true,
    },
  });

  if (!project) {
    notFound();
  }

  return project;
}
