-- Enums cho giải đấu (MVP: chỉ LEAGUE format).
CREATE TYPE "TournamentFormat" AS ENUM ('LEAGUE');
CREATE TYPE "TournamentStatus" AS ENUM ('DRAFT', 'PENDING', 'APPROVED', 'REJECTED', 'COMPLETED', 'CANCELLED');
CREATE TYPE "TournamentParticipantStatus" AS ENUM ('ACCEPTED', 'PENDING', 'REJECTED');

-- Bảng tournaments.
CREATE TABLE "tournaments" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "banner_url" TEXT,
    "field_type" "FieldType" NOT NULL,
    "format" "TournamentFormat" NOT NULL,
    "skill_tier" "SkillTier",
    "area" TEXT,
    "organizer_id" UUID NOT NULL,
    "status" "TournamentStatus" NOT NULL DEFAULT 'DRAFT',
    "started_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tournaments_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "tournaments_organizer_id_idx" ON "tournaments"("organizer_id");
CREATE INDEX "tournaments_status_idx" ON "tournaments"("status");

-- Bảng tournament_participants.
CREATE TABLE "tournament_participants" (
    "id" UUID NOT NULL,
    "tournament_id" UUID NOT NULL,
    "team_id" UUID,
    "display_name" TEXT NOT NULL,
    "status" "TournamentParticipantStatus" NOT NULL DEFAULT 'ACCEPTED',
    "joined_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tournament_participants_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "tournament_participants_tournament_id_display_name_key"
    ON "tournament_participants"("tournament_id", "display_name");
CREATE INDEX "tournament_participants_tournament_id_idx" ON "tournament_participants"("tournament_id");
CREATE INDEX "tournament_participants_team_id_idx" ON "tournament_participants"("team_id");

-- FK cho tournaments + tournament_participants.
ALTER TABLE "tournaments" ADD CONSTRAINT "tournaments_organizer_id_fkey"
    FOREIGN KEY ("organizer_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "tournament_participants" ADD CONSTRAINT "tournament_participants_tournament_id_fkey"
    FOREIGN KEY ("tournament_id") REFERENCES "tournaments"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "tournament_participants" ADD CONSTRAINT "tournament_participants_team_id_fkey"
    FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Thêm cột tournament_id cho matches + index + FK.
ALTER TABLE "matches" ADD COLUMN "tournament_id" UUID;
CREATE INDEX "matches_tournament_id_idx" ON "matches"("tournament_id");
ALTER TABLE "matches" ADD CONSTRAINT "matches_tournament_id_fkey"
    FOREIGN KEY ("tournament_id") REFERENCES "tournaments"("id") ON DELETE CASCADE ON UPDATE CASCADE;
