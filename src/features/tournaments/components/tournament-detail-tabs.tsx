"use client";

// Tabs trên trang chi tiết giải /tournaments/[id]. Mirror team-detail-tabs.
// 4 tabs: Tổng quan / Đội / Trận đấu / Bảng xếp hạng.
// - Tổng quan: info giải + action buttons (Gửi duyệt/Duyệt/Từ chối/Bắt đầu/Hủy)
//   + nút Sửa/Xóa (organizer, DRAFT/REJECTED).
// - Đội: list participant + nút Thêm đội (organizer, DRAFT/REJECTED).
// - Trận đấu: list Match (sắp tới + đã đá) + nút Cập nhật kết quả (organizer).
// - Bảng xếp hạng: league table từ Match COMPLETED (standings).
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTab, TabsPanel } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { MapPinIcon } from "@/features/matches/components/card-shared";
import { formatPlayTime } from "@/features/matches/labels";
import { TeamAvatar } from "@/features/teams/components/team-avatar";
import {
  fieldTypeLabels,
  tournamentFormatLabels,
  tournamentStatusLabels,
  tournamentStatusBadge,
} from "../labels";
import { teamSkillTierLabels } from "@/features/teams/labels";
import {
  approveTournament,
  cancelTournament,
  rejectTournament,
  startTournament,
  submitTournamentForApproval,
} from "../actions";
import { EditTournamentDialog } from "./edit-tournament-dialog";
import { DeleteTournamentButton } from "./delete-tournament-button";
import { AddParticipantDialog } from "./add-participant-dialog";
import { EditTournamentParticipantDialog } from "./edit-tournament-participant-dialog";
import { RemoveParticipantButton } from "./remove-participant-button";
import { AddTournamentPlayerDialog } from "./add-tournament-player-dialog";
import { RemoveTournamentPlayerButton } from "./remove-tournament-player-button";
import { EditTournamentMatchDialog } from "./edit-tournament-match-dialog";
import { GenerateFixturesButton } from "./generate-fixtures-button";
import { PlayerLeaderboardCard } from "./player-leaderboard-card";
import type {
  TournamentDetail,
  TournamentParticipantItem,
  TournamentMatchItem,
  StandingRow,
  PlayerLeaderboardRow,
} from "../queries";

type TabId = "overview" | "teams" | "matches" | "standings";

const TABS: { id: TabId; label: string }[] = [
  { id: "overview", label: "Tổng quan" },
  { id: "standings", label: "Bảng xếp hạng" },
  { id: "teams", label: "Đội" },
  { id: "matches", label: "Trận đấu" },
];

type TeamOption = { id: string; name: string; skillTier: string };
type MemberOption = { userId: string; name: string };

