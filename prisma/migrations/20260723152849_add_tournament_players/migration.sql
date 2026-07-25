-- Bảng tournament_players: cầu thủ của 1 participant trong giải.
-- Per-participant (tách biệt TeamMember): userId null = cầu thủ ngoài (chỉ tên).
-- Cascade theo participant (xóa đội khỏi giải -> xóa hết cầu thủ).
CREATE TABLE "tournament_players" (
    "id" UUID NOT NULL,
    "participant_id" UUID NOT NULL,
    "user_id" UUID,
    "display_name" TEXT NOT NULL,
    "jersey_number" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tournament_players_pkey" PRIMARY KEY ("id")
);

-- 1 user chỉ xuất hiện 1 lần trong 1 participant (NULL được phép nhiều).
CREATE UNIQUE INDEX "tournament_players_participant_id_user_id_key"
    ON "tournament_players"("participant_id", "user_id");
-- Không trùng số áo trong 1 participant (NULL được phép nhiều).
CREATE UNIQUE INDEX "tournament_players_participant_id_jersey_number_key"
    ON "tournament_players"("participant_id", "jersey_number");
CREATE INDEX "tournament_players_participant_id_idx" ON "tournament_players"("participant_id");

-- FK: participant cascade (xóa participant -> xóa cầu thủ).
-- user set null (xóa user -> gỡ link, giữ dòng cầu thủ "mồ côi" với displayName).
ALTER TABLE "tournament_players" ADD CONSTRAINT "tournament_players_participant_id_fkey"
    FOREIGN KEY ("participant_id") REFERENCES "tournament_participants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "tournament_players" ADD CONSTRAINT "tournament_players_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
