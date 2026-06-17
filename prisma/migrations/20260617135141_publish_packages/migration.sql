-- CreateTable
CREATE TABLE "publish_packages" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "chapterId" TEXT NOT NULL,
    "aiTaskId" TEXT,
    "titleCandidatesJson" TEXT,
    "selectedTitle" TEXT,
    "openingGuide" TEXT,
    "chapterSummary" TEXT,
    "endingQuestion" TEXT,
    "nextChapterPreview" TEXT,
    "commentGuide" TEXT,
    "collectionTitle" TEXT,
    "coverPrompt" TEXT,
    "markdownBody" TEXT,
    "checklistJson" TEXT,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "publish_packages_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "publish_packages_chapterId_fkey" FOREIGN KEY ("chapterId") REFERENCES "chapters" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "publish_packages_aiTaskId_fkey" FOREIGN KEY ("aiTaskId") REFERENCES "ai_tasks" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "publish_packages_projectId_createdAt_idx" ON "publish_packages"("projectId", "createdAt");

-- CreateIndex
CREATE INDEX "publish_packages_chapterId_idx" ON "publish_packages"("chapterId");

-- CreateIndex
CREATE INDEX "publish_packages_aiTaskId_idx" ON "publish_packages"("aiTaskId");
