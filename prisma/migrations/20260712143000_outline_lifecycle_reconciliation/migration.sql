-- Reconcile legacy outline lifecycle labels with confirmed chapter progress.
WITH "outline_progress" AS (
    SELECT
        "outline"."id" AS "outlineId",
        "outline"."status" AS "currentStatus",
        CASE
            WHEN "outline"."level" = 'chapter' AND "outline"."chapterNumber" IS NOT NULL THEN 1
            WHEN "outline"."startChapter" IS NOT NULL AND "outline"."endChapter" IS NOT NULL
                THEN MAX(0, "outline"."endChapter" - "outline"."startChapter" + 1)
            ELSE "outline"."expectedChapters"
        END AS "expectedChapters",
        COUNT("chapter"."id") AS "createdChapters",
        SUM(
            CASE
                WHEN "chapter"."status" IN ('final', 'published') THEN 1
                ELSE 0
            END
        ) AS "completedChapters"
    FROM "outlines" AS "outline"
    LEFT JOIN "chapters" AS "chapter"
        ON "chapter"."projectId" = "outline"."projectId"
        AND (
            (
                "outline"."level" = 'chapter'
                AND "outline"."chapterNumber" IS NOT NULL
                AND "chapter"."chapterNumber" = "outline"."chapterNumber"
            )
            OR
            (
                "outline"."level" <> 'chapter'
                AND (
                    "outline"."startChapter" IS NOT NULL
                    OR "outline"."endChapter" IS NOT NULL
                )
                AND (
                    "outline"."startChapter" IS NULL
                    OR "chapter"."chapterNumber" >= "outline"."startChapter"
                )
                AND (
                    "outline"."endChapter" IS NULL
                    OR "chapter"."chapterNumber" <= "outline"."endChapter"
                )
            )
        )
    WHERE "outline"."status" <> 'archived'
    GROUP BY "outline"."id"
),
"resolved_status" AS (
    SELECT
        "outlineId",
        CASE
            WHEN "expectedChapters" > 0 AND "completedChapters" >= "expectedChapters" THEN 'completed'
            WHEN "expectedChapters" > 0 AND "createdChapters" > 0 THEN 'active'
            WHEN "expectedChapters" > 0 THEN 'planned'
            WHEN "currentStatus" = 'completed' THEN 'completed'
            WHEN "createdChapters" > 0 THEN 'active'
            WHEN "currentStatus" = 'active' THEN 'active'
            ELSE 'planned'
        END AS "nextStatus"
    FROM "outline_progress"
)
UPDATE "outlines"
SET
    "status" = (
        SELECT "resolved_status"."nextStatus"
        FROM "resolved_status"
        WHERE "resolved_status"."outlineId" = "outlines"."id"
    ),
    "updatedAt" = CURRENT_TIMESTAMP
WHERE "id" IN (SELECT "outlineId" FROM "resolved_status");
