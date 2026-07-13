CREATE TABLE "short_story_series" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "title" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'active',
  "premise" TEXT,
  "sharedWorldview" TEXT,
  "continuityRules" TEXT,
  "recurringElements" TEXT,
  "longTermMysteries" TEXT,
  "futureDirection" TEXT,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX "short_story_series_status_updatedAt_idx"
  ON "short_story_series"("status", "updatedAt");

CREATE INDEX "short_story_series_title_idx"
  ON "short_story_series"("title");

CREATE TABLE "short_story_series_entries" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "seriesId" TEXT NOT NULL,
  "projectId" TEXT NOT NULL,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "continuityNote" TEXT,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "short_story_series_entries_seriesId_fkey"
    FOREIGN KEY ("seriesId") REFERENCES "short_story_series" ("id")
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "short_story_series_entries_projectId_fkey"
    FOREIGN KEY ("projectId") REFERENCES "projects" ("id")
    ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "short_story_series_entries_projectId_key"
  ON "short_story_series_entries"("projectId");

CREATE INDEX "short_story_series_entries_seriesId_sortOrder_idx"
  ON "short_story_series_entries"("seriesId", "sortOrder");

CREATE TABLE "short_story_series_characters" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "seriesId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'active',
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "roleInSeries" TEXT,
  "identity" TEXT,
  "accumulatedState" TEXT,
  "relationshipState" TEXT,
  "knownInformation" TEXT,
  "recurringRules" TEXT,
  "notes" TEXT,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "short_story_series_characters_seriesId_fkey"
    FOREIGN KEY ("seriesId") REFERENCES "short_story_series" ("id")
    ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "short_story_series_characters_seriesId_name_key"
  ON "short_story_series_characters"("seriesId", "name");

CREATE INDEX "short_story_series_characters_seriesId_status_sortOrder_idx"
  ON "short_story_series_characters"("seriesId", "status", "sortOrder");
