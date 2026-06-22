-- Phase 25: audiobook export records and segment tracking.
CREATE TABLE "audio_exports" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "projectId" TEXT NOT NULL,
  "chapterId" TEXT,
  "scope" TEXT NOT NULL DEFAULT 'chapter',
  "providerId" TEXT NOT NULL,
  "modelId" TEXT NOT NULL,
  "voiceId" TEXT NOT NULL,
  "voiceName" TEXT,
  "languageCode" TEXT NOT NULL,
  "stylePrompt" TEXT,
  "sourceTextType" TEXT NOT NULL,
  "sourceTextHash" TEXT NOT NULL,
  "outputFormat" TEXT NOT NULL DEFAULT 'mp3',
  "outputDirectory" TEXT,
  "status" TEXT NOT NULL DEFAULT 'pending',
  "totalChars" INTEGER NOT NULL DEFAULT 0,
  "totalSegments" INTEGER NOT NULL DEFAULT 0,
  "succeededSegments" INTEGER NOT NULL DEFAULT 0,
  "failedSegments" INTEGER NOT NULL DEFAULT 0,
  "estimatedSeconds" INTEGER,
  "estimatedCostCents" INTEGER,
  "actualDurationMs" INTEGER,
  "errorMessage" TEXT,
  "metadataJson" TEXT,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "completedAt" DATETIME,
  CONSTRAINT "audio_exports_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "audio_exports_chapterId_fkey" FOREIGN KEY ("chapterId") REFERENCES "chapters" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE TABLE "audio_export_segments" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "audioExportId" TEXT NOT NULL,
  "projectId" TEXT NOT NULL,
  "chapterId" TEXT,
  "segmentIndex" INTEGER NOT NULL,
  "textHash" TEXT NOT NULL,
  "charCount" INTEGER NOT NULL DEFAULT 0,
  "inputPreview" TEXT,
  "localPath" TEXT,
  "mimeType" TEXT,
  "durationMs" INTEGER,
  "providerRequestId" TEXT,
  "status" TEXT NOT NULL DEFAULT 'pending',
  "errorMessage" TEXT,
  "metadataJson" TEXT,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "audio_export_segments_audioExportId_fkey" FOREIGN KEY ("audioExportId") REFERENCES "audio_exports" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "audio_export_segments_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "audio_export_segments_chapterId_fkey" FOREIGN KEY ("chapterId") REFERENCES "chapters" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX "audio_exports_projectId_status_idx" ON "audio_exports"("projectId", "status");
CREATE INDEX "audio_exports_projectId_createdAt_idx" ON "audio_exports"("projectId", "createdAt");
CREATE INDEX "audio_exports_chapterId_idx" ON "audio_exports"("chapterId");
CREATE UNIQUE INDEX "audio_exports_active_chapter_unique_idx" ON "audio_exports"("projectId", "chapterId") WHERE "chapterId" IS NOT NULL AND "status" IN ('pending', 'running');
CREATE UNIQUE INDEX "audio_export_segments_audioExportId_segmentIndex_key" ON "audio_export_segments"("audioExportId", "segmentIndex");
CREATE INDEX "audio_export_segments_projectId_status_idx" ON "audio_export_segments"("projectId", "status");
CREATE INDEX "audio_export_segments_chapterId_idx" ON "audio_export_segments"("chapterId");
CREATE INDEX "audio_export_segments_audioExportId_status_idx" ON "audio_export_segments"("audioExportId", "status");