export function TournamentDetailTabs({
  tournament,
  canManage,
  canApprove,
  participants,
  matches,
  standings,
  playerLeaderboards,
  teamOptions,
  memberOptionsByParticipant,
}: {
  tournament: TournamentDetail;
  canManage: boolean;
  canApprove: boolean;
  participants: TournamentParticipantItem[];
  matches: TournamentMatchItem[];
  standings: StandingRow[];
  // 3 leaderboard cầu thủ: Vua phá lưới / Vua kiến tạo / MVP.
  playerLeaderboards: {
    topScorers: PlayerLeaderboardRow[];
    topAssists: PlayerLeaderboardRow[];
    topMvp: PlayerLeaderboardRow[];
  };
  // List team có sẵn để AddParticipantDialog chọn (server pre-fetched, search
  // limit 20). Truyền vào để dialog không cần fetch client-side.
  teamOptions: TeamOption[];
  // List TeamMember để AddTournamentPlayerDialog chọn, key = participantId (chỉ
  // participant có teamId mới có entry).
  memberOptionsByParticipant: Record<string, MemberOption[]>;
}) {
  const router = useRouter();
  const status = tournament.status;
  // hasFixtures: đã sinh cặp đấu chưa. Khi đã có -> ẩn Add/Remove participant
  // (tránh lệch cặp) + đổi nút "Tạo lịch đấu" thành "Sinh lại lịch".
  const hasFixtures = matches.length > 0;
  const hasCompletedMatch = matches.some((m) => m.status === "COMPLETED");
  const canEditParticipants =
    canManage && (status === "DRAFT" || status === "REJECTED");
  const canStart = canManage && status === "APPROVED" && !tournament.startedAt;
  const canCancel = (canManage || canApprove) && status !== "COMPLETED" && status !== "CANCELLED";

  return (
    <Tabs defaultValue="overview" className="gap-4">
      <TabsList>
        {TABS.map(({ id, label }) => (
          <TabsTab key={id} value={id}>
            {label}
          </TabsTab>
        ))}
      </TabsList>

      {/* Tổng quan: info giải + actions. */}
      <TabsPanel value="overview" className="flex flex-col gap-4">
        <Card className="gap-0 border border-line/80 bg-linear-to-b from-surface to-surface-muted/50 p-0">
          <div className="flex flex-col gap-3 p-4">
            {/* Badge status + format + fieldType. */}
            <div className="flex flex-wrap items-center gap-1.5">
              <span
                className={
                  "rounded-full px-2 py-0.5 text-xs font-bold " +
                  tournamentStatusBadge[status]
                }
              >
                {tournamentStatusLabels[status]}
              </span>
              <Badge variant="secondary">
                {tournamentFormatLabels[tournament.format]}
              </Badge>
              <Badge variant="secondary">
                {fieldTypeLabels[tournament.fieldType]}
              </Badge>
              {tournament.skillTier ? (
                <Badge variant="secondary">
                  {teamSkillTierLabels[tournament.skillTier]}
                </Badge>
              ) : null}
            </div>

            {/* Khu vực. */}
            {tournament.area ? (
              <p className="inline-flex items-center gap-1 text-sm text-ink-muted">
                <MapPinIcon />
                {tournament.area}
              </p>
            ) : null}

            {/* Mô tả. */}
            {tournament.description ? (
              <p className="text-sm text-ink">{tournament.description}</p>
            ) : null}

            {/* Organizer. */}
            <p className="text-sm text-ink-muted">
              Nhà tổ chức:{" "}
              <span className="font-semibold text-ink">
                {tournament.organizer.name ?? "—"}
              </span>
            </p>
          </div>

          {/* Action buttons theo quyền + status. */}
          {(canManage || canApprove) ? (
            <div className="flex flex-wrap justify-end gap-2 border-t border-line px-4 py-2.5">
              {/* Organizer actions. */}
              {canManage && (status === "DRAFT" || status === "REJECTED") ? (
                <>
                  <EditTournamentDialog tournament={tournament} />
                  <SubmitForApprovalButton tournamentId={tournament.id} />
                  <DeleteTournamentButton
                    tournament={tournament}
                    onDeleted={() => router.push("/tournaments")}
                  />
                </>
              ) : null}
              {canManage && status === "APPROVED" ? (
                <EditTournamentDialog tournament={tournament} />
              ) : null}
              {canStart ? <StartTournamentButton tournamentId={tournament.id} /> : null}
              {canApprove && status === "PENDING" ? (
                <>
                  <ApproveButton tournamentId={tournament.id} />
                  <RejectButton tournamentId={tournament.id} />
                </>
              ) : null}
              {canCancel ? <CancelButton tournamentId={tournament.id} /> : null}
            </div>
          ) : null}
        </Card>
      </TabsPanel>

      {/* Bảng xếp hạng: league table đội + 3 leaderboard cầu thủ. */}
      <TabsPanel value="standings" className="flex flex-col gap-4">
        <StandingsTable standings={standings} />
        <PlayerLeaderboardCard
          title="Vua phá lưới"
          rows={playerLeaderboards.topScorers}
          valueKey="goals"
          valueLabel="bàn"
        />
        <PlayerLeaderboardCard
          title="Vua kiến tạo"
          rows={playerLeaderboards.topAssists}
          valueKey="assists"
          valueLabel="kiến tạo"
        />
        <PlayerLeaderboardCard
          title="MVP"
          rows={playerLeaderboards.topMvp}
          valueKey="points"
          valueLabel="điểm"
        />
      </TabsPanel>

      {/* Đội tham gia. */}
      <TabsPanel value="teams">
        <ParticipantsList
          tournamentId={tournament.id}
          participants={participants}
          canEdit={canEditParticipants}
          hasFixtures={hasFixtures}
          teamOptions={teamOptions}
          memberOptionsByParticipant={memberOptionsByParticipant}
        />
      </TabsPanel>

      {/* Trận đấu. */}
      <TabsPanel value="matches">
        <MatchesList
          tournamentId={tournament.id}
          matches={matches}
          canManage={canManage}
          canGenerate={canManage && status !== "COMPLETED" && status !== "CANCELLED"}
          hasFixtures={hasFixtures}
          hasCompletedMatch={hasCompletedMatch}
          participants={participants.map((p) => ({
            id: p.id,
            displayName: p.displayName,
            players: p.players,
          }))}
        />
      </TabsPanel>
    </Tabs>
  );
}

