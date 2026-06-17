-- CreateTable
CREATE TABLE "ai_prompt_templates" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "taskType" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "status" TEXT NOT NULL DEFAULT 'active',
    "outputFormat" TEXT NOT NULL DEFAULT 'text',
    "systemPrompt" TEXT NOT NULL,
    "userPrompt" TEXT NOT NULL,
    "contextNotes" TEXT,
    "responseSchema" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ai_prompt_templates_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ai_tasks" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "promptTemplateId" TEXT,
    "chapterId" TEXT,
    "taskType" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "adoptionState" TEXT NOT NULL DEFAULT 'not_reviewed',
    "inputContextSummary" TEXT NOT NULL,
    "inputJson" TEXT,
    "outputText" TEXT,
    "outputJson" TEXT,
    "errorMessage" TEXT,
    "tokenInput" INTEGER,
    "tokenOutput" INTEGER,
    "tokenTotal" INTEGER,
    "startedAt" DATETIME,
    "completedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ai_tasks_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ai_tasks_promptTemplateId_fkey" FOREIGN KEY ("promptTemplateId") REFERENCES "ai_prompt_templates" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "ai_tasks_chapterId_fkey" FOREIGN KEY ("chapterId") REFERENCES "chapters" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "ai_prompt_templates_projectId_taskType_idx" ON "ai_prompt_templates"("projectId", "taskType");

-- CreateIndex
CREATE INDEX "ai_prompt_templates_projectId_status_idx" ON "ai_prompt_templates"("projectId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "ai_prompt_templates_projectId_key_version_key" ON "ai_prompt_templates"("projectId", "key", "version");

-- CreateIndex
CREATE INDEX "ai_tasks_projectId_taskType_idx" ON "ai_tasks"("projectId", "taskType");

-- CreateIndex
CREATE INDEX "ai_tasks_projectId_status_idx" ON "ai_tasks"("projectId", "status");

-- CreateIndex
CREATE INDEX "ai_tasks_promptTemplateId_idx" ON "ai_tasks"("promptTemplateId");

-- CreateIndex
CREATE INDEX "ai_tasks_chapterId_idx" ON "ai_tasks"("chapterId");
