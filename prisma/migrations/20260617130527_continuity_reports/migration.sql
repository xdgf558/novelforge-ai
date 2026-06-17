-- CreateTable
CREATE TABLE "continuity_reports" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "chapterId" TEXT,
    "aiTaskId" TEXT,
    "severity" TEXT NOT NULL DEFAULT 'medium',
    "category" TEXT NOT NULL DEFAULT 'general',
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "evidence" TEXT,
    "conflictingMemory" TEXT,
    "suggestedFix" TEXT,
    "status" TEXT NOT NULL DEFAULT 'open',
    "resolutionNote" TEXT,
    "resolvedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "continuity_reports_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "continuity_reports_chapterId_fkey" FOREIGN KEY ("chapterId") REFERENCES "chapters" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "continuity_reports_aiTaskId_fkey" FOREIGN KEY ("aiTaskId") REFERENCES "ai_tasks" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "continuity_reports_projectId_status_idx" ON "continuity_reports"("projectId", "status");

-- CreateIndex
CREATE INDEX "continuity_reports_projectId_severity_idx" ON "continuity_reports"("projectId", "severity");

-- CreateIndex
CREATE INDEX "continuity_reports_chapterId_idx" ON "continuity_reports"("chapterId");

-- CreateIndex
CREATE INDEX "continuity_reports_aiTaskId_idx" ON "continuity_reports"("aiTaskId");
