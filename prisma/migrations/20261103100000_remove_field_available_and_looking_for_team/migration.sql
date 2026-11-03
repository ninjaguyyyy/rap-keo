-- Remove deprecated match types from data + enum.
-- 1) Delete old matches using removed values.
-- 2) Rebuild MatchType enum without FIELD_AVAILABLE / LOOKING_FOR_TEAM.

DELETE FROM "matches"
WHERE "match_type" IN ('FIELD_AVAILABLE', 'LOOKING_FOR_TEAM');

CREATE TYPE "MatchType_new" AS ENUM ('FIND_OPPONENT', 'NEED_PLAYERS', 'INTERNAL');

ALTER TABLE "matches"
ALTER COLUMN "match_type" TYPE "MatchType_new"
USING ("match_type"::text::"MatchType_new");

ALTER TYPE "MatchType" RENAME TO "MatchType_old";
ALTER TYPE "MatchType_new" RENAME TO "MatchType";
DROP TYPE "MatchType_old";
