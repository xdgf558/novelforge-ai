ALTER TABLE "projects" ADD COLUMN "workType" TEXT NOT NULL DEFAULT 'serial_novel';

CREATE INDEX "projects_workType_status_idx" ON "projects"("workType", "status");
