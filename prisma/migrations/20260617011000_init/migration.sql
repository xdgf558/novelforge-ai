-- CreateTable
CREATE TABLE "projects" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "genre" TEXT,
    "targetAudience" TEXT,
    "platform" TEXT,
    "totalWordTarget" INTEGER,
    "chapterWordMin" INTEGER,
    "chapterWordMax" INTEGER,
    "updateFrequency" TEXT,
    "description" TEXT,
    "wechatPositioning" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE INDEX "projects_status_idx" ON "projects"("status");

