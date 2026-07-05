import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import type { MatchListItem } from "../queries";
import {
  CardFooter,
  LiveTimeChip,
  SkillFieldBadges,
  matchTypeBadge,
  matchTypeLabels,
  AreaLine,
} from "./card-shared";
import { areaLabels } from "../labels";

// Layout mặc định (trắng) — cho NEED_PLAYERS, FIELD_AVAILABLE.
export function DefaultMatchCard({ match }: { match: MatchListItem }) {
  const isLive = match.status === "MATCHED" || match.status === "CONFIRMED";

  return (
    <Card className="gap-2">
      <CardContent className="flex flex-col gap-2">
        <div className="flex items-center justify-between gap-2">
          <Badge className={matchTypeBadge[match.matchType] ?? ""}>
            {matchTypeLabels[match.matchType]}
          </Badge>
          <LiveTimeChip isLive={isLive} playTimes={match.playTimes} />
        </div>

        <SkillFieldBadges match={match} />

        <AreaLine match={match} />

        {match.note ? (
          <p className="line-clamp-2 text-sm text-foreground">{match.note}</p>
        ) : null}

        <CardFooter match={match} />
      </CardContent>
    </Card>
  );
}

export { areaLabels };
