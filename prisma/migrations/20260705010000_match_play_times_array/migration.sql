-- play_time (single timestamp) -> play_times (array timestamp, NOT NULL default empty).
-- Migrate dữ liệu cũ: 1 timestamp -> mảng 1 phần tử.
ALTER TABLE "matches" ADD COLUMN "play_times" TIMESTAMP[] NOT NULL DEFAULT '{}'::TIMESTAMP[];

UPDATE "matches"
SET "play_times" = ARRAY["play_time"]
WHERE "play_time" IS NOT NULL;

ALTER TABLE "matches" DROP COLUMN "play_time";

-- Bỏ index cũ dựa trên cột đơn (không còn cột). Array không dùng B-tree trực tiếp;
-- query lọc "OPEN có giờ sắp tới" thực hiện trong app (đủ cho MVP).
DROP INDEX IF EXISTS "matches_status_play_time_idx";
