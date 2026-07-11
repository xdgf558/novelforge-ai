CREATE TABLE "short_story_blueprints" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "projectId" TEXT NOT NULL,
  "premise" TEXT,
  "openingHook" TEXT,
  "protagonistPressure" TEXT,
  "coreConflict" TEXT,
  "reversalChain" TEXT,
  "emotionalArc" TEXT,
  "climax" TEXT,
  "ending" TEXT,
  "requiredPayoffs" TEXT,
  "forbiddenDeviations" TEXT,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL,
  CONSTRAINT "short_story_blueprints_projectId_fkey"
    FOREIGN KEY ("projectId") REFERENCES "projects" ("id")
    ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "short_story_blueprints_projectId_key"
  ON "short_story_blueprints"("projectId");

CREATE TABLE "short_story_blueprint_versions" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "projectId" TEXT NOT NULL,
  "blueprintId" TEXT,
  "sourceAiTaskId" TEXT,
  "versionNumber" INTEGER NOT NULL,
  "snapshotJson" TEXT NOT NULL,
  "changeReason" TEXT,
  "sourceType" TEXT NOT NULL DEFAULT 'manual',
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "short_story_blueprint_versions_projectId_fkey"
    FOREIGN KEY ("projectId") REFERENCES "projects" ("id")
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "short_story_blueprint_versions_blueprintId_fkey"
    FOREIGN KEY ("blueprintId") REFERENCES "short_story_blueprints" ("id")
    ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "short_story_blueprint_versions_sourceAiTaskId_fkey"
    FOREIGN KEY ("sourceAiTaskId") REFERENCES "ai_tasks" ("id")
    ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "short_story_blueprint_versions_sourceAiTaskId_key"
  ON "short_story_blueprint_versions"("sourceAiTaskId");

CREATE UNIQUE INDEX "short_story_blueprint_versions_projectId_versionNumber_key"
  ON "short_story_blueprint_versions"("projectId", "versionNumber");

CREATE INDEX "short_story_blueprint_versions_blueprintId_idx"
  ON "short_story_blueprint_versions"("blueprintId");
