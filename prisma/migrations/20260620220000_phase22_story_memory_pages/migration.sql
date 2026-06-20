-- Phase 22: add author-managed structured memory metadata.
ALTER TABLE "world_rules" ADD COLUMN "scope" TEXT;
ALTER TABLE "world_rules" ADD COLUMN "relatedCharacters" TEXT;
ALTER TABLE "world_rules" ADD COLUMN "relatedLocations" TEXT;
ALTER TABLE "world_rules" ADD COLUMN "relatedOrganizations" TEXT;
ALTER TABLE "world_rules" ADD COLUMN "isCore" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "foreshadows" ADD COLUMN "expectedResolveChapter" INTEGER;
ALTER TABLE "foreshadows" ADD COLUMN "relatedCharacters" TEXT;
ALTER TABLE "foreshadows" ADD COLUMN "relatedLocations" TEXT;
ALTER TABLE "foreshadows" ADD COLUMN "relatedFactions" TEXT;

ALTER TABLE "timeline_events" ADD COLUMN "relatedCharacters" TEXT;
ALTER TABLE "timeline_events" ADD COLUMN "location" TEXT;
