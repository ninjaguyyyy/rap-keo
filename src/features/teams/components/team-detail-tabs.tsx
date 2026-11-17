"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronRightIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTab, TabsPanel } from "@/components/ui/tabs";
import {
  areaLabels,
  fieldTypeLabels,
  matchTypeLabels,
  skillTierLabels,
} from "@/features/matches/labels";
import type {
  TeamDetail,
  TeamMatchItem,
  TeamRecentMatch,
  TeamMemberItem,
  TeamPlayerStandingRow,
} from "../queries";
import { EditTeamDialog } from "./edit-team-dialog";
import { EditTeamSocialLinksDialog } from "./edit-team-social-links-dialog";
import { DeleteTeamButton } from "./delete-team-button";
import { MemberList } from "./member-list";
import { TeamAvatar } from "./team-avatar";
import { TeamMatchesPanel } from "./team-matches-panel";
import { TeamPlayerStandingsCard } from "./team-player-standings-card";

type TabId = "overview" | "squad" | "matches" | "table";

const TABS: { id: TabId; label: string }[] = [
  { id: "overview", label: "Tổng quan" },
  { id: "table", label: "BXH cầu thủ" },
  { id: "squad", label: "Đội hình" },
  { id: "matches", label: "Trận đấu" },
];

export function TeamDetailTabs({
  team,
  canManage,
  nextMatch,
  matches,
  upcoming,
  members,
  playerStandings,
}: {
  team: TeamDetail;
  canManage: boolean;
  nextMatch: TeamMatchItem | null;
  matches: TeamRecentMatch[];
  upcoming: TeamMatchItem[];
  members: TeamMemberItem[];
  playerStandings: TeamPlayerStandingRow[];
}) {
  const router = useRouter();
  const [formMode, setFormMode] = useState<"previous" | "upcoming">(
    "previous",
  );
  const recentMatches = matches.slice(0, 5);
  const formMatches =
    formMode === "previous" ? recentMatches : upcoming.slice(0, 5);

  return (
    <Tabs defaultValue="overview" className="mt-3 gap-6">
      <TabsList className="gap-7 border-b-0 px-1">
        {TABS.map(({ id, label }) => (
          <TabsTab
            key={id}
            value={id}
            className="cursor-pointer border-b-[3px] border-transparent pb-2 pt-0 text-[14px] leading-none font-medium tracking-[-0.01em] text-primary/80 hover:text-primary aria-selected:border-primary aria-selected:font-black aria-selected:text-primary data-[state=active]:border-primary data-[state=active]:font-black data-[state=active]:text-primary data-[selected]:border-primary data-[selected]:font-black data-[selected]:text-primary"
          >
            {label}
          </TabsTab>
        ))}
      </TabsList>

      {/* Tổng quan: body theo layout card giống mẫu. */}
      <TabsPanel value="overview" className="flex flex-col gap-4">
        <Card className="gap-0 border-0 p-0 ring-0 shadow-none">
          <div className="flex items-center justify-between gap-3 px-4 pb-2 pt-4">
            <OverviewSectionTitle title="Mạng xã hội CLB" className="p-0" />
            {canManage ? (
              <EditTeamSocialLinksDialog
                teamId={team.id}
                facebookUrl={team.facebookUrl}
                tiktokUrl={team.tiktokUrl}
              />
            ) : null}
          </div>
          <div className="mt-4 flex items-center gap-3 px-4 pb-4">
            {team.facebookUrl ? (
              <a
                href={team.facebookUrl}
                target="_blank"
                rel="noreferrer"
                className="grid h-8 w-8 place-items-center rounded-full bg-[#ebe5eb] text-[22px] font-black text-primary/90"
                aria-label="facebook"
              >
                <span className="-mt-0.5">f</span>
              </a>
            ) : (
              <span
                className="grid h-8 w-8 cursor-not-allowed place-items-center rounded-full bg-[#ebe5eb] text-[22px] font-black text-primary/45"
                aria-label="facebook-disabled"
                aria-disabled="true"
              >
                <span className="-mt-0.5">f</span>
              </span>
            )}

            {team.tiktokUrl ? (
              <a
                href={team.tiktokUrl}
                target="_blank"
                rel="noreferrer"
                className="grid h-8 w-8 place-items-center rounded-full bg-[#ebe5eb] text-[22px] font-black text-primary/90"
                aria-label="tiktok"
              >
                <Image
                  src="/tik-tok.png"
                  alt="TikTok"
                  width={18}
                  height={18}
                  className="h-4.5 w-4.5 object-contain"
                />
              </a>
            ) : (
              <span
                className="grid h-8 w-8 cursor-not-allowed place-items-center rounded-full bg-[#ebe5eb] text-[22px] font-black text-primary/45"
                aria-label="tiktok-disabled"
                aria-disabled="true"
              >
                <Image
                  src="/tik-tok.png"
                  alt="TikTok"
                  width={18}
                  height={18}
                  className="h-4.5 w-4.5 object-contain opacity-45"
                />
              </span>
            )}
          </div>
        </Card>

        <Card className="gap-0 border-0 p-0 ring-0 shadow-none">
          <OverviewSectionTitle title="Next Match" />
          {nextMatch ? (
            <div className="px-4 pb-4">
              <ul className="divide-y divide-line/80 rounded-xl">
                <li className="bg-surface px-2 py-4 first:rounded-t-xl last:rounded-b-xl">
                  <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
                    <div className="flex min-w-0 items-center justify-end gap-1.5">
                      <p className="truncate text-right text-[12px] font-semibold text-ink">
                        {team.name}
                      </p>
                      <Image
                        src={resolveTeamLogo(team.logoUrl)}
                        alt={`Logo ${team.name}`}
                        width={28}
                        height={28}
                        className="h-7 w-7 shrink-0 rounded-full object-cover object-center scale-110"
                      />
                    </div>

                    <div className="min-w-16 text-center">
                      <p className="text-[16px] leading-none font-extrabold tracking-tight text-ink">
                        {formatKickoffTime(nextMatch)}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="inline-flex h-7 items-center gap-1.5 rounded-full bg-surface-muted px-2 text-[11px] font-semibold text-ink-muted">
                        <span
                          aria-hidden="true"
                          className="inline-block size-1.5 rounded-full bg-brand/45"
                        />
                        <span>{resolvePrimarySkillLabel(nextMatch)}</span>
                      </span>
                      <Link
                        href={`/matches/${nextMatch.id}`}
                        className="inline-flex h-7 items-center justify-center whitespace-nowrap rounded-[8px] bg-brand px-2.5 text-xs font-semibold text-white hover:bg-brand-hover"
                      >
                        {matchTypeLabels[nextMatch.matchType]}
                      </Link>
                    </div>
                  </div>

                  <p className="mt-2 text-center text-xs font-medium text-ink-muted">
                    <span className="inline-flex items-center gap-2">
                      <span>{fieldTypeLabels[nextMatch.fieldType]}</span>
                      <span
                        aria-hidden="true"
                        className="inline-block size-1 rounded-full bg-ink-muted/70"
                      />
                      <span>
                        {areaLabels[nextMatch.area ?? ""] ??
                          nextMatch.field?.name ??
                          "Chưa có sân"}
                      </span>
                    </span>
                  </p>
                </li>
              </ul>
            </div>
          ) : (
            <p className="px-4 pb-4 text-[14px] text-ink-subtle">
              Chưa có trận sắp tới.
            </p>
          )}
        </Card>

        <Card className="gap-0 border-0 p-0 ring-0 shadow-none">
          <div className="flex items-center justify-between gap-3 px-4 pb-2 pt-4">
            <h2 className="inline-flex h-5 items-center gap-1.5 text-[16px] leading-none font-black tracking-[-0.01em] text-primary">
              <span className="inline-flex h-5 items-center">Team Form</span>
              <ChevronRightIcon className="size-4.5 shrink-0" aria-hidden="true" />
            </h2>
            <div className="inline-flex rounded-xl bg-surface-muted p-1">
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className={
                  formMode === "previous"
                    ? "h-9 rounded-lg bg-white px-4 text-[14px] font-black text-primary shadow-sm hover:bg-white"
                    : "h-9 rounded-lg px-4 text-[14px] font-semibold text-primary/70 hover:bg-white/70"
                }
                onClick={() => setFormMode("previous")}
              >
                Previous
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className={
                  formMode === "upcoming"
                    ? "h-9 rounded-lg bg-white px-4 text-[14px] font-black text-primary shadow-sm hover:bg-white"
                    : "h-9 rounded-lg px-4 text-[14px] font-semibold text-primary/70 hover:bg-white/70"
                }
                onClick={() => setFormMode("upcoming")}
              >
                Upcoming
              </Button>
            </div>
          </div>

          {formMatches.length > 0 ? (
            <div className="px-4 pb-4">
              <div className="mb-3 flex items-center gap-2.5">
                <TeamAvatar
                  name={team.name}
                  imageUrl={resolveTeamLogo(team.logoUrl)}
                  size="sm"
                  className="h-10 w-10 bg-surface"
                />
                <p className="truncate text-[20px] leading-none font-black text-primary">
                  {team.name}
                </p>
              </div>

              <div className="flex gap-4 overflow-x-auto pb-1">
                {formMatches.map((match, index) => {
                const home = match.homeScore;
                const away = match.awayScore;
                const hasScore = home != null && away != null;
                const opponent = resolveOpponent(match);

                return (
                    <article
                      key={match.id}
                      className="w-[112px] shrink-0"
                    >
                      <p className="text-center text-[14px] font-medium text-primary/65">
                        MW {index + 1}
                      </p>
                      <div className="mt-3 flex justify-center">
                        <TeamAvatar
                          name={opponent.name}
                          imageUrl={resolveTeamLogo(opponent.logoUrl)}
                          size="sm"
                          className="h-14 w-14 bg-surface"
                        />
                      </div>
                      <p className="mt-3 truncate text-center text-[14px] font-black tracking-[-0.01em] text-primary">
                        {formatOpponentLabel(opponent.name)}
                      </p>

                      <div className="mt-3 flex h-8 items-center justify-center rounded-full bg-brand px-3 text-center text-[16px] leading-none font-black tabular-nums tracking-[0.01em] text-white">
                        {hasScore ? `${home}-${away}` : formatKickoffTime(match)}
                      </div>
                    </article>
                  );
                })}
              </div>
            </div>
          ) : (
            <p className="px-4 pb-4 text-[14px] text-ink-subtle">
              Chưa có dữ liệu trận cho mục này.
            </p>
          )}
        </Card>

        {canManage ? (
          <Card className="gap-0 border-0 bg-linear-to-b from-surface to-surface-muted/40 p-0 ring-0 shadow-none">
            <div className="flex justify-end gap-2 px-4 py-2.5">
              <EditTeamDialog team={team} />
              <DeleteTeamButton
                team={team}
                onDeleted={() => router.push("/teams")}
              />
            </div>
          </Card>
        ) : null}
      </TabsPanel>

      {(["table", "squad", "matches"] as const).map((id) => (
        <TabsPanel key={id} value={id}>
          {id === "squad" ? (
            <div className="flex flex-col gap-4">
              <MemberList
                teamId={team.id}
                members={members}
                canManage={canManage}
              />
            </div>
          ) : id === "matches" ? (
            <TeamMatchesPanel
              teamId={team.id}
              teamName={team.name}
              upcoming={upcoming}
              past={matches}
              canManage={canManage}
            />
          ) : id === "table" ? (
            <TeamPlayerStandingsCard rows={playerStandings} />
          ) : null}
        </TabsPanel>
      ))}
    </Tabs>
  );
}

