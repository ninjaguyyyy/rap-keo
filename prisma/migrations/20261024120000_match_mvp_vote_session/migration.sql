-- MVP vote theo trận: session (link token hash) + vote của từng thành viên.
CREATE TABLE "match_mvp_vote_sessions" (
    "id" UUID NOT NULL,
    "match_id" UUID NOT NULL,
    "token_hash" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "closed_at" TIMESTAMP(3),
    "created_by_user_id" UUID NOT NULL,
    "winner_user_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "match_mvp_vote_sessions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "match_mvp_votes" (
    "id" UUID NOT NULL,
    "session_id" UUID NOT NULL,
    "voter_user_id" UUID NOT NULL,
    "candidate_user_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "match_mvp_votes_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "match_mvp_vote_sessions_match_id_key" ON "match_mvp_vote_sessions"("match_id");
CREATE UNIQUE INDEX "match_mvp_vote_sessions_token_hash_key" ON "match_mvp_vote_sessions"("token_hash");
CREATE INDEX "match_mvp_vote_sessions_expires_at_idx" ON "match_mvp_vote_sessions"("expires_at");
CREATE INDEX "match_mvp_vote_sessions_closed_at_idx" ON "match_mvp_vote_sessions"("closed_at");
CREATE INDEX "match_mvp_vote_sessions_winner_user_id_idx" ON "match_mvp_vote_sessions"("winner_user_id");

CREATE UNIQUE INDEX "match_mvp_votes_session_id_voter_user_id_key" ON "match_mvp_votes"("session_id", "voter_user_id");
CREATE INDEX "match_mvp_votes_session_id_candidate_user_id_idx" ON "match_mvp_votes"("session_id", "candidate_user_id");
CREATE INDEX "match_mvp_votes_candidate_user_id_idx" ON "match_mvp_votes"("candidate_user_id");

ALTER TABLE "match_mvp_vote_sessions"
ADD CONSTRAINT "match_mvp_vote_sessions_match_id_fkey"
FOREIGN KEY ("match_id") REFERENCES "matches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "match_mvp_vote_sessions"
ADD CONSTRAINT "match_mvp_vote_sessions_created_by_user_id_fkey"
FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "match_mvp_vote_sessions"
ADD CONSTRAINT "match_mvp_vote_sessions_winner_user_id_fkey"
FOREIGN KEY ("winner_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "match_mvp_votes"
ADD CONSTRAINT "match_mvp_votes_session_id_fkey"
FOREIGN KEY ("session_id") REFERENCES "match_mvp_vote_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "match_mvp_votes"
ADD CONSTRAINT "match_mvp_votes_voter_user_id_fkey"
FOREIGN KEY ("voter_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "match_mvp_votes"
ADD CONSTRAINT "match_mvp_votes_candidate_user_id_fkey"
FOREIGN KEY ("candidate_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
