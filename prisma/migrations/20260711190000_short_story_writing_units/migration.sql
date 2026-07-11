ALTER TABLE "chapters" ADD COLUMN "unitSceneMovement" TEXT;
ALTER TABLE "chapters" ADD COLUMN "unitConflict" TEXT;
ALTER TABLE "chapters" ADD COLUMN "unitTurn" TEXT;
ALTER TABLE "chapters" ADD COLUMN "unitPayoffMovement" TEXT;
ALTER TABLE "chapters" ADD COLUMN "unitWordTarget" INTEGER NOT NULL DEFAULT 0;
