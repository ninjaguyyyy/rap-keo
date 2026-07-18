-- Thêm cột cover_url cho teams (ảnh bìa đội, upload qua Supabase Storage bucket team-assets).
-- Nullable: mặc định không có, layout fallback dùng ảnh /team_detail_bg.webp.
ALTER TABLE "teams" ADD COLUMN "cover_url" TEXT;