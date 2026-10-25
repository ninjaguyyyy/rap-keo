-- Khóa vote MVP theo thiết bị: 1 thiết bị chỉ được vote 1 lần trong 1 session.
CREATE TABLE "match_mvp_device_votes" (
    "id" UUID NOT NULL,
    "session_id" UUID NOT NULL,
    "device_hash" TEXT NOT NULL,
    "voter_user_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "match_mvp_device_votes_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "match_mvp_device_votes_session_id_device_hash_key"
ON "match_mvp_device_votes"("session_id", "device_hash");

CREATE INDEX "match_mvp_device_votes_session_id_idx"
ON "match_mvp_device_votes"("session_id");

CREATE INDEX "match_mvp_device_votes_voter_user_id_idx"
ON "match_mvp_device_votes"("voter_user_id");

ALTER TABLE "match_mvp_device_votes"
ADD CONSTRAINT "match_mvp_device_votes_session_id_fkey"
FOREIGN KEY ("session_id") REFERENCES "match_mvp_vote_sessions"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "match_mvp_device_votes"
ADD CONSTRAINT "match_mvp_device_votes_voter_user_id_fkey"
FOREIGN KEY ("voter_user_id") REFERENCES "users"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
