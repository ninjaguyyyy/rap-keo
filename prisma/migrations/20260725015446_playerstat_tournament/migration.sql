-- player_stats: hỗ trợ cầu thủ ngoài giải (userId/teamId nullable + participantPlayerId
-- + participantId + displayName). Bỏ unique(matchId, userId) vì userId giờ nullable.

-- Drop NOT NULL cho user_id + team_id (team lẻ trong giải không có team thật).
ALTER TABLE "player_stats" ALTER COLUMN "user_id" DROP NOT NULL;
ALTER TABLE "player_stats" ALTER COLUMN "team_id" DROP NOT NULL;

-- Thêm cột mới.
ALTER TABLE "player_stats" ADD COLUMN "participant_player_id" UUID;
ALTER TABLE "player_stats" ADD COLUMN "participant_id" UUID;
ALTER TABLE "player_stats" ADD COLUMN "display_name" TEXT NOT NULL DEFAULT '';

-- Backfill display_name từ user.name cho row hiện có (userId NOT NULL trước đây).
UPDATE "player_stats" ps
SET display_name = COALESCE(u.name, u.phone, '—')
FROM "users" u
WHERE ps.user_id = u.id;

ALTER TABLE "player_stats" ALTER COLUMN "display_name" DROP DEFAULT;

-- Drop unique cũ (matchId, userId) — userId giờ nullable, unique không fit.
ALTER TABLE "player_stats" DROP CONSTRAINT IF EXISTS "player_stats_match_id_user_id_key";

-- FK participant_player_id -> tournament_players(id) ON DELETE CASCADE.
ALTER TABLE "player_stats"
  ADD CONSTRAINT "player_stats_participant_player_id_fkey"
  FOREIGN KEY ("participant_player_id") REFERENCES "tournament_players"("id") ON DELETE CASCADE;

-- FK participant_id -> tournament_participants(id) ON DELETE CASCADE.
ALTER TABLE "player_stats"
  ADD CONSTRAINT "player_stats_participant_id_fkey"
  FOREIGN KEY ("participant_id") REFERENCES "tournament_participants"("id") ON DELETE CASCADE;

-- Index cho query leaderboard theo participantPlayerId + participantId.
CREATE INDEX "player_stats_participant_player_id_idx" ON "player_stats"("participant_player_id");
CREATE INDEX "player_stats_participant_id_idx" ON "player_stats"("participant_id");