// --- Organizer action buttons (useTransition + single-arg action). ---

function SubmitForApprovalButton({ tournamentId }: { tournamentId: string }) {
  const [pending, startTransition] = useTransition();
  const [err, setErr] = useState<string | undefined>();
  return (
    <>
      {err ? (
        <p className="w-full text-sm text-destructive">{err}</p>
      ) : null}
      <Button
        size="sm"
        disabled={pending}
        onClick={() => {
          setErr(undefined);
          startTransition(async () => {
            const res = await submitTournamentForApproval(tournamentId);
            if (!res.ok) setErr(res.error ?? "Không gửi duyệt được.");
          });
        }}
      >
        {pending ? "Đang gửi..." : "Gửi duyệt"}
      </Button>
    </>
  );
}

function ApproveButton({ tournamentId }: { tournamentId: string }) {
  const [pending, startTransition] = useTransition();
  const [err, setErr] = useState<string | undefined>();
  return (
    <>
      {err ? (
        <p className="w-full text-sm text-destructive">{err}</p>
      ) : null}
      <Button
        size="sm"
        disabled={pending}
        onClick={() => {
          setErr(undefined);
          startTransition(async () => {
            const res = await approveTournament(tournamentId);
            if (!res.ok) setErr(res.error ?? "Không duyệt được.");
          });
        }}
      >
        {pending ? "Đang duyệt..." : "Duyệt"}
      </Button>
    </>
  );
}

function RejectButton({ tournamentId }: { tournamentId: string }) {
  const [pending, startTransition] = useTransition();
  const [err, setErr] = useState<string | undefined>();
  return (
    <>
      {err ? (
        <p className="w-full text-sm text-destructive">{err}</p>
      ) : null}
      <Button
        variant="outline"
        size="sm"
        disabled={pending}
        onClick={() => {
          setErr(undefined);
          startTransition(async () => {
            const res = await rejectTournament(tournamentId);
            if (!res.ok) setErr(res.error ?? "Không từ chối được.");
          });
        }}
      >
        {pending ? "Đang xử lý..." : "Từ chối"}
      </Button>
    </>
  );
}

function StartTournamentButton({ tournamentId }: { tournamentId: string }) {
  const [pending, startTransition] = useTransition();
  const [err, setErr] = useState<string | undefined>();
  return (
    <>
      {err ? (
        <p className="w-full text-sm text-destructive">{err}</p>
      ) : null}
      <Button
        size="sm"
        disabled={pending}
        onClick={() => {
          setErr(undefined);
          startTransition(async () => {
            const res = await startTournament(tournamentId);
            if (!res.ok) setErr(res.error ?? "Không bắt đầu được giải.");
          });
        }}
      >
        {pending ? "Đang khóa đội..." : "Bắt đầu giải"}
      </Button>
    </>
  );
}

function CancelButton({ tournamentId }: { tournamentId: string }) {
  const [pending, startTransition] = useTransition();
  const [err, setErr] = useState<string | undefined>();
  return (
    <>
      {err ? (
        <p className="w-full text-sm text-destructive">{err}</p>
      ) : null}
      <Button
        variant="outline"
        size="sm"
        disabled={pending}
        onClick={() => {
          setErr(undefined);
          startTransition(async () => {
            const res = await cancelTournament(tournamentId);
            if (!res.ok) setErr(res.error ?? "Không hủy được giải.");
          });
        }}
      >
        {pending ? "Đang hủy..." : "Hủy giải"}
      </Button>
    </>
  );
}

