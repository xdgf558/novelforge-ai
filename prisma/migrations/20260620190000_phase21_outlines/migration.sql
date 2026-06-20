-- CreateTable
CREATE TABLE "outlines" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "level" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'planned',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "content" TEXT,
    "volumeNumber" INTEGER,
    "unitNumber" INTEGER,
    "chapterNumber" INTEGER,
    "startChapter" INTEGER,
    "endChapter" INTEGER,
    "expectedChapters" INTEGER,
    "expectedWords" INTEGER,
    "goal" TEXT,
    "mainlineProgression" TEXT,
    "mainConflict" TEXT,
    "mainAntagonist" TEXT,
    "keyTurns" TEXT,
    "climax" TEXT,
    "coreEvents" TEXT,
    "characterChanges" TEXT,
    "pleasureDesign" TEXT,
    "suspenseDesign" TEXT,
    "chapterConflict" TEXT,
    "chapterPleasurePoint" TEXT,
    "foreshadow" TEXT,
    "resolvedForeshadow" TEXT,
    "characters" TEXT,
    "location" TEXT,
    "endingHook" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "outlines_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "outlines_projectId_level_sortOrder_idx" ON "outlines"("projectId", "level", "sortOrder");

-- CreateIndex
CREATE INDEX "outlines_projectId_level_volumeNumber_idx" ON "outlines"("projectId", "level", "volumeNumber");

-- CreateIndex
CREATE INDEX "outlines_projectId_chapterNumber_idx" ON "outlines"("projectId", "chapterNumber");
