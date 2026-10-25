// Card giải trong list (/tournaments, /my-tournaments). Banner thumb + tên +
// status badge + format + fieldType + organizer. Click -> /tournaments/[id].
// Mirror team-card.tsx nhưng có banner thumb thay vì avatar tròn.
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  fieldTypeLabels,
  tournamentFormatLabels,
  tournamentStatusBadge,
  tournamentStatusLabels,
} from "../labels";
import type { TournamentListItem } from "../queries";

export function TournamentCard({
  tournament,
}: {
  tournament: TournamentListItem;
}) {
  return (
    <Link href={`/tournaments/${tournament.slug}`} className="block">
      <Card className="gap-0 border border-line/80 bg-linear-to-b from-surface to-surface-muted/50 p-0 transition-shadow hover:ring-1 hover:ring-brand/30">
        {/* Banner thumb 16:9 — fallback gradient brand-spotlight + hex pattern. */}
        <div className="relative aspect-[16/9] w-full overflow-hidden rounded-t-2xl bg-brand-spotlight">
          {tournament.bannerUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={tournament.bannerUrl}
              alt=""
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="hex-bg absolute inset-0" aria-hidden="true" />
          )}
          {/* Badge status góc trên-trái. */}
          <span
            className={
              "absolute left-2 top-2 rounded-full px-2 py-0.5 text-[11px] font-bold tracking-wide " +
              tournamentStatusBadge[tournament.status]
            }
          >
            {tournamentStatusLabels[tournament.status]}
          </span>
        </div>

        {/* Body: tên + metadata. */}
        <div className="flex flex-col gap-2 p-4">
          <p className="truncate text-xl leading-tight font-black tracking-[-0.01em] text-ink">
            {tournament.name}
          </p>
          <div className="flex flex-wrap items-center gap-1.5">
            <Badge variant="secondary">
              {tournamentFormatLabels[tournament.format]}
            </Badge>
            <Badge variant="secondary">
              {fieldTypeLabels[tournament.fieldType]}
            </Badge>
          </div>
        </div>
      </Card>
    </Link>
  );
}
