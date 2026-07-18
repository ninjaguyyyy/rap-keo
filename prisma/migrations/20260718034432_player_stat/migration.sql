-- NOTE: Prisma muốn DROP các GIST index location (vì không biểu diễn được trong schema).
-- Đã CỐ Ý GIỮ LẠI các index này — không drop (xem migration 20260613010000).
-- Chỉ tạo bảng player_stats (bàn thắng / kiến tạo per-match, per-player).

-- CreateTable: số liệu cầu thủ trong 1 trận (1 cầu thủ 1 dòng/trận).
CREATE TABLE "player_stats" (
    "id" UUID NOT NULL,
    "match_id" UUID NOT NULL,
    "team_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "goals" INTEGER NOT NULL DEFAULT 0,
    "assists" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "player_stats_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "player_stats_team_id_idx" ON "player_stats"("team_id");

-- CreateIndex
CREATE INDEX "player_stats_user_id_idx" ON "player_stats"("user_id");

-- CreateIndex: 1 cầu thủ 1 dòng/trận.
CREATE UNIQUE INDEX "player_stats_match_id_user_id_key" ON "player_stats"("match_id", "user_id");

-- AddForeignKey
ALTER TABLE "player_stats" ADD CONSTRAINT "player_stats_match_id_fkey" FOREIGN KEY ("match_id") REFERENCES "matches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "player_stats" ADD CONSTRAINT "player_stats_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "player_stats" ADD CONSTRAINT "player_stats_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
