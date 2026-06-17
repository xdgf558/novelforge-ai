import type { Prisma } from "@prisma/client";
import type { ProjectExportData } from "./project-export";

export const projectPublishInclude = {
  setting: true,
  characters: {
    orderBy: {
      name: "asc",
    },
  },
  chapters: {
    include: {
      _count: {
        select: {
          publishPackages: true,
        },
      },
      aiTasks: {
        where: {
          taskType: "wechat_publish_packaging",
        },
        orderBy: {
          createdAt: "desc",
        },
        take: 5,
      },
    },
    orderBy: {
      chapterNumber: "asc",
    },
  },
  worldRules: {
    orderBy: {
      updatedAt: "desc",
    },
  },
  foreshadows: {
    orderBy: {
      updatedAt: "desc",
    },
  },
  timelineEvents: {
    orderBy: {
      createdAt: "asc",
    },
  },
  pendingUpdates: {
    orderBy: {
      createdAt: "desc",
    },
  },
  continuityReports: {
    orderBy: {
      createdAt: "desc",
    },
  },
  publishPackages: {
    include: {
      chapter: {
        select: {
          id: true,
          chapterNumber: true,
          title: true,
          finalText: true,
        },
      },
      aiTask: {
        select: {
          id: true,
          status: true,
          adoptionState: true,
          inputContextSummary: true,
          outputText: true,
          errorMessage: true,
          createdAt: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  },
  aiTasks: {
    include: {
      promptTemplate: {
        select: {
          key: true,
          name: true,
          version: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  },
  _count: {
    select: {
      chapters: true,
      publishPackages: true,
      aiTasks: true,
    },
  },
} satisfies Prisma.ProjectInclude;

export type PublishProject = Prisma.ProjectGetPayload<{
  include: typeof projectPublishInclude;
}>;

export function buildExportData(project: PublishProject) {
  return {
    project: pickScalarRecord(project, [
      "id",
      "title",
      "genre",
      "targetAudience",
      "platform",
      "totalWordTarget",
      "chapterWordMin",
      "chapterWordMax",
      "updateFrequency",
      "description",
      "wechatPositioning",
      "status",
      "createdAt",
      "updatedAt",
    ]),
    setting: project.setting
      ? pickScalarRecord(project.setting, [
          "genre",
          "targetAudience",
          "sellingPoint",
          "mainConflict",
          "worldviewRules",
          "protagonistDesire",
          "protagonistFlaw",
          "villainLogic",
          "supportingCharacters",
          "factions",
          "timeline",
          "pleasureMechanism",
          "forbiddenItems",
          "styleSample",
          "wechatPositioning",
          "emotionalTone",
          "readerExpectation",
          "commercialHook",
          "longTermForeshadowing",
          "endingDirection",
          "sensitiveContentRules",
          "updatedAt",
        ])
      : null,
    characters: project.characters.map((character) =>
      pickScalarRecord(character, [
        "id",
        "name",
        "roleInStory",
        "identity",
        "status",
        "speakingStyle",
        "desire",
        "fear",
        "secret",
        "relationToProtagonist",
        "relationToAntagonist",
        "knownInfo",
        "hiddenInfo",
        "abilityBoundary",
        "behaviorRules",
        "characterArc",
        "firstAppearance",
        "latestAppearance",
        "notes",
        "createdAt",
        "updatedAt",
      ]),
    ),
    chapters: project.chapters.map((chapter) =>
      pickScalarRecord(chapter, [
        "id",
        "chapterNumber",
        "title",
        "status",
        "goal",
        "beats",
        "draftText",
        "finalText",
        "notes",
        "wordCount",
        "createdAt",
        "updatedAt",
      ]),
    ),
    worldRules: project.worldRules.map((rule) =>
      pickScalarRecord(rule, [
        "id",
        "title",
        "content",
        "category",
        "riskLevel",
        "status",
        "sourceChapterId",
        "pendingUpdateId",
        "createdAt",
        "updatedAt",
      ]),
    ),
    foreshadows: project.foreshadows.map((foreshadow) =>
      pickScalarRecord(foreshadow, [
        "id",
        "content",
        "status",
        "importance",
        "plantedChapterId",
        "resolvedChapterId",
        "sourceChapterId",
        "pendingUpdateId",
        "createdAt",
        "updatedAt",
      ]),
    ),
    timelineEvents: project.timelineEvents.map((event) =>
      pickScalarRecord(event, [
        "id",
        "title",
        "description",
        "storyTime",
        "impact",
        "chapterId",
        "sourceChapterId",
        "pendingUpdateId",
        "createdAt",
        "updatedAt",
      ]),
    ),
    pendingUpdates: project.pendingUpdates.map((update) =>
      pickScalarRecord(update, [
        "id",
        "chapterId",
        "aiTaskId",
        "updateType",
        "targetType",
        "targetId",
        "targetName",
        "fieldName",
        "title",
        "proposedContent",
        "reason",
        "riskLevel",
        "evidence",
        "status",
        "resolutionNote",
        "appliedAt",
        "createdAt",
        "updatedAt",
      ]),
    ),
    continuityReports: project.continuityReports.map((report) =>
      pickScalarRecord(report, [
        "id",
        "chapterId",
        "aiTaskId",
        "severity",
        "category",
        "title",
        "description",
        "evidence",
        "conflictingMemory",
        "suggestedFix",
        "status",
        "resolutionNote",
        "resolvedAt",
        "createdAt",
        "updatedAt",
      ]),
    ),
    publishPackages: project.publishPackages.map((item) => ({
      ...pickScalarRecord(item, [
        "id",
        "chapterId",
        "aiTaskId",
        "titleCandidatesJson",
        "selectedTitle",
        "openingGuide",
        "chapterSummary",
        "endingQuestion",
        "nextChapterPreview",
        "commentGuide",
        "collectionTitle",
        "coverPrompt",
        "markdownBody",
        "checklistJson",
        "status",
        "createdAt",
        "updatedAt",
      ]),
      chapterNumber: item.chapter.chapterNumber,
      chapterTitle: item.chapter.title,
    })),
    aiTasks: project.aiTasks.map((task) => ({
      ...pickScalarRecord(task, [
        "id",
        "chapterId",
        "taskType",
        "model",
        "status",
        "adoptionState",
        "inputContextSummary",
        "inputJson",
        "outputText",
        "outputJson",
        "errorMessage",
        "tokenInput",
        "tokenOutput",
        "tokenTotal",
        "startedAt",
        "completedAt",
        "createdAt",
        "updatedAt",
      ]),
      promptTemplateKey: task.promptTemplate?.key,
      promptTemplateName: task.promptTemplate?.name,
      promptTemplateVersion: task.promptTemplate?.version,
    })),
  } satisfies ProjectExportData;
}

function pickScalarRecord<T extends object, K extends keyof T>(
  record: T,
  keys: readonly K[],
) {
  return Object.fromEntries(
    keys.map((key) => [String(key), record[key]]),
  ) as Record<
    string,
    string | number | boolean | Date | null | undefined
  >;
}
