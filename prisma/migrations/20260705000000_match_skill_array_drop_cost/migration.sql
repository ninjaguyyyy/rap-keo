-- 1)skill_tier (single enum) -> skill_tiers (array enum, NOT NULL default empty).
-- Migrate dữ liệu cũ: giá trị đơn -> mảng 1 phần tử.
ALTER TABLE "matches" ADD COLUMN "skill_tiers" "MatchSkillTier"[] NOT NULL DEFAULT '{}'::"MatchSkillTier"[];

UPDATE "matches"
SET "skill_tiers" = ARRAY["skill_tier"::"MatchSkillTier"]
WHERE "skill_tier" IS NOT NULL;

ALTER TABLE "matches" DROP COLUMN "skill_tier";

-- 2) Bỏ cost_per_side (không dùng nữa).
ALTER TABLE "matches" DROP COLUMN IF EXISTS "cost_per_side";
