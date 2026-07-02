import {
  outlineSnapshot,
  type OutlineValues,
} from "@/lib/outline-fields";
import { prisma } from "@/lib/prisma";

export async function findOutlineForProject({
  outlineId,
  projectId,
}: {
  outlineId: string;
  projectId: string;
}) {
  return prisma.outline.findFirst({
    where: {
      id: outlineId,
      projectId,
    },
    select: {
      id: true,
    },
  });
}

export async function createOutlineRecord({
  projectId,
  values,
}: {
  projectId: string;
  values: OutlineValues;
}) {
  return prisma.outline.create({
    data: {
      projectId,
      ...outlineSnapshot(values),
    },
  });
}

export async function updateOutlineRecord({
  outlineId,
  values,
}: {
  outlineId: string;
  values: OutlineValues;
}) {
  return prisma.outline.update({
    where: {
      id: outlineId,
    },
    data: outlineSnapshot(values),
  });
}

export async function deleteOutlineRecord(outlineId: string) {
  return prisma.outline.delete({
    where: {
      id: outlineId,
    },
  });
}
