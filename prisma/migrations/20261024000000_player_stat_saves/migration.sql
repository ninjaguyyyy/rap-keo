-- Thêm cột saves cho player_stats: số pha cứu thua của cầu thủ trong 1 trận.
-- Mặc định 0 để tương thích dữ liệu cũ.
ALTER TABLE "player_stats"
ADD COLUMN "saves" INTEGER NOT NULL DEFAULT 0;
