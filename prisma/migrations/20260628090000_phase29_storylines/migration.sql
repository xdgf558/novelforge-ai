CREATE TABLE "storylines" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "projectId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "type" TEXT NOT NULL DEFAULT 'mainline',
  "status" TEXT NOT NULL DEFAULT 'active',
  "startChapter" INTEGER,
  "endChapter" INTEGER,
  "coreGoal" TEXT,
  "currentProgress" TEXT,
  "notes" TEXT,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "storylines_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "storyline_characters" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "projectId" TEXT NOT NULL,
  "storylineId" TEXT NOT NULL,
  "characterId" TEXT NOT NULL,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "storyline_characters_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "storyline_characters_storylineId_fkey" FOREIGN KEY ("storylineId") REFERENCES "storylines" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "storyline_characters_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "characters" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "storyline_foreshadows" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "projectId" TEXT NOT NULL,
  "storylineId" TEXT NOT NULL,
  "foreshadowId" TEXT NOT NULL,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "storyline_foreshadows_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "storyline_foreshadows_storylineId_fkey" FOREIGN KEY ("storylineId") REFERENCES "storylines" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "storyline_foreshadows_foreshadowId_fkey" FOREIGN KEY ("foreshadowId") REFERENCES "foreshadows" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "storyline_chapters" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "projectId" TEXT NOT NULL,
  "storylineId" TEXT NOT NULL,
  "chapterId" TEXT NOT NULL,
  "progressSummary" TEXT,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "storyline_chapters_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "storyline_chapters_storylineId_fkey" FOREIGN KEY ("storylineId") REFERENCES "storylines" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "storyline_chapters_chapterId_fkey" FOREIGN KEY ("chapterId") REFERENCES "chapters" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "storyline_outlines" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "projectId" TEXT NOT NULL,
  "storylineId" TEXT NOT NULL,
  "outlineId" TEXT NOT NULL,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "storyline_outlines_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "storyline_outlines_storylineId_fkey" FOREIGN KEY ("storylineId") REFERENCES "storylines" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "storyline_outlines_outlineId_fkey" FOREIGN KEY ("outlineId") REFERENCES "outlines" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "storylines_projectId_status_idx" ON "storylines"("projectId", "status");
CREATE INDEX "storylines_projectId_type_idx" ON "storylines"("projectId", "type");
CREATE INDEX "storylines_projectId_startChapter_idx" ON "storylines"("projectId", "startChapter");

CREATE UNIQUE INDEX "storyline_characters_storylineId_characterId_key" ON "storyline_characters"("storylineId", "characterId");
CREATE INDEX "storyline_characters_projectId_characterId_idx" ON "storyline_characters"("projectId", "characterId");

CREATE UNIQUE INDEX "storyline_foreshadows_storylineId_foreshadowId_key" ON "storyline_foreshadows"("storylineId", "foreshadowId");
CREATE INDEX "storyline_foreshadows_projectId_foreshadowId_idx" ON "storyline_foreshadows"("projectId", "foreshadowId");

CREATE UNIQUE INDEX "storyline_chapters_storylineId_chapterId_key" ON "storyline_chapters"("storylineId", "chapterId");
CREATE INDEX "storyline_chapters_projectId_chapterId_idx" ON "storyline_chapters"("projectId", "chapterId");

CREATE UNIQUE INDEX "storyline_outlines_storylineId_outlineId_key" ON "storyline_outlines"("storylineId", "outlineId");
CREATE INDEX "storyline_outlines_projectId_outlineId_idx" ON "storyline_outlines"("projectId", "outlineId");
