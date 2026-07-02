import { notFound } from "next/navigation";

import { prisma } from "@/lib/prisma";

export async function assertProjectExists(projectId: string) {
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

  return project;
}

