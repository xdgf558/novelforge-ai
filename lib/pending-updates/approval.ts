import { Prisma, type PendingUpdate } from "@prisma/client";
import {
  characterSnapshot,
  characterValuesFromRecord,
  type CharacterTextFieldName,
} from "@/lib/character-fields";
import {
  appendMemoryNote,
  characterValuesForPendingUpdate,
  inferProjectSettingFieldName,
  isCharacterFieldName,
  isProjectSettingFieldName,
} from "@/lib/pending-updates";
import {
  projectSettingSnapshot,
  projectSettingValuesFromRecord,
  type ProjectSettingFieldName,
} from "@/lib/project-setting-fields";

export class PendingUpdateTargetNotFoundError extends Error {
  constructor() {
    super("待审核更新没有唯一匹配的正式记忆目标。");
    this.name = "PendingUpdateTargetNotFoundError";
  }
}

export async function applyApprovedPendingUpdate(
  tx: Prisma.TransactionClient,
  pendingUpdate: PendingUpdate,
  proposedContent: string,
) {
  switch (pendingUpdate.targetType) {
    case "character":
      await applyCharacterUpdate(tx, pendingUpdate, proposedContent);
      return;
    case "world_rule":
      await applyWorldRuleUpdate(tx, pendingUpdate, proposedContent);
      return;
    case "foreshadow":
      await applyForeshadowUpdate(tx, pendingUpdate, proposedContent);
      return;
    case "timeline_event":
      await applyTimelineEventUpdate(tx, pendingUpdate, proposedContent);
      return;
    case "location":
      await applyProjectSettingUpdate(
        tx,
        pendingUpdate,
        proposedContent,
        "worldviewRules",
      );
      return;
    case "organization":
      await applyProjectSettingUpdate(
        tx,
        pendingUpdate,
        proposedContent,
        "factions",
      );
      return;
    case "project_setting":
    default:
      await applyProjectSettingUpdate(tx, pendingUpdate, proposedContent);
  }
}

async function applyProjectSettingUpdate(
  tx: Prisma.TransactionClient,
  pendingUpdate: PendingUpdate,
  proposedContent: string,
  forcedFieldName?: ProjectSettingFieldName,
) {
  const fieldName =
    forcedFieldName ??
    (isProjectSettingFieldName(pendingUpdate.fieldName)
      ? pendingUpdate.fieldName
      : inferProjectSettingFieldName(pendingUpdate.title, proposedContent));
  const currentSetting = await tx.projectSetting.findUnique({
    where: {
      projectId: pendingUpdate.projectId,
    },
  });
  const nextValue = appendMemoryNote(currentSetting?.[fieldName], proposedContent);
  const fieldData = {
    [fieldName]: nextValue,
  } as Partial<Record<ProjectSettingFieldName, string>>;

  const setting = await tx.projectSetting.upsert({
    where: {
      projectId: pendingUpdate.projectId,
    },
    create: {
      projectId: pendingUpdate.projectId,
      ...fieldData,
    },
    update: fieldData,
  });
  const snapshot = projectSettingSnapshot(
    projectSettingValuesFromRecord(setting),
  );
  const versionCount = await tx.settingVersion.count({
    where: {
      projectId: pendingUpdate.projectId,
    },
  });

  await tx.settingVersion.create({
    data: {
      projectId: pendingUpdate.projectId,
      settingId: setting.id,
      versionNumber: versionCount + 1,
      snapshotJson: JSON.stringify(snapshot),
      changeReason: `批准待审核更新：${pendingUpdate.title}`,
      sourceType: "pending_update",
      sourceChapterId: pendingUpdate.chapterId,
    },
  });
}

