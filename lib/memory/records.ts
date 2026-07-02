import type { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";

export type WorldRuleRecordValues = Pick<
  Prisma.WorldRuleUncheckedCreateInput,
  | "title"
  | "content"
  | "category"
  | "scope"
  | "relatedCharacters"
  | "relatedLocations"
  | "relatedOrganizations"
  | "isCore"
  | "riskLevel"
  | "status"
  | "sourceChapterId"
>;

export type ForeshadowRecordValues = Pick<
  Prisma.ForeshadowUncheckedCreateInput,
  | "content"
  | "status"
  | "importance"
  | "expectedResolveChapter"
  | "relatedCharacters"
  | "relatedLocations"
  | "relatedFactions"
  | "plantedChapterId"
  | "resolvedChapterId"
  | "sourceChapterId"
>;

export type TimelineEventRecordValues = Pick<
  Prisma.TimelineEventUncheckedCreateInput,
  | "title"
  | "description"
  | "storyTime"
  | "relatedCharacters"
  | "location"
  | "impact"
  | "status"
  | "chapterId"
  | "sourceChapterId"
>;

export async function createWorldRuleRecord({
  projectId,
  values,
}: {
  projectId: string;
  values: WorldRuleRecordValues;
}) {
  return prisma.worldRule.create({
    data: {
      projectId,
      ...values,
    },
  });
}

export async function updateWorldRuleRecord({
  ruleId,
  values,
}: {
  ruleId: string;
  values: WorldRuleRecordValues;
}) {
  return prisma.worldRule.update({
    where: {
      id: ruleId,
    },
    data: values,
  });
}

export async function archiveWorldRuleRecord(ruleId: string) {
  return prisma.worldRule.update({
    where: {
      id: ruleId,
    },
    data: {
      status: "archived",
    },
  });
}

export async function createForeshadowRecord({
  projectId,
  values,
}: {
  projectId: string;
  values: ForeshadowRecordValues;
}) {
  return prisma.foreshadow.create({
    data: {
      projectId,
      ...values,
    },
  });
}

export async function updateForeshadowRecord({
  foreshadowId,
  values,
}: {
  foreshadowId: string;
  values: ForeshadowRecordValues;
}) {
  return prisma.foreshadow.update({
    where: {
      id: foreshadowId,
    },
    data: values,
  });
}

export async function abandonForeshadowRecord(foreshadowId: string) {
  return prisma.foreshadow.update({
    where: {
      id: foreshadowId,
    },
    data: {
      status: "abandoned",
    },
  });
}

export async function createTimelineEventRecord({
  projectId,
  values,
}: {
  projectId: string;
  values: TimelineEventRecordValues;
}) {
  return prisma.timelineEvent.create({
    data: {
      projectId,
      ...values,
    },
  });
}

export async function updateTimelineEventRecord({
  eventId,
  values,
}: {
  eventId: string;
  values: TimelineEventRecordValues;
}) {
  return prisma.timelineEvent.update({
    where: {
      id: eventId,
    },
    data: values,
  });
}

export async function archiveTimelineEventRecord(eventId: string) {
  return prisma.timelineEvent.update({
    where: {
      id: eventId,
    },
    data: {
      status: "archived",
    },
  });
}

export async function chapterReferencesBelongToProject({
  ids,
  projectId,
}: {
  ids: Array<string | null | undefined>;
  projectId: string;
}) {
  const cleanIds = [...new Set(ids.filter(Boolean))] as string[];

  if (cleanIds.length === 0) {
    return true;
  }

  const count = await prisma.chapter.count({
    where: {
      projectId,
      id: {
        in: cleanIds,
      },
    },
  });

  return count === cleanIds.length;
}

export async function findWorldRuleForProject({
  projectId,
  ruleId,
}: {
  projectId: string;
  ruleId: string;
}) {
  return prisma.worldRule.findFirst({
    where: {
      id: ruleId,
      projectId,
    },
    select: {
      id: true,
    },
  });
}

export async function findForeshadowForProject({
  foreshadowId,
  projectId,
}: {
  foreshadowId: string;
  projectId: string;
}) {
  return prisma.foreshadow.findFirst({
    where: {
      id: foreshadowId,
      projectId,
    },
    select: {
      id: true,
    },
  });
}

export async function findTimelineEventForProject({
  eventId,
  projectId,
}: {
  eventId: string;
  projectId: string;
}) {
  return prisma.timelineEvent.findFirst({
    where: {
      id: eventId,
      projectId,
    },
    select: {
      id: true,
    },
  });
}
