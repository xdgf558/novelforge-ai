-- Phase 23: character relationship network.
CREATE TABLE "character_relationships" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "projectId" TEXT NOT NULL,
  "sourceCharacterId" TEXT NOT NULL,
  "targetCharacterId" TEXT NOT NULL,
  "relationshipType" TEXT NOT NULL DEFAULT 'other',
  "direction" TEXT NOT NULL DEFAULT 'two_way',
  "status" TEXT NOT NULL DEFAULT 'active',
  "summary" TEXT NOT NULL,
  "dynamics" TEXT,
  "evidence" TEXT,
  "sourceChapterId" TEXT,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "character_relationships_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "character_relationships_sourceCharacterId_fkey" FOREIGN KEY ("sourceCharacterId") REFERENCES "characters" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "character_relationships_targetCharacterId_fkey" FOREIGN KEY ("targetCharacterId") REFERENCES "characters" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "character_relationships_sourceChapterId_fkey" FOREIGN KEY ("sourceChapterId") REFERENCES "chapters" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX "character_relationships_projectId_status_idx" ON "character_relationships"("projectId", "status");
CREATE INDEX "character_relationships_projectId_relationshipType_idx" ON "character_relationships"("projectId", "relationshipType");
CREATE INDEX "character_relationships_sourceCharacterId_idx" ON "character_relationships"("sourceCharacterId");
CREATE INDEX "character_relationships_targetCharacterId_idx" ON "character_relationships"("targetCharacterId");
CREATE INDEX "character_relationships_sourceChapterId_idx" ON "character_relationships"("sourceChapterId");