async function applyCharacterUpdate(
  tx: Prisma.TransactionClient,
  pendingUpdate: PendingUpdate,
  proposedContent: string,
) {
  const targetName = clean(pendingUpdate.targetName) || clean(pendingUpdate.title);
  const fieldName = characterMemoryField(pendingUpdate.fieldName);
  const existingCharacter = await findCharacterTarget(
    tx,
    pendingUpdate,
    targetName,
  );

  if (existingCharacter) {
    const nextValue = appendMemoryNote(
      existingCharacter[fieldName],
      proposedContent,
    );
    const fieldData = {
      [fieldName]: nextValue,
    } as Partial<Record<CharacterTextFieldName, string>>;

    const updatedCharacter = await tx.character.update({
      where: {
        id: existingCharacter.id,
      },
      data: fieldData,
    });
    const versionCount = await tx.characterVersion.count({
      where: {
        characterId: existingCharacter.id,
      },
    });

    await tx.characterVersion.create({
      data: {
        projectId: pendingUpdate.projectId,
        characterId: existingCharacter.id,
        versionNumber: versionCount + 1,
        snapshotJson: JSON.stringify(
          characterSnapshot(characterValuesFromRecord(updatedCharacter)),
        ),
        changeReason: `批准待审核更新：${pendingUpdate.title}`,
        sourceType: "pending_update",
        sourceChapterId: pendingUpdate.chapterId,
      },
    });

    return;
  }

  if (pendingUpdate.updateType !== "create") {
    throw new PendingUpdateTargetNotFoundError();
  }

  const snapshot = characterSnapshot(
    characterValuesForPendingUpdate({
      targetName,
      title: pendingUpdate.title,
      fieldName,
      proposedContent,
    }),
  );
  const createdCharacter = await tx.character.create({
    data: {
      projectId: pendingUpdate.projectId,
      ...snapshot,
    },
  });

  await tx.characterVersion.create({
    data: {
      projectId: pendingUpdate.projectId,
      characterId: createdCharacter.id,
      versionNumber: 1,
      snapshotJson: JSON.stringify(snapshot),
      changeReason: `批准待审核更新：${pendingUpdate.title}`,
      sourceType: "pending_update",
      sourceChapterId: pendingUpdate.chapterId,
    },
  });
}

async function findCharacterTarget(
  tx: Prisma.TransactionClient,
  pendingUpdate: PendingUpdate,
  targetName: string,
) {
  if (pendingUpdate.targetId) {
    const targetById = await tx.character.findFirst({
      where: {
        id: pendingUpdate.targetId,
        projectId: pendingUpdate.projectId,
      },
    });

    if (targetById) {
      return targetById;
    }
  }

  if (!targetName) {
    return null;
  }

  const candidates = await tx.character.findMany({
    where: {
      projectId: pendingUpdate.projectId,
      name: targetName,
    },
    take: 2,
  });

  if (candidates.length > 1) {
    throw new PendingUpdateTargetNotFoundError();
  }

  return candidates.length === 1 ? candidates[0] : null;
}

async function applyWorldRuleUpdate(
  tx: Prisma.TransactionClient,
  pendingUpdate: PendingUpdate,
  proposedContent: string,
) {
  if (pendingUpdate.updateType !== "create") {
    const existingRule = await findWorldRuleTarget(tx, pendingUpdate);

    if (!existingRule) {
      throw new PendingUpdateTargetNotFoundError();
    }

    await tx.worldRule.update({
      where: {
        id: existingRule.id,
      },
      data: {
        content: appendMemoryNote(existingRule.content, proposedContent),
        sourceChapterId: pendingUpdate.chapterId,
        pendingUpdateId: pendingUpdate.id,
      },
    });

    return;
  }

  await tx.worldRule.create({
    data: {
      projectId: pendingUpdate.projectId,
      title: pendingUpdate.title,
      content: proposedContent,
      category: pendingUpdate.fieldName || pendingUpdate.targetName,
      riskLevel: pendingUpdate.riskLevel,
      sourceChapterId: pendingUpdate.chapterId,
      pendingUpdateId: pendingUpdate.id,
    },
  });
}

async function findWorldRuleTarget(
  tx: Prisma.TransactionClient,
  pendingUpdate: PendingUpdate,
) {
  if (pendingUpdate.targetId) {
    const targetById = await tx.worldRule.findFirst({
      where: {
        id: pendingUpdate.targetId,
        projectId: pendingUpdate.projectId,
      },
    });

    if (targetById) {
      return targetById;
    }
  }

  const targetName = clean(pendingUpdate.targetName);

  if (!targetName) {
    return null;
  }

  const candidates = await tx.worldRule.findMany({
    where: {
      projectId: pendingUpdate.projectId,
      title: targetName,
    },
    take: 2,
  });

  return candidates.length === 1 ? candidates[0] : null;
}

