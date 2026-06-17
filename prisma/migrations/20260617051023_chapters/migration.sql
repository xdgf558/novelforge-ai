-- CreateTable
CREATE TABLE "chapters" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "chapterNumber" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "goal" TEXT,
    "beats" TEXT,
    "draftText" TEXT,
    "finalText" TEXT,
    "notes" TEXT,
    "wordCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "chapters_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "chapter_versions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "chapterId" TEXT NOT NULL,
    "versionNumber" INTEGER NOT NULL,
    "snapshotJson" TEXT NOT NULL,
    "changeReason" TEXT,
    "sourceType" TEXT NOT NULL DEFAULT 'manual',
    "sourceChapterId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "chapter_versions_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "chapter_versions_chapterId_fkey" FOREIGN KEY ("chapterId") REFERENCES "chapters" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "chapters_projectId_status_idx" ON "chapters"("projectId", "status");

-- CreateIndex
CREATE INDEX "chapters_projectId_chapterNumber_idx" ON "chapters"("projectId", "chapterNumber");

-- CreateIndex
CREATE INDEX "chapter_versions_projectId_idx" ON "chapter_versions"("projectId");

-- CreateIndex
CREATE INDEX "chapter_versions_chapterId_versionNumber_idx" ON "chapter_versions"("chapterId", "versionNumber");
