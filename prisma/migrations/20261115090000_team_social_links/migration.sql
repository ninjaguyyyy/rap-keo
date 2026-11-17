-- Add optional social links for teams (used in Team Detail > Socials card).
ALTER TABLE "teams"
ADD COLUMN "facebook_url" TEXT,
ADD COLUMN "tiktok_url" TEXT;