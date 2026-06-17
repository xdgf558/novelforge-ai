-- CreateTable
CREATE TABLE "characters" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "roleInStory" TEXT,
    "identity" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "speakingStyle" TEXT,
    "desire" TEXT,
    "fear" TEXT,
    "secret" TEXT,
    "relationToProtagonist" TEXT,
    "relationToAntagonist" TEXT,
    "knownInfo" TEXT,
    "hiddenInfo" TEXT,
    "abilityBoundary" TEXT,
    "behaviorRules" TEXT,
    "characterArc" TEXT,
    "firstAppearance" TEXT,
    "latestAppearance" TEXT,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "characters_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "character_versions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "characterId" TEXT NOT NULL,
    "versionNumber" INTEGER NOT NULL,
    "snapshotJson" TEXT NOT NULL,
    "changeReason" TEXT,
    "sourceType" TEXT NOT NULL DEFAULT 'manual',
    "sourceChapterId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "character_versions_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "character_versions_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "characters" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "characters_projectId_status_idx" ON "characters"("projectId", "status");

-- CreateIndex
CREATE INDEX "characters_projectId_name_idx" ON "characters"("projectId", "name");

-- CreateIndex
CREATE INDEX "character_versions_projectId_idx" ON "character_versions"("projectId");

-- CreateIndex
CREATE INDEX "character_versions_characterId_versionNumber_idx" ON "character_versions"("characterId", "versionNumber");
