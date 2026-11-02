-- Lưu số điện thoại liên hệ từ bài Facebook ingest.
ALTER TABLE "matches"
ADD COLUMN "source_phone" TEXT;
