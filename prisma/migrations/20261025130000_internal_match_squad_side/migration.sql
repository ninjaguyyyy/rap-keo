-- Hỗ trợ đội hình trận nội bộ: gán mỗi cầu thủ vào bên A/B hoặc dự bị.
CREATE TYPE "InternalSquadSide" AS ENUM ('SIDE_A', 'SIDE_B', 'BENCH');

ALTER TABLE "match_squad_members"
ADD COLUMN "internal_side" "InternalSquadSide";

UPDATE "match_squad_members" AS msm
SET "internal_side" = 'BENCH'::"InternalSquadSide"
FROM "matches" AS m
WHERE msm."match_id" = m."id"
  AND m."match_type" = 'INTERNAL'
  AND msm."internal_side" IS NULL;

CREATE INDEX "match_squad_members_match_id_internal_side_idx"
ON "match_squad_members"("match_id", "internal_side");
