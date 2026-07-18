// Card hiển thị kèo sắp tới ("Next match") và các trận đã đá ("Previous games")
// trên trang chi tiết đội. Giống mock team detail: tiêu đề section + thông tin
// trận / danh sách trận với badge kết quả W/D/L.
//
// Đối thủ: resolve từ request ACCEPTED (requesterTeam.name). MVP chưa có flow
// gắn đội vào kèo nên thường trống -> card hiện empty state "Chưa có kèo".
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { MapPinIcon } from "@/features/matches/components/card-shared";
import {
  fieldTypeLabels,
  formatPlayTimes,
} from "@/features/matches/labels";
import type { TeamMatchItem, TeamRecentMatch } from "../queries";
import { TeamAvatar } from "./team-avatar";

// Giải màu badge kết quả (W/D/L) theo token DESIGN.md: thắng brand, hòa vàng, thua ink-muted.
function resultBadge(home: number | null, away: number | null) {
  if (home == null || away == null) return null;
  if (home > away) {
    return { label: "W", className: "bg-brand text-white" };
  }
  if (home < away) {
    return { label: "L", className: "bg-ink-muted text-white" };
  }
  return { label: "D", className: "bg-accent-yellow text-ink" };
}

// Đối thủ từ request ACCEPTED (requesterTeam). Trả "—" nếu chưa có.
function opponentName(match: TeamMatchItem | TeamRecentMatch): string {
  const req = match.requests[0];
  return req?.requesterTeam?.name ?? "Đội khách";
}

// Sân: ưu tiên field.name, fallback area text, cuối cùng "Chưa có sân".
function venueName(match: TeamMatchItem | TeamRecentMatch): string {
  return match.field?.name ?? match.area ?? "Chưa có sân";
}

// ---- Next match card ----
export function NextMatchCard({
  match,
  teamName,
}: {
  match: TeamMatchItem | null;
  teamName: string;
}) {
  return (
    <Card className="gap-0 p-0">
      <SectionHeader title="Trận sắp tới" />
      {match ? (
        <div className="flex flex-col gap-3 p-4">
          {/* Hai đội đối đầu + "VS" giữa. Tên đội nhà lấy từ prop teamName
              (truyền từ trang) vì include chỉ có field/requests. */}
          <div className="flex items-center justify-between gap-2">
            <TeamSide name={teamName} align="start" />
            <span className="shrink-0 text-xs font-bold uppercase tracking-wide text-ink-subtle">
              VS
            </span>
            <TeamSide name={opponentName(match)} align="end" />
          </div>

          {/* Giờ đá + sân. */}
          <div className="flex flex-col gap-1.5 border-t border-line pt-3 text-sm">
            <p className="font-semibold text-ink">
              {formatPlayTimes(match.playTimes)}
            </p>
            <p className="inline-flex items-center gap-1 text-ink-muted">
              <MapPinIcon />
              {venueName(match)}
            </p>
            <p className="text-ink-subtle">
              {fieldTypeLabels[match.fieldType]}
            </p>
          </div>
        </div>
      ) : (
        <EmptyMatchState text="Chưa có kèo sắp tới" />
      )}
    </Card>
  );
}

// ---- Previous games card ----
export function PreviousGamesCard({ matches }: { matches: TeamRecentMatch[] }) {
  return (
    <Card className="gap-0 p-0">
      <SectionHeader title="Các trận đã đá" />
      {matches.length > 0 ? (
        <ul className="flex flex-col divide-y divide-line">
          {matches.map((m) => {
            const home = m.homeScore;
            const away = m.awayScore;
            const badge = resultBadge(home, away);
            return (
              <li
                key={m.id}
                className="flex items-center gap-3 px-4 py-3"
              >
                {/* Badge kết quả W/D/L (nếu đã có tỷ số). */}
                {badge ? (
                  <span
                    className={cn(
                      "grid h-8 w-8 shrink-0 place-items-center rounded-lg text-sm font-extrabold",
                      badge.className,
                    )}
                  >
                    {badge.label}
                  </span>
                ) : (
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-surface-muted text-sm font-bold text-ink-subtle">
                    —
                  </span>
                )}

                {/* Tên đối thủ + sân. */}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-ink">
                    vs {opponentName(m)}
                  </p>
                  <p className="truncate text-xs text-ink-subtle">
                    {formatPlayTimes(m.playTimes)} · {venueName(m)}
                  </p>
                </div>

                {/* Tỷ số. */}
                <span className="shrink-0 font-mono text-sm font-bold tabular-nums text-ink">
                  {home != null && away != null ? `${home}-${away}` : "—"}
                </span>
              </li>
            );
          })}
        </ul>
      ) : (
        <EmptyMatchState text="Chưa có trận nào đã đá" />
      )}
    </Card>
  );
}

// ---- Helpers dùng chung ----
function SectionHeader({ title }: { title: string }) {
  return (
    <div className="border-b border-line px-4 py-2.5">
      <h2 className="text-sm font-bold uppercase tracking-wide text-ink-muted">
        {title}
      </h2>
    </div>
  );
}

// Một bên trong hàng đối đầu Next match: avatar chữ cái đầu + tên đội.
function TeamSide({
  name,
  align,
}: {
  name: string;
  align: "start" | "end";
}) {
  return (
    <div
      className={cn(
        "flex min-w-0 flex-1 items-center gap-2",
        align === "end" ? "flex-row-reverse text-right" : "",
      )}
    >
      <TeamAvatar name={name} size="sm" />
      <span className="truncate text-sm font-bold text-ink">{name}</span>
    </div>
  );
}

// Empty state gọn cho card khi chưa có kèo.
function EmptyMatchState({ text }: { text: string }) {
  return (
    <div className="flex items-center gap-2 px-4 py-6 text-sm text-ink-subtle">
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
        className="shrink-0 text-ink-subtle"
      >
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 2" />
      </svg>
      <span>{text}</span>
    </div>
  );
}