function OverviewSectionTitle({
  title,
  className,
}: {
  title: string;
  className?: string;
}) {
  return (
    <div className={className ?? "px-4 pb-2 pt-4"}>
      <h2 className="text-[16px] leading-none font-black tracking-[-0.01em] text-primary">
        {title}
      </h2>
    </div>
  );
}

function resolveOpponent(match: TeamMatchItem | TeamRecentMatch): {
  name: string;
  logoUrl: string | null;
} {
  const request = match.requests[0];
  return {
    name: request?.requesterTeam?.name ?? "Đội khách",
    logoUrl: request?.requesterTeam?.logoUrl ?? null,
  };
}

function resolvePrimarySkillLabel(match: TeamMatchItem): string {
  const primaryTier = match.skillTiers[0];
  return primaryTier ? skillTierLabels[primaryTier] : "Mọi trình độ";
}

function resolveTeamLogo(logoUrl: string | null | undefined): string {
  return logoUrl ?? "/logo.png";
}

function formatOpponentLabel(name: string): string {
  const base = name.trim();
  if (!base) return "--- (H)";

  // Ưu tiên mã viết tắt 3 ký tự nếu là tên nhiều từ để giống mock Team Form.
  const words = base.split(/\s+/).filter(Boolean);
  const short =
    words.length >= 2
      ? words.slice(0, 3).map((word) => word[0]).join("")
      : base.slice(0, 3);
  return `${short.toUpperCase()} (H)`;
}

function formatKickoffTime(match: TeamMatchItem | TeamRecentMatch): string {
  const first = [...match.playTimes].sort((a, b) => a.getTime() - b.getTime())[0];
  if (!first) return "--:--";

  return new Intl.DateTimeFormat("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Ho_Chi_Minh",
  }).format(first);
}