async function applyForeshadowUpdate(
  tx: Prisma.TransactionClient,
  pendingUpdate: PendingUpdate,
  proposedContent: string,
) {
  if (pendingUpdate.updateType === "create") {
    await tx.foreshadow.create({
      data: {
        projectId: pendingUpdate.projectId,
        content: proposedContent,
        status: "planted",
        importance: pendingUpdate.riskLevel === "high" ? "high" : "medium",
        plantedChapterId: pendingUpdate.chapterId,
        sourceChapterId: pendingUpdate.chapterId,
        pendingUpdateId: pendingUpdate.id,
      },
    });

    return;
  }

  const existingForeshadow = await findForeshadowTarget(tx, pendingUpdate);

  if (!existingForeshadow) {
    throw new PendingUpdateTargetNotFoundError();
  }

  if (pendingUpdate.updateType === "resolve") {
    await tx.foreshadow.update({
      where: {
        id: existingForeshadow.id,
      },
      data: {
        content: appendMemoryNote(existingForeshadow.content, proposedContent),
        status: "resolved",
        resolvedChapterId: pendingUpdate.chapterId,
        sourceChapterId: pendingUpdate.chapterId,
        pendingUpdateId: pendingUpdate.id,
      },
    });

    return;
  }

  await tx.foreshadow.update({
    where: {
      id: existingForeshadow.id,
    },
    data: {
      content: appendMemoryNote(existingForeshadow.content, proposedContent),
      status:
        existingForeshadow.status === "planted"
          ? "advancing"
          : existingForeshadow.status,
      sourceChapterId: pendingUpdate.chapterId,
      pendingUpdateId: pendingUpdate.id,
    },
  });
}

async function findForeshadowTarget(
  tx: Prisma.TransactionClient,
  pendingUpdate: PendingUpdate,
) {
  if (pendingUpdate.targetId) {
    const targetById = await tx.foreshadow.findFirst({
      where: {
        id: pendingUpdate.targetId,
        projectId: pendingUpdate.projectId,
      },
    });

    if (targetById) {
      return targetById;
    }
  }

  const targetName = clean(pendingUpdate.targetName);

  if (!targetName) {
    return null;
  }

  const candidates = await tx.foreshadow.findMany({
    where: {
      projectId: pendingUpdate.projectId,
      status: {
        notIn: ["resolved", "abandoned"],
      },
      content: {
        contains: targetName,
      },
    },
    take: 2,
  });

  return candidates.length === 1 ? candidates[0] : null;
}

async function applyTimelineEventUpdate(
  tx: Prisma.TransactionClient,
  pendingUpdate: PendingUpdate,
  proposedContent: string,
) {
  if (pendingUpdate.updateType !== "create") {
    const existingEvent = await findTimelineEventTarget(tx, pendingUpdate);

    if (!existingEvent) {
      throw new PendingUpdateTargetNotFoundError();
    }

    await tx.timelineEvent.update({
      where: {
        id: existingEvent.id,
      },
      data: {
        description: appendMemoryNote(
          existingEvent.description,
          proposedContent,
        ),
        sourceChapterId: pendingUpdate.chapterId,
        pendingUpdateId: pendingUpdate.id,
      },
    });

    return;
  }

  await tx.timelineEvent.create({
    data: {
      projectId: pendingUpdate.projectId,
      title: pendingUpdate.title,
      description: proposedContent,
      storyTime: pendingUpdate.targetName,
      impact: pendingUpdate.reason,
      chapterId: pendingUpdate.chapterId,
      sourceChapterId: pendingUpdate.chapterId,
      pendingUpdateId: pendingUpdate.id,
    },
  });
}

async function findTimelineEventTarget(
  tx: Prisma.TransactionClient,
  pendingUpdate: PendingUpdate,
) {
  if (pendingUpdate.targetId) {
    const targetById = await tx.timelineEvent.findFirst({
      where: {
        id: pendingUpdate.targetId,
        projectId: pendingUpdate.projectId,
      },
    });

    if (targetById) {
      return targetById;
    }
  }

  const targetName = clean(pendingUpdate.targetName);

  if (!targetName) {
    return null;
  }

  const candidates = await tx.timelineEvent.findMany({
    where: {
      projectId: pendingUpdate.projectId,
      title: targetName,
    },
    take: 2,
  });

  return candidates.length === 1 ? candidates[0] : null;
}

function characterMemoryField(fieldName?: string | null): CharacterTextFieldName {
  if (
    isCharacterFieldName(fieldName) &&
    fieldName !== "name" &&
    fieldName !== "status"
  ) {
    return fieldName;
  }

  return "notes";
}

function clean(value?: string | null) {
  return value?.trim() ?? "";
}
