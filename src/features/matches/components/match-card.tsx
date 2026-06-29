import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import type { MatchListItem } from "../queries";
import {
  fieldTypeLabels,
  formatCost,
  formatPlayTime,
  matchTypeLabels,
  skillTierLabels,
} from "../labels";

// Màu badge theo loại kèo (token DESIGN.md, override variant mặc định của Badge).
const matchTypeBadge: Record<string, string> = {
  FIND_OPPONENT: "bg-type-opponent-soft text-type-opponent",
  NEED_PLAYERS: "bg-type-players-soft text-type-players",
  FIELD_AVAILABLE: "bg-type-field-soft text-type-field",
};

export function MatchCard({ match }: { match: MatchListItem }) {
  return (
    <Card className="gap-2">
      <CardContent className="flex flex-col gap-2">
        <div className="flex items-center justify-between gap-2">
          <Badge className={matchTypeBadge[match.matchType] ?? ""}>
            {matchTypeLabels[match.matchType]}
          </Badge>
          <span className="text-sm font-medium text-foreground">
            {formatPlayTime(match.playTime)}
          </span>
        </div>

        <div className="flex flex-wrap gap-1.5 text-xs">
          <Badge variant="secondary">{fieldTypeLabels[match.fieldType]}</Badge>
          <Badge variant="secondary">{skillTierLabels[match.skillTier]}</Badge>
          {match.costPerSide != null ? (
            <Badge variant="secondary">
              {formatCost(match.costPerSide)}/đội
            </Badge>
          ) : null}
        </div>

        <p className="text-sm text-muted-foreground">
          📍 {match.field?.name ?? match.area ?? "Chưa có sân"}
          {match.field?.address ? (
            <span className="text-ink-subtle"> · {match.field.address}</span>
          ) : null}
        </p>

        {match.note ? (
          <p className="line-clamp-2 text-sm text-foreground">{match.note}</p>
        ) : null}

        <p className="text-xs text-muted-foreground">
          {match.team?.name ?? match.creator.name ?? "Người dùng ẩn danh"}
        </p>
      </CardContent>
    </Card>
  );
}
