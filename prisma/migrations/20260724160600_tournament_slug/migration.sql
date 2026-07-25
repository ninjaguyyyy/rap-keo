-- Add slug column for tournament URL /tournaments/[slug].
-- NOT NULL with DEFAULT '' tạm thời để backfill row hiện có, sau đó drop default.
ALTER TABLE "tournaments" ADD COLUMN "slug" TEXT NOT NULL DEFAULT '';

-- Backfill slug từ name: lowercase, thay ký tự không [a-zA-Z0-9\sÀ-ỹ] -> ' ',
-- gộp khoảng trắng -> '-'. Bỏ dấu tiếng Việt không hoàn hảo (giữ á/à/...) —
-- chấp nhận cho data cũ ít; row mới sinh từ app sẽ sạch (slugify JS bỏ dấu).
UPDATE "tournaments"
SET slug = lower(
  regexp_replace(
    regexp_replace(name, '[^a-zA-Z0-9\sÀ-ỹ]', ' ', 'g'),
    '\s+', '-', 'g'
  )
);

-- Drop default (slug phải do app sinh, không default nữa).
ALTER TABLE "tournaments" ALTER COLUMN "slug" DROP DEFAULT;

-- Unique constraint. Nếu có trùng slug (2 giải cùng tên) -> migration fail.
-- Sửa tay trước khi chạy lại (vd rename 1 row trong DB).
ALTER TABLE "tournaments" ADD CONSTRAINT "tournaments_slug_key" UNIQUE ("slug");
