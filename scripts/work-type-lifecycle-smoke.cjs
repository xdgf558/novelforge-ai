const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { PrismaClient } = require("@prisma/client");
const {
  ensureSqliteDatabaseFile,
  runDesktopMigrations,
  toPrismaSqliteUrl,
} = require("../desktop/runtime.cjs");

const repoRoot = path.resolve(__dirname, "..");
const acceptanceAppRoot = process.env.NOVELFORGE_ACCEPTANCE_APP_ROOT?.trim()
  ? path.resolve(process.env.NOVELFORGE_ACCEPTANCE_APP_ROOT.trim())
  : repoRoot;
const legacyMigrationCutoff = "20260711093000_repository_hardening";
const legacyProjectId = "phase6_legacy_serial";
const legacyChapterId = "phase6_legacy_chapter";
const legacyOutlineId = "phase6_legacy_outline";

async function main() {
  const tempRoot = fs.mkdtempSync(
    path.join(os.tmpdir(), "novelforge-work-types-"),
  );
  const databasePath = path.join(tempRoot, "lifecycle.sqlite");
  const databaseUrl = toPrismaSqliteUrl(databasePath);
  let prisma;

  try {
    ensureSqliteDatabaseFile(databasePath);
    await runDesktopMigrations(acceptanceAppRoot, databaseUrl, {
      through: legacyMigrationCutoff,
    });
    await seedLegacySerialProject(databaseUrl);
    await runDesktopMigrations(acceptanceAppRoot, databaseUrl);
    await runDesktopMigrations(acceptanceAppRoot, databaseUrl);

    prisma = new PrismaClient({
      datasources: {
        db: {
          url: databaseUrl,
        },
      },
    });

    await assertLegacyMigration(prisma);
    const shortStory = await createShortStoryLifecycle(prisma);
    await assertDatabaseHealth(prisma);
    await assertBackupSnapshot(prisma, tempRoot, shortStory.id);
    await assertShortStoryHardDelete(prisma, shortStory.id);

    console.log("Work-type lifecycle acceptance passed.");
  } finally {
    if (prisma) {
      await prisma.$disconnect();
    }

    fs.rmSync(tempRoot, { force: true, recursive: true });
  }
}

async function seedLegacySerialProject(databaseUrl) {
  const prisma = new PrismaClient({
    datasources: {
      db: {
        url: databaseUrl,
      },
    },
  });

  try {
    const projectColumns = await prisma.$queryRawUnsafe(
      `PRAGMA table_info("projects")`,
    );

    assert.equal(
      projectColumns.some((column) => column.name === "workType"),
      false,
      "legacy database predates project work types",
    );

    await prisma.$executeRaw`
      INSERT INTO "projects" ("id", "title", "status", "updatedAt")
      VALUES (
        ${legacyProjectId},
        ${"Phase 6 旧版长篇项目"},
        ${"active"},
        CURRENT_TIMESTAMP
      )
    `;
    await prisma.$executeRaw`
      INSERT INTO "chapters" (
        "id",
        "projectId",
        "chapterNumber",
        "title",
        "status",
        "finalText",
        "wordCount",
        "updatedAt"
      ) VALUES (
        ${legacyChapterId},
        ${legacyProjectId},
        ${1},
        ${"旧章"},
        ${"final"},
        ${"这是一段迁移前已经存在的长篇正文。"},
        ${18},
        CURRENT_TIMESTAMP
      )
    `;
    await prisma.$executeRaw`
      INSERT INTO "outlines" (
        "id",
        "projectId",
        "level",
        "title",
        "status",
        "startChapter",
        "endChapter",
        "updatedAt"
      ) VALUES (
        ${legacyOutlineId},
        ${legacyProjectId},
        ${"unit"},
        ${"旧版剧情单元"},
        ${"active"},
        ${1},
        ${1},
        CURRENT_TIMESTAMP
      )
    `;
  } finally {
    await prisma.$disconnect();
  }
}

