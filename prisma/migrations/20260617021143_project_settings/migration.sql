-- CreateTable
CREATE TABLE "project_settings" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "genre" TEXT,
    "targetAudience" TEXT,
    "sellingPoint" TEXT,
    "mainConflict" TEXT,
    "worldviewRules" TEXT,
    "protagonistDesire" TEXT,
    "protagonistFlaw" TEXT,
    "villainLogic" TEXT,
    "supportingCharacters" TEXT,
    "factions" TEXT,
    "timeline" TEXT,
    "pleasureMechanism" TEXT,
    "forbiddenItems" TEXT,
    "styleSample" TEXT,
    "wechatPositioning" TEXT,
    "emotionalTone" TEXT,
    "readerExpectation" TEXT,
    "commercialHook" TEXT,
    "longTermForeshadowing" TEXT,
    "endingDirection" TEXT,
    "sensitiveContentRules" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "project_settings_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "setting_versions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "settingId" TEXT,
    "versionNumber" INTEGER NOT NULL,
    "snapshotJson" TEXT NOT NULL,
    "changeReason" TEXT,
    "sourceType" TEXT NOT NULL DEFAULT 'manual',
    "sourceChapterId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "setting_versions_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "setting_versions_settingId_fkey" FOREIGN KEY ("settingId") REFERENCES "project_settings" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "project_settings_projectId_key" ON "project_settings"("projectId");

-- CreateIndex
CREATE INDEX "setting_versions_projectId_versionNumber_idx" ON "setting_versions"("projectId", "versionNumber");

-- CreateIndex
CREATE INDEX "setting_versions_settingId_idx" ON "setting_versions"("settingId");
