-- Đội hình theo trận: seed 1 lần từ TeamMember cho trận kèo, owner có thể remove.
ALTER TABLE "matches"
ADD COLUMN "squad_seeded_at" TIMESTAMP(3);

CREATE TABLE "match_squad_members" (
    "id" UUID NOT NULL,
    "match_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "match_squad_members_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "match_squad_members_match_id_user_id_key"
ON "match_squad_members"("match_id", "user_id");

CREATE INDEX "match_squad_members_user_id_idx"
ON "match_squad_members"("user_id");

ALTER TABLE "match_squad_members"
ADD CONSTRAINT "match_squad_members_match_id_fkey"
FOREIGN KEY ("match_id") REFERENCES "matches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "match_squad_members"
ADD CONSTRAINT "match_squad_members_user_id_fkey"
FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
