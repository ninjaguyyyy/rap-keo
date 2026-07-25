-- Add round column to matches: vòng đấu cho tournament match LEAGUE.
-- Nullable: trận thường / team match không thuộc giải không có round.
ALTER TABLE "matches" ADD COLUMN "round" INTEGER;