async function assertLegacyMigration(prisma) {
  const project = await prisma.project.findUniqueOrThrow({
    where: {
      id: legacyProjectId,
    },
    include: {
      chapters: true,
    },
  });

  assert.equal(project.workType, "serial_novel");
  assert.equal(project.chapters.length, 1);
  assert.equal(
    project.chapters[0].finalText,
    "这是一段迁移前已经存在的长篇正文。",
  );
  assert.equal(project.chapters[0].unitSceneMovement, null);
  assert.equal(project.chapters[0].unitConflict, null);
  assert.equal(project.chapters[0].unitTurn, null);
  assert.equal(project.chapters[0].unitPayoffMovement, null);
  assert.equal(project.chapters[0].unitWordTarget, 0);

  const outline = await prisma.outline.findUniqueOrThrow({
    where: {
      id: legacyOutlineId,
    },
  });

  assert.equal(outline.status, "completed");

  const blueprintCount = await prisma.shortStoryBlueprint.count({
    where: {
      projectId: legacyProjectId,
    },
  });

  assert.equal(blueprintCount, 0);
}

async function createShortStoryLifecycle(prisma) {
  const project = await prisma.project.create({
    data: {
      title: "Phase 6 短故事生命周期",
      workType: "short_story",
      genre: "现实悬疑",
      totalWordTarget: 30000,
      chapterWordMin: 7000,
      chapterWordMax: 10000,
      setting: {
        create: {
          genre: "现实悬疑",
          sellingPoint: "一封死者来信迫使主角重查旧案。",
        },
      },
      shortStoryBlueprint: {
        create: {
          premise: "档案员收到七年前死者寄来的信。",
          openingHook: "信中准确预告当夜停电。",
          coreConflict: "主角必须在家人与真相之间选择。",
          climax: "主角在听证会上公开被藏起的名单。",
          ending: "旧案重启，来信者留下最后一个背影。",
        },
      },
      chapters: {
        create: {
          chapterNumber: 1,
          title: "第七封信",
          status: "final",
          goal: "建立死者来信与旧案钩子。",
          unitSceneMovement: "从收到来信推进到档案馆停电。",
          unitConflict: "主角必须决定是否违背母亲的要求。",
          unitTurn: "来信使用了姐妹童年乳名。",
          unitPayoffMovement: "兑现开篇停电预告。",
          unitWordTarget: 8000,
          finalText: "雨水敲在天窗上，林晚拆开第七封没有邮戳的信。",
          wordCount: 25,
        },
      },
    },
    include: {
      shortStoryBlueprint: true,
      chapters: true,
    },
  });
  const chapter = project.chapters[0];
  const blueprintTask = await prisma.aiTask.create({
    data: {
      projectId: project.id,
      taskType: "short_story_blueprint_generation",
      model: "phase6-smoke",
      status: "completed",
      adoptionState: "adopted",
      inputContextSummary: "短故事蓝图验收",
      outputText: "蓝图草案",
      completedAt: new Date(),
    },
  });
  const reviewTask = await prisma.aiTask.create({
    data: {
      projectId: project.id,
      chapterId: chapter.id,
      taskType: "short_story_whole_review",
      model: "phase6-smoke",
      status: "completed",
      adoptionState: "not_reviewed",
      inputContextSummary: "短故事整篇审校验收",
      outputText: "审校建议",
      completedAt: new Date(),
    },
  });

  await prisma.shortStoryBlueprintVersion.create({
    data: {
      projectId: project.id,
      blueprintId: project.shortStoryBlueprint.id,
      sourceAiTaskId: blueprintTask.id,
      versionNumber: 1,
      snapshotJson: JSON.stringify({
        premise: project.shortStoryBlueprint.premise,
      }),
      sourceType: "ai_adoption",
    },
  });
  await prisma.continuityReport.create({
    data: {
      projectId: project.id,
      chapterId: chapter.id,
      aiTaskId: reviewTask.id,
      severity: "medium",
      category: "opening_promise",
      title: "停电预告需要在结局闭合",
      description: "开篇承诺必须在完整故事中得到解释。",
      sourceTextHash: "phase6-source-hash",
      status: "open",
    },
  });
  await prisma.pendingUpdate.create({
    data: {
      projectId: project.id,
      chapterId: chapter.id,
      aiTaskId: reviewTask.id,
      updateType: "create",
      targetType: "timeline_event",
      title: "档案馆停电",
      proposedContent: "当夜十一点档案馆停电。",
      status: "pending",
    },
  });
  const series = await prisma.shortStorySeries.create({
    data: {
      title: "Phase 1 系列短故事",
      premise: "每篇独立查清一宗旧案，主角记忆持续累积。",
      sharedWorldview: "所有旧案都发生在同一座沿海小城。",
      longTermMysteries: "七年前是谁删除了主角的档案。",
      entries: {
        create: {
          projectId: project.id,
          sortOrder: 10,
          continuityNote: "主角确认死者来信来自同一批旧档案。",
        },
      },
      characters: {
        create: {
          name: "林晚",
          roleInSeries: "固定调查员",
          accumulatedState: "已收到第七封死者来信。",
          knownInformation: "知道旧案互有关联，但不知道删档者身份。",
        },
      },
    },
  });

  assert.ok(series.id);

  return project;
}

