"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import {
  MOCK_REPORTED_MATCH_IDS_KEY,
  type OpenMatch,
} from "@/features/matches/mock-open-data";

type MockOpenMatchesListProps = Readonly<{
  blockKey: string;
  matches: OpenMatch[];
}>;

function kickoffToMinutes(value: string): number {
  const [hourRaw, minuteRaw] = value.split(":");
  const hour = Number(hourRaw);
  const minute = Number(minuteRaw);
  if (Number.isNaN(hour) || Number.isNaN(minute)) return 0;
  return hour * 60 + minute;
}

function formatKickoffLabel(value: string): string {
  const [hourRaw, minuteRaw] = value.split(":");
  const hour = Number(hourRaw);
  if (Number.isNaN(hour)) return value;
  return `${hour}h${minuteRaw}`;
}

function formatSkillLabel(value: string): string {
  if (value === "Mọi trình độ") return "ALL";
  if (value === "Trung bình") return "TB";
  if (value === "Trung Bình Khá" || value === "TB Khá" || value === "TB khá") return "TBK";
  if (value === "Trung Bình Yếu" || value === "TB Yếu" || value === "TB yếu") return "TBY";
  return value;
}

function TeamNameWithLogo({
  name,
  logo,
  align,
}: Readonly<{
  name: string;
  logo?: string;
  align: "home" | "away";
}>) {
  const logoSrc = logo?.trim() ? logo : "/logo-with-background.png";
  const teamLogo = (
    <img
      src={logoSrc}
      alt={`Logo ${name}`}
      className={align === "home" ? "h-7 w-7 shrink-0 rounded-full object-cover" : "h-6 w-6 shrink-0 rounded-full object-cover"}
    />
  );

  if (align === "home") {
    return (
      <div className="flex min-w-0 items-center justify-end gap-1.5">
        <p className="truncate text-right text-[12px] font-semibold text-ink">{name}</p>
        {teamLogo}
      </div>
    );
  }

  return (
    <div className="flex min-w-0 items-center gap-1.5">
      {teamLogo}
      <p className="truncate text-[12px] font-semibold text-ink">{name}</p>
    </div>
  );
}

export function MockOpenMatchesList({ blockKey, matches }: MockOpenMatchesListProps) {
  const [reportedIds] = useState<string[]>(() => {
    if (typeof window === "undefined") return [];

    const raw = window.localStorage.getItem(MOCK_REPORTED_MATCH_IDS_KEY);
    if (!raw) return [];

    try {
      const parsed = JSON.parse(raw) as unknown;
      return Array.isArray(parsed)
        ? parsed.filter((value): value is string => typeof value === "string")
        : [];
    } catch {
      return [];
    }
  });

  const filteredMatches = useMemo(
    () => matches.filter((match) => !reportedIds.includes(match.id)),
    [matches, reportedIds],
  );

  const groupedMatches = useMemo(
    () => Object.entries(
      filteredMatches.reduce<Record<string, OpenMatch[]>>((acc, match) => {
        if (!acc[match.kickoff]) {
          acc[match.kickoff] = [];
        }
        acc[match.kickoff].push(match);
        return acc;
      }, {}),
    ).sort(([timeA], [timeB]) => kickoffToMinutes(timeA) - kickoffToMinutes(timeB)),
    [filteredMatches],
  );

  return (
    <Card key={blockKey} className="rounded-2xl py-0 ring-0 shadow-none" size="sm">
      <CardContent className="px-4 py-4">
        {groupedMatches.length === 0 ? (
          <p className="rounded-xl bg-surface-muted px-3 py-4 text-center text-sm font-medium text-ink-muted">
            Không còn kèo mở trong danh sách này.
          </p>
        ) : (
          <div className="space-y-4">
            {groupedMatches.map(([kickoff, kickoffMatches]) => (
              <section key={kickoff} className="space-y-2">
                <h2 className="font-heading text-[16px] font-bold text-ink">
                  {formatKickoffLabel(kickoff)}
                </h2>
                <ul className="divide-y divide-line/80 rounded-xl">
                  {kickoffMatches.map((match) => (
                    <li key={match.id} className="bg-surface px-2 py-4 first:rounded-t-xl last:rounded-b-xl">
                      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
                        <TeamNameWithLogo name={match.homeTeam} logo={match.homeLogo} align="home" />
                        <div className="min-w-16 text-center">
                          {match.matchType === "NEED_PLAYERS" && (match.neededPlayers ?? 0) > 0 ? (
                            <span className="mb-1 inline-flex items-center rounded bg-brand px-1.5 py-1 text-[10px] font-bold leading-none text-white">
                              Thiếu người: {match.neededPlayers}
                            </span>
                          ) : null}
                          <p className="text-[16px] leading-none font-extrabold tracking-tight text-ink">
                            {match.kickoff}
                          </p>
                        </div>
                        {match.awayTeam ? (
                          <TeamNameWithLogo name={match.awayTeam} logo={match.awayLogo} align="away" />
                        ) : (
                          <div className="flex items-center gap-2">
                            <span className="inline-flex h-7 items-center gap-1.5 rounded-full bg-surface-muted px-2 text-[11px] font-semibold text-ink-muted">
                              <span aria-hidden="true" className="inline-block size-1.5 rounded-full bg-brand/45" />
                              <span>{formatSkillLabel(match.skillLabel)}</span>
                            </span>
                            <Link
                              href={`/matches/mock/${match.id}`}
                              className="inline-flex h-7 items-center rounded-[8px] bg-brand px-2.5 text-xs font-semibold text-white hover:bg-brand-hover"
                            >
                              Nhận kèo
                            </Link>
                          </div>
                        )}
                      </div>
                      <p className="mt-2 text-center text-xs font-medium text-ink-muted">
                        <span className="inline-flex items-center gap-2">
                          <span>{match.fieldType}</span>
                          <span aria-hidden="true" className="inline-block size-1 rounded-full bg-ink-muted/70" />
                          <span>{match.district}</span>
                        </span>
                      </p>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
