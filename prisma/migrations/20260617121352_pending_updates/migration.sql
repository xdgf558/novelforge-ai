-- CreateTable
CREATE TABLE "world_rules" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "category" TEXT,
    "riskLevel" TEXT NOT NULL DEFAULT 'medium',
    "status" TEXT NOT NULL DEFAULT 'active',
    "sourceChapterId" TEXT,
    "pendingUpdateId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "world_rules_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "world_rules_pendingUpdateId_fkey" FOREIGN KEY ("pendingUpdateId") REFERENCES "pending_updates" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "foreshadows" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'planted',
    "importance" TEXT NOT NULL DEFAULT 'medium',
    "plantedChapterId" TEXT,
    "resolvedChapterId" TEXT,
    "sourceChapterId" TEXT,
    "pendingUpdateId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "foreshadows_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "foreshadows_plantedChapterId_fkey" FOREIGN KEY ("plantedChapterId") REFERENCES "chapters" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "foreshadows_resolvedChapterId_fkey" FOREIGN KEY ("resolvedChapterId") REFERENCES "chapters" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "foreshadows_pendingUpdateId_fkey" FOREIGN KEY ("pendingUpdateId") REFERENCES "pending_updates" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "timeline_events" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "storyTime" TEXT,
    "impact" TEXT,
    "chapterId" TEXT,
    "sourceChapterId" TEXT,
    "pendingUpdateId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "timeline_events_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "timeline_events_chapterId_fkey" FOREIGN KEY ("chapterId") REFERENCES "chapters" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "timeline_events_pendingUpdateId_fkey" FOREIGN KEY ("pendingUpdateId") REFERENCES "pending_updates" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "pending_updates" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "chapterId" TEXT,
    "aiTaskId" TEXT,
    "updateType" TEXT NOT NULL,
    "targetType" TEXT NOT NULL,
    "targetId" TEXT,
    "targetName" TEXT,
    "fieldName" TEXT,
    "title" TEXT NOT NULL,
    "proposedContent" TEXT NOT NULL,
    "reason" TEXT,
    "riskLevel" TEXT NOT NULL DEFAULT 'medium',
    "evidence" TEXT,
    "payloadJson" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "resolutionNote" TEXT,
    "appliedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "pending_updates_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "pending_updates_chapterId_fkey" FOREIGN KEY ("chapterId") REFERENCES "chapters" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "pending_updates_aiTaskId_fkey" FOREIGN KEY ("aiTaskId") REFERENCES "ai_tasks" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "world_rules_projectId_status_idx" ON "world_rules"("projectId", "status");

-- CreateIndex
CREATE INDEX "world_rules_sourceChapterId_idx" ON "world_rules"("sourceChapterId");

-- CreateIndex
CREATE INDEX "world_rules_pendingUpdateId_idx" ON "world_rules"("pendingUpdateId");

-- CreateIndex
CREATE INDEX "foreshadows_projectId_status_idx" ON "foreshadows"("projectId", "status");

-- CreateIndex
CREATE INDEX "foreshadows_plantedChapterId_idx" ON "foreshadows"("plantedChapterId");

-- CreateIndex
CREATE INDEX "foreshadows_resolvedChapterId_idx" ON "foreshadows"("resolvedChapterId");

-- CreateIndex
CREATE INDEX "foreshadows_pendingUpdateId_idx" ON "foreshadows"("pendingUpdateId");

-- CreateIndex
CREATE INDEX "timeline_events_projectId_idx" ON "timeline_events"("projectId");

-- CreateIndex
CREATE INDEX "timeline_events_chapterId_idx" ON "timeline_events"("chapterId");

-- CreateIndex
CREATE INDEX "timeline_events_pendingUpdateId_idx" ON "timeline_events"("pendingUpdateId");

-- CreateIndex
CREATE INDEX "pending_updates_projectId_status_idx" ON "pending_updates"("projectId", "status");

-- CreateIndex
CREATE INDEX "pending_updates_projectId_targetType_idx" ON "pending_updates"("projectId", "targetType");

-- CreateIndex
CREATE INDEX "pending_updates_chapterId_idx" ON "pending_updates"("chapterId");

-- CreateIndex
CREATE INDEX "pending_updates_aiTaskId_idx" ON "pending_updates"("aiTaskId");