async function assertBackupSnapshot(prisma, tempRoot, projectId) {
  const snapshotPath = path.join(tempRoot, "backup-snapshot.sqlite");

  await prisma.$executeRawUnsafe(
    `VACUUM INTO '${snapshotPath.replace(/'/g, "''")}'`,
  );

  const snapshot = new PrismaClient({
    datasources: {
      db: {
        url: toPrismaSqliteUrl(snapshotPath),
      },
    },
  });

  try {
    const project = await snapshot.project.findUniqueOrThrow({
      where: {
        id: projectId,
      },
      include: {
        shortStoryBlueprint: true,
        shortStoryBlueprintVersions: true,
        shortStorySeriesEntry: {
          include: {
            series: {
              include: {
                characters: true,
              },
            },
          },
        },
        chapters: true,
        aiTasks: true,
        pendingUpdates: true,
        continuityReports: true,
      },
    });

    assert.equal(project.workType, "short_story");
    assert.ok(project.shortStoryBlueprint);
    assert.equal(project.shortStoryBlueprintVersions.length, 1);
    assert.equal(project.shortStorySeriesEntry.series.title, "Phase 1 系列短故事");
    assert.equal(project.shortStorySeriesEntry.series.characters.length, 1);
    assert.equal(project.chapters[0].unitWordTarget, 8000);
    assert.equal(project.aiTasks.length, 2);
    assert.equal(project.pendingUpdates.length, 1);
    assert.equal(project.continuityReports.length, 1);
  } finally {
    await snapshot.$disconnect();
  }
}

async function assertShortStoryHardDelete(prisma, projectId) {
  const membership = await prisma.shortStorySeriesEntry.findUniqueOrThrow({
    where: {
      projectId,
    },
    select: {
      seriesId: true,
    },
  });

  await prisma.project.delete({
    where: {
      id: projectId,
    },
  });

  const deletedCounts = await Promise.all([
    prisma.project.count({ where: { id: projectId } }),
    prisma.projectSetting.count({ where: { projectId } }),
    prisma.shortStoryBlueprint.count({ where: { projectId } }),
    prisma.shortStoryBlueprintVersion.count({ where: { projectId } }),
    prisma.chapter.count({ where: { projectId } }),
    prisma.aiTask.count({ where: { projectId } }),
    prisma.pendingUpdate.count({ where: { projectId } }),
    prisma.continuityReport.count({ where: { projectId } }),
    prisma.shortStorySeriesEntry.count({ where: { projectId } }),
  ]);

  assert.deepEqual(deletedCounts, [0, 0, 0, 0, 0, 0, 0, 0, 0]);
  assert.equal(
    await prisma.shortStorySeries.count({
      where: {
        id: membership.seriesId,
      },
    }),
    1,
    "hard deletion must preserve the parent series",
  );
  assert.equal(
    await prisma.shortStorySeriesCharacter.count({
      where: {
        seriesId: membership.seriesId,
      },
    }),
    1,
    "hard deletion must preserve shared series character memory",
  );
  assert.equal(
    await prisma.project.count({ where: { id: legacyProjectId } }),
    1,
    "hard deletion must not remove the migrated serial project",
  );
  assert.equal(
    await prisma.chapter.count({ where: { id: legacyChapterId } }),
    1,
    "hard deletion must not remove serial chapters",
  );
}

async function assertDatabaseHealth(prisma) {
  const quickCheck = await prisma.$queryRawUnsafe("PRAGMA quick_check");
  const foreignKeyCheck = await prisma.$queryRawUnsafe(
    "PRAGMA foreign_key_check",
  );
  const migrationRows = await prisma.$queryRawUnsafe(
    `SELECT COUNT(*) AS count FROM "_prisma_migrations" WHERE "rolled_back_at" IS NULL`,
  );
  const migrationCount = fs
    .readdirSync(path.join(acceptanceAppRoot, "prisma", "migrations"), {
      withFileTypes: true,
    })
    .filter((entry) => entry.isDirectory()).length;

  assert.equal(Object.values(quickCheck[0])[0], "ok");
  assert.deepEqual(foreignKeyCheck, []);
  assert.equal(Number(migrationRows[0].count), migrationCount);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