// --- Participants list (tab "Đội"). ---

function ParticipantsList({
  tournamentId,
  participants,
  canEdit,
  hasFixtures,
  teamOptions,
  memberOptionsByParticipant,
}: {
  tournamentId: string;
  participants: TournamentParticipantItem[];
  canEdit: boolean;
  hasFixtures: boolean;
  teamOptions: TeamOption[];
  memberOptionsByParticipant: Record<string, MemberOption[]>;
}) {
  return (
    <Card className="gap-0 border border-line/80 bg-linear-to-b from-surface to-surface-muted/50 p-0">
      <div className="flex items-center justify-between gap-2 border-b border-line px-4 py-2.5">
        <h2 className="text-[11px] font-bold uppercase tracking-[0.12em] text-ink-muted">
          Đội tham gia ({participants.length})
        </h2>
        {canEdit ? (
          <AddParticipantDialog
            tournamentId={tournamentId}
            teamOptions={teamOptions}
          />
        ) : null}
      </div>

      {hasFixtures ? (
        <p className="border-b border-line px-4 py-2 text-xs text-ink-subtle">
          Đã có lịch đấu — thêm/xóa đội sẽ không tự cập nhật lịch. Bấm &ldquo;Sinh lại lịch&rdquo; ở tab Trận đấu để áp dụng đội mới.
        </p>
      ) : null}

      {participants.length === 0 ? (
        <div className="flex flex-col items-center gap-2 px-4 py-10 text-center">
          <p className="text-sm text-ink-muted">Chưa có đội nào tham gia</p>
          {canEdit ? (
            <p className="text-xs text-ink-subtle">
              Bấm &ldquo;Thêm đội&rdquo; để mời đội vào giải.
            </p>
          ) : null}
        </div>
      ) : (
        <ul className="flex flex-col divide-y divide-line">
          {participants.map((p) => (
            <li key={p.id} className="flex flex-col gap-2 px-4 py-2.5">
              <div className="flex items-center gap-3">
                <TeamAvatar name={p.displayName} size="sm" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[15px] leading-5 font-semibold text-ink">
                    {p.displayName}
                    <span className="ml-1.5 text-xs font-normal text-ink-subtle">
                      ({p.players.length} cầu thủ)
                    </span>
                  </p>
                  {p.team ? (
                    <p className="truncate text-xs text-ink-subtle">
                      {teamSkillTierLabels[p.team.skillTier]}
                    </p>
                  ) : null}
                </div>
                {p.team ? (
                  <Badge variant="outline">Team hệ thống</Badge>
                ) : (
                  <Badge variant="outline">Team lẻ</Badge>
                )}
                {canEdit ? (
                  <div className="flex items-center gap-0.5">
                    <EditTournamentParticipantDialog
                      participantId={p.id}
                      displayName={p.displayName}
                    />
                    <RemoveParticipantButton
                      tournamentId={tournamentId}
                      participantId={p.id}
                      displayName={p.displayName}
                    />
                  </div>
                ) : null}
              </div>

              {/* Sub-list cầu thủ của participant. */}
              <PlayersSubList
                participant={p}
                canEdit={canEdit}
                memberOptions={memberOptionsByParticipant[p.id] ?? []}
              />
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

// Sub-list cầu thủ của 1 participant: list bên dưới row participant (indent).
// Mỗi player: tên + số áo (nếu có) + badge "Khách" nếu userId null + nút xóa.
function PlayersSubList({
  participant,
  canEdit,
  memberOptions,
}: {
  participant: TournamentParticipantItem;
  canEdit: boolean;
  memberOptions: MemberOption[];
}) {
  const hasTeam = !!participant.teamId;
  const existingPlayerUserIds = participant.players
    .map((pl) => pl.userId)
    .filter((id): id is string => id !== null);

  return (
    <div className="ml-10 flex flex-col gap-1.5 rounded-xl bg-surface-muted/50 p-2.5">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-subtle">
          Cầu thủ ({participant.players.length})
        </p>
        {canEdit ? (
          <AddTournamentPlayerDialog
            participantId={participant.id}
            hasTeam={hasTeam}
            memberOptions={memberOptions}
            existingPlayerUserIds={existingPlayerUserIds}
          />
        ) : null}
      </div>

      {participant.players.length === 0 ? (
        <p className="px-1 py-1 text-xs text-ink-subtle">
          Chưa có cầu thủ.
        </p>
      ) : (
        <ul className="flex flex-col divide-y divide-line/60">
          {participant.players.map((pl) => (
            <li
              key={pl.id}
              className="flex items-center gap-2 py-1.5 first:pt-0 last:pb-0"
            >
              {pl.jerseyNumber != null ? (
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded bg-brand/10 font-mono text-xs font-bold text-brand">
                  {pl.jerseyNumber}
                </span>
              ) : (
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded bg-surface-muted font-mono text-xs text-ink-subtle">
                  —
                </span>
              )}
              <span className="min-w-0 flex-1 truncate text-sm text-ink">
                {pl.displayName}
              </span>
              {pl.userId == null ? (
                <Badge variant="outline">Khách</Badge>
              ) : null}
              {canEdit ? (
                <RemoveTournamentPlayerButton
                  participantId={participant.id}
                  playerId={pl.id}
                  displayName={pl.displayName}
                />
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// --- Matches list (tab "Trận đấu"). ---

type ParticipantOption = {
  id: string;
  displayName: string;
  players: TournamentParticipantItem["players"];
};

function MatchesList({
  tournamentId,
  matches,
  canManage,
  canGenerate,
  hasFixtures,
  hasCompletedMatch,
  participants,
}: {
  tournamentId: string;
  matches: TournamentMatchItem[];
  canManage: boolean;
  canGenerate: boolean;
  hasFixtures: boolean;
  hasCompletedMatch: boolean;
  // List participant (include players) để EditTournamentMatchDialog chọn scorer.
  participants: ParticipantOption[];
}) {
  // Group theo round: Map<round, matches[]>. Match round null -> nhóm "Khác".
  const roundMap = new Map<number, TournamentMatchItem[]>();
  const legacy: TournamentMatchItem[] = [];
  for (const m of matches) {
    if (m.round == null) {
      legacy.push(m);
    } else {
      const arr = roundMap.get(m.round) ?? [];
      arr.push(m);
      roundMap.set(m.round, arr);
    }
  }
  const rounds = [...roundMap.keys()].sort((a, b) => a - b);

  return (
    <div className="flex flex-col gap-4">
      {/* Header bar: title + nút Tạo lịch đấu / Sinh lại lịch (organizer). */}
      {canGenerate ? (
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-[11px] font-bold uppercase tracking-[0.12em] text-ink-muted">
            Trận đấu ({matches.length})
          </h2>
          <GenerateFixturesButton
            tournamentId={tournamentId}
            hasFixtures={hasFixtures}
            hasCompletedMatch={hasCompletedMatch}
          />
        </div>
      ) : null}

      {matches.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-line bg-linear-to-b from-surface to-surface-muted px-4 py-10 text-center">
          <p className="text-sm text-ink-muted">Chưa có trận nào</p>
          {canGenerate ? (
            <p className="text-xs text-ink-subtle">
              Bấm &ldquo;Tạo lịch đấu&rdquo; để hệ thống sinh các cặp đấu theo thể thức.
            </p>
          ) : null}
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {rounds.map((r) => {
            const list = roundMap.get(r) ?? [];
            return (
              <section key={r} className="flex flex-col gap-3">
                <h2 className="text-[11px] font-bold uppercase tracking-[0.12em] text-ink-muted">
                  Vòng {r}
                  <span className="ml-1.5 text-xs font-normal text-ink-subtle">
                    ({list.length} trận)
                  </span>
                </h2>
                <ul className="flex flex-col gap-3">
                  {list.map((m) => (
                    <li key={m.id}>
                      <TournamentMatchRow
                        match={m}
                        canManage={canManage}
                        participants={participants}
                      />
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}

          {legacy.length > 0 ? (
            <section className="flex flex-col gap-3">
              <h2 className="text-[11px] font-bold uppercase tracking-[0.12em] text-ink-muted">
                Khác
              </h2>
              <ul className="flex flex-col gap-3">
                {legacy.map((m) => (
                  <li key={m.id}>
                    <TournamentMatchRow
                      match={m}
                      canManage={canManage}
                      participants={participants}
                    />
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </div>
      )}
    </div>
  );
}

function TournamentMatchRow({
  match,
  canManage,
  participants,
}: {
  match: TournamentMatchItem;
  canManage: boolean;
  participants: ParticipantOption[];
}) {
  const home = match.sideAName ?? "Bên A";
  const away = match.sideBName ?? "Bên B";
  const hasScore = match.homeScore != null && match.awayScore != null;
  const isCancelled = match.status === "CANCELLED";

  // Hiển thị giờ đá (nếu có) dưới row — tournament match MVP 1 giờ đá/trận.
  const playTime = match.playTimes[0];
  const area = match.area;

  return (
    <Card className="gap-0 border border-line/80 bg-linear-to-b from-surface to-surface-muted/50 p-0">
      <div className="flex items-center gap-2 px-4 pt-2.5">
        <TeamSide name={home} />
        <ScoreOrVs
          home={match.homeScore}
          away={match.awayScore}
          hasScore={hasScore}
          isCancelled={isCancelled}
        />
        <TeamSide name={away} align="end" />
      </div>

      <div className="flex items-center justify-between gap-2 border-t border-line px-4 py-2">
        <div className="flex min-w-0 flex-1 flex-col gap-0.5 text-xs text-ink-subtle">
          <div className="flex items-center gap-1.5">
            <MapPinIcon />
            <span className="truncate">
              {area ?? "Chưa có khu vực"}
            </span>
          </div>
          {playTime ? (
            <span className="pl-5 tabular-nums">
              {formatPlayTime(playTime)}
            </span>
          ) : (
            <span className="pl-5">Chưa lên lịch</span>
          )}
        </div>
        {/* Nút sửa trận (organizer, không phải CANCELLED). */}
        {canManage && !isCancelled ? (
          <EditTournamentMatchDialog match={match} participants={participants} />
        ) : null}
      </div>
    </Card>
  );
}

function TeamSide({
  name,
  align = "start",
}: {
  name: string;
  align?: "start" | "end";
}) {
  return (
    <div
      className={
        "flex min-w-0 flex-1 items-center gap-2" +
        (align === "end" ? " flex-row-reverse text-right" : "")
      }
    >
      <TeamAvatar name={name} size="sm" />
      <span className="truncate text-[15px] font-bold text-ink">{name}</span>
    </div>
  );
}

function ScoreOrVs({
  home,
  away,
  hasScore,
  isCancelled,
}: {
  home: number | null;
  away: number | null;
  hasScore: boolean;
  isCancelled: boolean;
}) {
  if (isCancelled && !hasScore) {
    return (
      <span className="shrink-0 px-2 text-xs font-bold uppercase tracking-wide text-ink-subtle">
        Hủy
      </span>
    );
  }
  if (!hasScore) {
    return (
      <span className="shrink-0 px-2 text-xs font-bold uppercase tracking-wide text-ink-subtle">
        VS
      </span>
    );
  }
  return (
    <span className="shrink-0 px-2 font-mono text-[2rem] leading-none font-black tabular-nums text-ink">
      {home}
      <span className="mx-1 text-ink-subtle">-</span>
      {away}
    </span>
  );
}

// --- Standings table (tab "Bảng xếp hạng"). ---

function StandingsTable({ standings }: { standings: StandingRow[] }) {
  const [mode, setMode] = useState<"short" | "full">("short");

  if (standings.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-line bg-linear-to-b from-surface to-surface-muted px-4 py-10 text-center">
        <p className="text-sm text-ink-muted">Chưa có đội nào</p>
        <p className="text-xs text-ink-subtle">
          Bảng xếp hạng sẽ có khi giải bắt đầu và có trận đã đá.
        </p>
      </div>
    );
  }

  const isShortMode = mode === "short";
  const columnsClassName = isShortMode
    ? "grid-cols-[2.5rem_minmax(11rem,1fr)_2.25rem_2.25rem_2.75rem_2.75rem]"
    : "grid-cols-[2.5rem_minmax(11rem,1fr)_2.25rem_2.25rem_2.25rem_2.25rem_2.5rem_2.5rem_2.75rem_2.75rem]";

  function rankAccentClass(rank: number) {
    if (rank <= 4) return "bg-type-players";
    if (rank === 5) return "bg-accent-yellow";
    return "bg-transparent";
  }

  function formatGoalDiff(value: number) {
    return `${value > 0 ? "+" : ""}${value}`;
  }

  return (
    <Card className="gap-3 border border-line/80 bg-linear-to-b from-surface to-surface-muted/50 p-3">
      <div className="rounded-xl bg-surface-muted p-1">
        <div className="grid grid-cols-2 gap-1">
          <button
            type="button"
            onClick={() => setMode("short")}
            className={cn(
              "rounded-lg px-3 py-2 text-base font-semibold transition-colors",
              isShortMode
                ? "bg-surface text-ink shadow-sm"
                : "text-ink-muted hover:bg-surface/60",
            )}
            aria-pressed={isShortMode}
          >
            Short
          </button>
          <button
            type="button"
            onClick={() => setMode("full")}
            className={cn(
              "rounded-lg px-3 py-2 text-base font-semibold transition-colors",
              !isShortMode
                ? "bg-surface text-ink shadow-sm"
                : "text-ink-muted hover:bg-surface/60",
            )}
            aria-pressed={!isShortMode}
          >
            Full
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <div className={cn("min-w-[560px]", !isShortMode ? "min-w-[760px]" : undefined)}>
          <div className={cn("grid items-center gap-2 px-3 py-2 text-[11px] font-semibold text-ink-muted", columnsClassName)}>
            <span className="text-left">Pos</span>
            <span className="text-left">Team</span>
            <span className="text-center">Pl</span>
            <span className="text-center">W</span>
            {isShortMode ? null : (
              <>
                <span className="text-center">D</span>
                <span className="text-center">L</span>
                <span className="text-center">GF</span>
                <span className="text-center">GA</span>
              </>
            )}
            <span className="text-center">GD</span>
            <span className="text-center">Pts</span>
          </div>

          <ul className="flex flex-col gap-2">
            {standings.map((row, idx) => {
              const rank = idx + 1;
              return (
                <li
                  key={row.participantId}
                  className="relative overflow-hidden rounded-xl border border-line/70 bg-surface"
                >
                  <span
                    aria-hidden="true"
                    className={cn("absolute inset-y-3 left-0 w-1 rounded-r-full", rankAccentClass(rank))}
                  />
                  <div className={cn("grid items-center gap-2 px-3 py-3 text-sm", columnsClassName)}>
                    <span className="font-black tabular-nums text-ink">{String(rank).padStart(2, "0")}</span>
                    <div className="flex items-center gap-2">
                      <TeamAvatar name={row.displayName} size="sm" />
                      <span className="truncate text-[1.1rem] leading-6 font-black text-ink">
                        {row.displayName}
                      </span>
                    </div>
                    <span className="text-center tabular-nums text-ink">{row.played}</span>
                    <span className="text-center tabular-nums text-ink">{row.won}</span>
                    {isShortMode ? null : (
                      <>
                        <span className="text-center tabular-nums text-ink">{row.drawn}</span>
                        <span className="text-center tabular-nums text-ink">{row.lost}</span>
                        <span className="text-center tabular-nums text-ink">{row.goalsFor}</span>
                        <span className="text-center tabular-nums text-ink">{row.goalsAgainst}</span>
                      </>
                    )}
                    <span className="text-center tabular-nums text-ink">{formatGoalDiff(row.goalDiff)}</span>
                    <span className="text-center font-extrabold tabular-nums text-brand">{row.points}</span>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </Card>
  );
}
