ALTER TABLE "projects" ADD COLUMN "aiDailyTokenBudget" INTEGER;

CREATE TABLE "ai_usage_daily" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "dateKey" TEXT NOT NULL,
    "taskType" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "callCount" INTEGER NOT NULL DEFAULT 0,
    "tokenInput" INTEGER NOT NULL DEFAULT 0,
    "tokenOutput" INTEGER NOT NULL DEFAULT 0,
    "tokenTotal" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ai_usage_daily_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "ai_usage_daily_projectId_dateKey_taskType_model_key" ON "ai_usage_daily"("projectId", "dateKey", "taskType", "model");
CREATE INDEX "ai_usage_daily_projectId_dateKey_idx" ON "ai_usage_daily"("projectId", "dateKey");
CREATE INDEX "ai_usage_daily_projectId_taskType_idx" ON "ai_usage_daily"("projectId", "taskType");
