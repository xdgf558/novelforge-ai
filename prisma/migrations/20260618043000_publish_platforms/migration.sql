-- CreateTable
CREATE TABLE "publish_targets" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "platformKey" TEXT NOT NULL DEFAULT 'station_cat',
    "apiBaseUrl" TEXT,
    "tokenSecret" TEXT,
    "tokenUpdatedAt" DATETIME,
    "defaultMode" TEXT NOT NULL DEFAULT 'draft',
    "status" TEXT NOT NULL DEFAULT 'active',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "publish_targets_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "publish_runs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,
    "mode" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'completed',
    "packageJson" TEXT NOT NULL,
    "changedItemsJson" TEXT NOT NULL,
    "previewUrl" TEXT,
    "publishUrl" TEXT,
    "resultMessage" TEXT,
    "errorMessage" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" DATETIME,
    CONSTRAINT "publish_runs_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "publish_runs_targetId_fkey" FOREIGN KEY ("targetId") REFERENCES "publish_targets" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "publish_sync_states" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,
    "localType" TEXT NOT NULL,
    "localId" TEXT NOT NULL,
    "remoteId" TEXT,
    "contentHash" TEXT NOT NULL,
    "lastMode" TEXT,
    "lastSyncedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "publish_sync_states_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "publish_sync_states_targetId_fkey" FOREIGN KEY ("targetId") REFERENCES "publish_targets" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "publish_targets_projectId_status_idx" ON "publish_targets"("projectId", "status");

-- CreateIndex
CREATE INDEX "publish_targets_projectId_platformKey_idx" ON "publish_targets"("projectId", "platformKey");

-- CreateIndex
CREATE INDEX "publish_runs_projectId_createdAt_idx" ON "publish_runs"("projectId", "createdAt");

-- CreateIndex
CREATE INDEX "publish_runs_targetId_createdAt_idx" ON "publish_runs"("targetId", "createdAt");

-- CreateIndex
CREATE INDEX "publish_runs_projectId_status_idx" ON "publish_runs"("projectId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "publish_sync_states_targetId_localType_localId_key" ON "publish_sync_states"("targetId", "localType", "localId");

-- CreateIndex
CREATE INDEX "publish_sync_states_projectId_localType_idx" ON "publish_sync_states"("projectId", "localType");

-- CreateIndex
CREATE INDEX "publish_sync_states_targetId_contentHash_idx" ON "publish_sync_states"("targetId", "contentHash");
