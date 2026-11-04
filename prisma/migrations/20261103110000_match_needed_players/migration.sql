-- Add structured missing-player count for NEED_PLAYERS matches.
ALTER TABLE "matches"
ADD COLUMN "needed_players" INTEGER;

-- Guard invalid values at DB level (nullable for non-NEED_PLAYERS).
ALTER TABLE "matches"
ADD CONSTRAINT "matches_needed_players_check"
CHECK ("needed_players" IS NULL OR "needed_players" BETWEEN 1 AND 30);
