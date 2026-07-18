-- NOTE: Prisma muốn DROP các GIST index location (vì không biểu diễn được trong schema).
-- Đã CỐ Ý GIỮ LẠI các index này — không drop (xem migration 20260613010000).

-- AlterTable: thêm home_score / away_score (nullable, ghi khi trận COMPLETED) +
-- bỏ default của 2 mảng (schema không còn @default; khớp intent hiện tại).
ALTER TABLE "matches" ADD COLUMN "away_score" INTEGER,
ADD COLUMN "home_score" INTEGER,
ALTER COLUMN "skill_tiers" DROP DEFAULT,
ALTER COLUMN "play_times" DROP DEFAULT;
