-- Preserve completed chapter summaries independently from disposable AI task logs.
CREATE TABLE "chapter_summaries" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "projectId" TEXT NOT NULL,
  "chapterId" TEXT NOT NULL,
  "aiTaskId" TEXT,
  "model" TEXT NOT NULL,
  "inputContextSummary" TEXT NOT NULL,
  "outputText" TEXT NOT NULL,
  "sourceTextHash" TEXT,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "chapter_summaries_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "chapter_summaries_chapterId_fkey" FOREIGN KEY ("chapterId") REFERENCES "chapters" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "chapter_summaries_aiTaskId_fkey" FOREIGN KEY ("aiTaskId") REFERENCES "ai_tasks" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "chapter_summaries_aiTaskId_key" ON "chapter_summaries"("aiTaskId");
CREATE INDEX "chapter_summaries_projectId_createdAt_idx" ON "chapter_summaries"("projectId", "createdAt");
CREATE INDEX "chapter_summaries_chapterId_createdAt_idx" ON "chapter_summaries"("chapterId", "createdAt");
CREATE INDEX "chapter_summaries_chapterId_sourceTextHash_idx" ON "chapter_summaries"("chapterId", "sourceTextHash");

INSERT INTO "chapter_summaries" (
  "id",
  "projectId",
  "chapterId",
  "aiTaskId",
  "model",
  "inputContextSummary",
  "outputText",
  "sourceTextHash",
  "createdAt",
  "updatedAt"
)
SELECT
  lower(hex(randomblob(16))),
  "projectId",
  "chapterId",
  "id",
  "model",
  "inputContextSummary",
  "outputText",
  CASE
    WHEN json_valid("inputJson") THEN json_extract("inputJson", '$.finalTextHash')
    ELSE NULL
  END,
  COALESCE("completedAt", "createdAt"),
  COALESCE("completedAt", "updatedAt")
FROM "ai_tasks"
WHERE
  "taskType" = 'chapter_summary_extraction'
  AND "status" = 'completed'
  AND "chapterId" IS NOT NULL
  AND length(trim(COALESCE("outputText", ''))) > 0;

-- Tie review artifacts to the exact final text that produced them.
ALTER TABLE "pending_updates" ADD COLUMN "sourceTextHash" TEXT;
ALTER TABLE "continuity_reports" ADD COLUMN "sourceTextHash" TEXT;

-- Persist the Station Cat idempotency key before making a remote request.
ALTER TABLE "publish_runs" ADD COLUMN "requestId" TEXT;
CREATE UNIQUE INDEX "publish_runs_targetId_requestId_key" ON "publish_runs"("targetId", "requestId");

-- Preserve existing duplicate chapters by moving only later duplicates above the
-- project's current maximum before enforcing the new invariant.
CREATE TEMP TABLE "_chapter_number_reassignments" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "oldNumber" INTEGER NOT NULL,
  "newNumber" INTEGER NOT NULL
);

INSERT INTO "_chapter_number_reassignments" ("id", "oldNumber", "newNumber")
WITH ranked AS (
  SELECT
    "id",
    "projectId",
    "chapterNumber",
    "createdAt",
    row_number() OVER (
      PARTITION BY "projectId", "chapterNumber"
      ORDER BY "createdAt" ASC, "id" ASC
    ) AS duplicate_rank
  FROM "chapters"
), project_max AS (
  SELECT "projectId", max("chapterNumber") AS max_number
  FROM "chapters"
  GROUP BY "projectId"
), duplicates AS (
  SELECT
    ranked."id",
    ranked."projectId",
    ranked."chapterNumber" AS old_number,
    project_max.max_number + row_number() OVER (
      PARTITION BY ranked."projectId"
      ORDER BY ranked."chapterNumber" ASC, ranked."createdAt" ASC, ranked."id" ASC
    ) AS new_number
  FROM ranked
  JOIN project_max ON project_max."projectId" = ranked."projectId"
  WHERE ranked.duplicate_rank > 1
)
SELECT "id", old_number, new_number
FROM duplicates;

UPDATE "chapters"
SET
  "chapterNumber" = (
    SELECT "newNumber"
    FROM "_chapter_number_reassignments"
    WHERE "_chapter_number_reassignments"."id" = "chapters"."id"
  ),
  "notes" = trim(
    COALESCE("notes", '') ||
    CASE WHEN length(trim(COALESCE("notes", ''))) > 0 THEN char(10) || char(10) ELSE '' END ||
    '[系统迁移] 原章节号重复，已自动调整到项目末尾。'
  )
WHERE "id" IN (SELECT "id" FROM "_chapter_number_reassignments");

DROP TABLE "_chapter_number_reassignments";
DROP INDEX "chapters_projectId_chapterNumber_idx";
CREATE UNIQUE INDEX "chapters_projectId_chapterNumber_key" ON "chapters"("projectId", "chapterNumber");

-- Align the timeline index with the current Prisma schema.
DROP INDEX "timeline_events_projectId_idx";
CREATE INDEX "timeline_events_projectId_status_idx" ON "timeline_events"("projectId", "status");
