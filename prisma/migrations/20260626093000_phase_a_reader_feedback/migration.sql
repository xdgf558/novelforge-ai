-- AlterTable
ALTER TABLE "chapters" ADD COLUMN "readerRemoteId" TEXT;
ALTER TABLE "chapters" ADD COLUMN "readerFeedbackUpdatedAt" DATETIME;

-- CreateTable
CREATE TABLE "chapter_analytics" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "chapterId" TEXT NOT NULL,
    "remoteChapterId" TEXT,
    "views" INTEGER,
    "likes" INTEGER,
    "comments" INTEGER,
    "favorites" INTEGER,
    "shares" INTEGER,
    "completionRate" REAL,
    "averageReadSeconds" INTEGER,
    "dropOffPoint" TEXT,
    "engagementScore" REAL,
    "rawJson" TEXT NOT NULL,
    "fetchedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "chapter_analytics_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "chapter_analytics_chapterId_fkey" FOREIGN KEY ("chapterId") REFERENCES "chapters" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "chapter_insights" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "chapterId" TEXT NOT NULL,
    "remoteChapterId" TEXT,
    "summary" TEXT,
    "pacing" TEXT,
    "focus" TEXT,
    "hookStrategy" TEXT,
    "riskNotesJson" TEXT,
    "characterPriorityJson" TEXT,
    "rawJson" TEXT NOT NULL,
    "fetchedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "chapter_insights_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "chapter_insights_chapterId_fkey" FOREIGN KEY ("chapterId") REFERENCES "chapters" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "chapter_analytics_projectId_fetchedAt_idx" ON "chapter_analytics"("projectId", "fetchedAt");

-- CreateIndex
CREATE INDEX "chapter_analytics_chapterId_fetchedAt_idx" ON "chapter_analytics"("chapterId", "fetchedAt");

-- CreateIndex
CREATE INDEX "chapter_insights_projectId_fetchedAt_idx" ON "chapter_insights"("projectId", "fetchedAt");

-- CreateIndex
CREATE INDEX "chapter_insights_chapterId_fetchedAt_idx" ON "chapter_insights"("chapterId", "fetchedAt");
