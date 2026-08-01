import type { Prisma } from "@prisma/client";

export class ProjectContentWriteBlockedError extends Error {
  constructor() {
    super("已完结或归档的作品需要先恢复为连载后才能修改章节内容。");
    this.name = "ProjectContentWriteBlockedError";
  }
}

type ProjectWriteTransaction = Pick<Prisma.TransactionClient, "project">;

export async function acquireActiveProjectContentWriteLease(
  tx: ProjectWriteTransaction,
  projectId: string,
  expectedUpdatedAt?: Date,
) {
  const updatedAt = new Date();
  const result = await tx.project.updateMany({
    where: {
      id: projectId,
      status: "active",
      ...(expectedUpdatedAt ? { updatedAt: expectedUpdatedAt } : {}),
    },
    data: {
      updatedAt,
    },
  });

  if (result.count !== 1) {
    throw new ProjectContentWriteBlockedError();
  }

  return updatedAt;
}
