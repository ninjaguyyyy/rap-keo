-- Add primary color for team cards.
ALTER TABLE "teams"
ADD COLUMN "primary_color" TEXT NOT NULL DEFAULT 'PURPLE_STORM';

-- Restrict to approved palette keys to keep white-text contrast reliable.
ALTER TABLE "teams"
ADD CONSTRAINT "teams_primary_color_check"
CHECK (
  "primary_color" IN (
    'PURPLE_STORM',
    'CRIMSON_RED',
    'ROYAL_BLUE',
    'EMERALD_GREEN',
    'DEEP_TEAL',
    'MIDNIGHT_NAVY',
    'DARK_ORANGE',
    'CHARCOAL'
  )
);
