-- Nguồn import kèo từ crawler Facebook + metadata tên đội.
CREATE TYPE "MatchSourcePlatform" AS ENUM ('FACEBOOK');
CREATE TYPE "SourceTeamNameSource" AS ENUM ('NORMALIZED', 'RAW_TEXT', 'POSTER_NAME');

ALTER TABLE "matches"
ADD COLUMN "source_platform" "MatchSourcePlatform",
ADD COLUMN "source_external_id" TEXT,
ADD COLUMN "source_post_url" TEXT,
ADD COLUMN "source_poster_name" TEXT,
ADD COLUMN "source_team_name" TEXT,
ADD COLUMN "source_team_name_source" "SourceTeamNameSource",
ADD COLUMN "source_posted_at" TIMESTAMP(3),
ADD COLUMN "source_scraped_at" TIMESTAMP(3);

CREATE UNIQUE INDEX "matches_source_platform_source_external_id_key"
ON "matches"("source_platform", "source_external_id");
