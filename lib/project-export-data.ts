import type { Prisma } from "@prisma/client";
import type { ProjectExportData } from "./project-export";

export const projectPublishInclude = {
  setting: true,
  characters: {
    orderBy: {
      name: "asc",
    },
  },
  characterRelationships: {
    include: {
      sourceCharacter: {
        select: {
          name: true,
        },
      },
      targetCharacter: {
        select: {
          name: true,
        },
      },
    },
    orderBy: [
      {
        status: "asc",
      },
      {
        updatedAt: "desc",
      },
    ],
  },
  outlines: {
    orderBy: [
      {
        level: "asc",
      },
      {
        sortOrder: "asc",
      },
      {
        createdAt: "asc",
      },
    ],
  },
  storylines: {
    include: {
      characters: {
        include: {
          character: {
            select: {
              name: true,
            },
          },
        },
      },
      foreshadows: {
        include: {
          foreshadow: {
            select: {
              content: true,
            },
          },
        },
      },
      chapters: {
        include: {
          chapter: {
            select: {
              chapterNumber: true,
              title: true,
            },
          },
        },
      },
      outlines: {
        include: {
          outline: {
            select: {
              title: true,
              level: true,
            },
          },
        },
      },
    },
    orderBy: [
      {
        status: "asc",
      },
      {
        updatedAt: "desc",
      },
    ],
  },
  chapters: {
    orderBy: {
      chapterNumber: "asc",
    },
  },
  chapterSummaries: {
    orderBy: {
      createdAt: "desc",
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
  publishTargets: {
    include: {
      runs: {
        orderBy: {
          createdAt: "desc",
        },
        take: 3,
      },
      syncStates: {
        orderBy: {
          updatedAt: "desc",
        },
      },
    },
    orderBy: {
      updatedAt: "desc",
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
  aiUsageDaily: {
    orderBy: [
      {
        dateKey: "desc",
      },
      {
        tokenTotal: "desc",
      },
    ],
  },
  _count: {
    select: {
      chapters: true,
      publishPackages: true,
      aiTasks: true,
      outlines: true,
      storylines: true,
      publishTargets: true,
      aiUsageDaily: true,
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
      "workType",
      "genre",
      "targetAudience",
      "platform",
      "totalWordTarget",
      "chapterWordMin",
      "chapterWordMax",
      "updateFrequency",
      "description",
      "wechatPositioning",
      "aiDailyTokenBudget",
      "coverImagePath",
      "coverImageMimeType",
      "coverImageFileName",
      "coverImageSizeBytes",
      "coverImageUpdatedAt",
      "coverAltText",
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
    characterRelationships: project.characterRelationships.map((relationship) => ({
      ...pickScalarRecord(relationship, [
        "id",
        "sourceCharacterId",
        "targetCharacterId",
        "relationshipType",
        "direction",
        "status",
        "summary",
        "dynamics",
        "evidence",
        "sourceChapterId",
        "createdAt",
        "updatedAt",
      ]),
      sourceCharacterName: relationship.sourceCharacter.name,
      targetCharacterName: relationship.targetCharacter.name,
    })),
    chapters: project.chapters.map((chapter) =>
      pickScalarRecord(chapter, [
        "id",
        "chapterNumber",
        "title",
        "status",
        "goal",
        "beats",
        "draftText",
        "polishedText",
        "finalText",
        "notes",
        "wordCount",
        "createdAt",
        "updatedAt",
      ]),
    ),
    chapterSummaries: project.chapterSummaries.map((summary) =>
      pickScalarRecord(summary, [
        "id",
        "chapterId",
        "aiTaskId",
        "model",
        "inputContextSummary",
        "outputText",
        "sourceTextHash",
        "createdAt",
        "updatedAt",
      ]),
    ),
    outlines: project.outlines.map((outline) =>
      pickScalarRecord(outline, [
        "id",
        "level",
        "title",
        "status",
        "sortOrder",
        "content",
        "volumeNumber",
        "unitNumber",
        "chapterNumber",
        "startChapter",
        "endChapter",
        "expectedChapters",
        "expectedWords",
        "goal",
        "mainlineProgression",
        "mainConflict",
        "mainAntagonist",
        "keyTurns",
        "climax",
        "coreEvents",
        "characterChanges",
        "pleasureDesign",
        "suspenseDesign",
        "chapterConflict",
        "chapterPleasurePoint",
        "foreshadow",
        "resolvedForeshadow",
        "characters",
        "location",
        "endingHook",
        "createdAt",
        "updatedAt",
      ]),
    ),
    storylines: project.storylines.map((storyline) => ({
      ...pickScalarRecord(storyline, [
        "id",
        "name",
        "type",
        "status",
        "startChapter",
        "endChapter",
        "coreGoal",
        "currentProgress",
        "notes",
        "createdAt",
        "updatedAt",
      ]),
      relatedCharacters: storyline.characters
        .map((item) => item.character.name)
        .join("、"),
      relatedForeshadows: storyline.foreshadows
        .map((item) => item.foreshadow.content)
        .join("、"),
      relatedChapters: storyline.chapters
        .map(
          (item) => `第 ${item.chapter.chapterNumber} 章《${item.chapter.title}》`,
        )
        .join("、"),
      relatedOutlines: storyline.outlines
        .map((item) => `${item.outline.level}:${item.outline.title}`)
        .join("、"),
      relatedCharacterItems: storyline.characters.map((item) => ({
        id: item.characterId,
        name: item.character.name,
      })),
      relatedForeshadowItems: storyline.foreshadows.map((item) => ({
        id: item.foreshadowId,
        content: item.foreshadow.content,
      })),
      relatedChapterItems: storyline.chapters.map((item) => ({
        id: item.chapterId,
        chapterNumber: item.chapter.chapterNumber,
        title: item.chapter.title,
      })),
      relatedOutlineItems: storyline.outlines.map((item) => ({
        id: item.outlineId,
        level: item.outline.level,
        title: item.outline.title,
      })),
    })),
    worldRules: project.worldRules.map((rule) =>
      pickScalarRecord(rule, [
        "id",
        "title",
        "content",
        "category",
        "scope",
        "relatedCharacters",
        "relatedLocations",
        "relatedOrganizations",
        "isCore",
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
        "expectedResolveChapter",
        "relatedCharacters",
        "relatedLocations",
        "relatedFactions",
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
        "relatedCharacters",
        "location",
        "impact",
        "status",
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
        "sourceTextHash",
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
        "sourceTextHash",
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
    aiUsageDaily: project.aiUsageDaily.map((usage) =>
      pickScalarRecord(usage, [
        "id",
        "dateKey",
        "taskType",
        "model",
        "callCount",
        "tokenInput",
        "tokenOutput",
        "tokenTotal",
        "createdAt",
        "updatedAt",
      ]),
    ),
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
