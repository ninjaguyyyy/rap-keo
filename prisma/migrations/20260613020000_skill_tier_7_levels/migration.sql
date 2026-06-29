-- AlterEnum
BEGIN;
CREATE TYPE "MatchSkillTier_new" AS ENUM ('VERY_WEAK', 'WEAK', 'BELOW_AVERAGE', 'AVERAGE', 'ABOVE_AVERAGE', 'GOOD', 'STRONG', 'ANY');
ALTER TABLE "matches" ALTER COLUMN "skill_tier" TYPE "MatchSkillTier_new" USING ("skill_tier"::text::"MatchSkillTier_new");
ALTER TYPE "MatchSkillTier" RENAME TO "MatchSkillTier_old";
ALTER TYPE "MatchSkillTier_new" RENAME TO "MatchSkillTier";
DROP TYPE "public"."MatchSkillTier_old";
COMMIT;

-- AlterEnum
BEGIN;
CREATE TYPE "SkillTier_new" AS ENUM ('VERY_WEAK', 'WEAK', 'BELOW_AVERAGE', 'AVERAGE', 'ABOVE_AVERAGE', 'GOOD', 'STRONG');
ALTER TABLE "teams" ALTER COLUMN "skill_tier" TYPE "SkillTier_new" USING ("skill_tier"::text::"SkillTier_new");
ALTER TYPE "SkillTier" RENAME TO "SkillTier_old";
ALTER TYPE "SkillTier_new" RENAME TO "SkillTier";
DROP TYPE "public"."SkillTier_old";
COMMIT;

-- NOTE: Cố ý GIỮ các GIST index location (Prisma không biểu diễn được trong schema nên muốn drop).
