-- Thêm loại kèo mới: LOOKING_FOR_TEAM (Tìm đội) — cá nhân 1-2 cầu rảnh tìm đội đá.
ALTER TYPE "MatchType" ADD VALUE IF NOT EXISTS 'LOOKING_FOR_TEAM';
