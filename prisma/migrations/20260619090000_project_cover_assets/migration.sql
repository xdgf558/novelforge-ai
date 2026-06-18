-- Add project-level local cover image metadata.
ALTER TABLE "projects" ADD COLUMN "coverImagePath" TEXT;
ALTER TABLE "projects" ADD COLUMN "coverImageMimeType" TEXT;
ALTER TABLE "projects" ADD COLUMN "coverImageFileName" TEXT;
ALTER TABLE "projects" ADD COLUMN "coverImageSizeBytes" INTEGER;
ALTER TABLE "projects" ADD COLUMN "coverImageUpdatedAt" DATETIME;
ALTER TABLE "projects" ADD COLUMN "coverAltText" TEXT;
