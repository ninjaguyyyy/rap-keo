-- Thêm enum value INTERNAL cho MatchType (trận nội bộ team tự tạo, A vs B).
-- Thêm 4 cột cho trận team tự tạo:
--   opponent_name: tên đối thủ nhập tay (trận đá kèo do team tạo, chưa có team thật).
--   side_a_name / side_b_name: tên 2 bên nội bộ (INTERNAL, home=A / away=B).
--   is_private: true = không hiện trên /matches (mặc định false cho kèo public cũ).
ALTER TABLE "matches" ADD COLUMN "opponent_name" TEXT,
ADD COLUMN "side_a_name" TEXT,
ADD COLUMN "side_b_name" TEXT,
ADD COLUMN "is_private" BOOLEAN NOT NULL DEFAULT false;

-- Thêm giá trị INTERNAL vào enum MatchType.
ALTER TYPE "MatchType" ADD VALUE IF NOT EXISTS 'INTERNAL';