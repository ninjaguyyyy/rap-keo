"use client";

// Dialog "Sửa trận" trong giải (organizer). Gộp: 2 đội + ngày giờ + khu vực + tỷ số
// + danh sách bàn (scorer + assist). 2 đội chọn từ Select participant trong giải
// (đổi sideAName/sideBName snapshot). Bàn chọn từ player của participant theo side.
// Mirror set-match-score-dialog.tsx + update-match-result-dialog.tsx (matches).
import { useActionState, useEffect, useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { updateTournamentMatch } from "../actions";
import type { UpdateTournamentMatchState } from "../schemas";
import type { TournamentMatchItem, TournamentPlayerItem } from "../queries";

const initialState: UpdateTournamentMatchState = {};

type ParticipantOption = {
  id: string;
  displayName: string;
  players: TournamentPlayerItem[];
};

type ScorerRow = {
  scorerKey: string; // "u:<userId>" hoặc "p:<playerId>"
  assistKey: string; // "" = không có assist
  side: "home" | "away";
};

// Date -> "YYYY-MM-DDTHH:mm" theo giờ VN (UTC+7) cho <input datetime-local>.
// Trả "" nếu date null/invalid. Dùng offset thủ công (không thêm Intl object).
function dateToLocalInput(d: Date | null | undefined): string {
  if (!d) return "";
  const t = d.getTime() + 7 * 3600 * 1000;
  if (Number.isNaN(t)) return "";
  return new Date(t).toISOString().slice(0, 16);
}

export function EditTournamentMatchDialog({
  match,
  participants,
}: {
  match: TournamentMatchItem;
  participants: ParticipantOption[];
}) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(
    updateTournamentMatch,
    initialState,
  );

  // Resolve participantId từ sideAName/sideBName snapshot (match theo displayName).
  const initialHomeId = useMemo(
    () =>
      participants.find((p) => p.displayName === match.sideAName)?.id ?? "",
    [participants, match.sideAName],
  );
  const initialAwayId = useMemo(
    () =>
      participants.find((p) => p.displayName === match.sideBName)?.id ?? "",
    [participants, match.sideBName],
  );

  // Prefill từ match.
  const initPlayTime = dateToLocalInput(match.playTimes[0]);
  const initArea = match.area ?? "";
  const initHomeScore =
    match.homeScore != null ? match.homeScore.toString() : "";
  const initAwayScore =
    match.awayScore != null ? match.awayScore.toString() : "";

  const [homeId, setHomeId] = useState<string>(initialHomeId);
  const [awayId, setAwayId] = useState<string>(initialAwayId);
  const [playTime, setPlayTime] = useState<string>(initPlayTime);
  const [area, setArea] = useState<string>(initArea);
  const [homeScore, setHomeScore] = useState<string>(initHomeScore);
  const [awayScore, setAwayScore] = useState<string>(initAwayScore);
  // Danh sách bàn — khởi tạo rỗng (không prefill từ playerStats vì DB chỉ lưu
  // aggregate goals/assists, không lưu cặp scorer-assist). User nhập lại khi sửa.
  const [scorers, setScorers] = useState<ScorerRow[]>([]);

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (open) {
      setHomeId(initialHomeId);
      setAwayId(initialAwayId);
      setPlayTime(initPlayTime);
      setArea(initArea);
      setHomeScore(initHomeScore);
      setAwayScore(initAwayScore);
      setScorers([]);
    }
  }, [
    open,
    initialHomeId,
    initialAwayId,
    initPlayTime,
    initArea,
    initHomeScore,
    initAwayScore,
  ]);
  useEffect(() => {
    if (state.ok) setOpen(false);
  }, [state]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const isCompleted = match.status === "COMPLETED";
  const homeLabel =
    participants.find((p) => p.id === homeId)?.displayName ??
    match.sideAName ??
    "Bên A";
  const awayLabel =
    participants.find((p) => p.id === awayId)?.displayName ??
    match.sideBName ??
    "Bên B";

  const homePlayers = participants.find((p) => p.id === homeId)?.players ?? [];
  const awayPlayers = participants.find((p) => p.id === awayId)?.players ?? [];

  function addScorer(side: "home" | "away") {
    setScorers((prev) => [...prev, { scorerKey: "", assistKey: "", side }]);
  }
  function removeScorer(idx: number) {
    setScorers((prev) => prev.filter((_, i) => i !== idx));
  }
  function setScorerField(
    idx: number,
    field: "scorerKey" | "assistKey",
    value: string,
  ) {
    setScorers((prev) =>
      prev.map((row, i) => (i === idx ? { ...row, [field]: value } : row)),
    );
  }

  // Render 1 row scorer: select scorer + select assist (optional) + nút xóa.
  // Options = players của participant theo row.side.
  function renderScorerRow(row: ScorerRow, idx: number) {
    const players = row.side === "home" ? homePlayers : awayPlayers;
    const sideLabel = row.side === "home" ? homeLabel : awayLabel;
    return (
      <li
        key={idx}
        className="flex flex-col gap-1.5 rounded-lg border border-line p-2.5"
      >
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wide text-ink-subtle">
            {sideLabel}
          </span>
          <button
            type="button"
            onClick={() => removeScorer(idx)}
            className="text-ink-subtle hover:text-destructive"
            aria-label="Xóa bàn"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M3 6h18" />
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
            </svg>
          </button>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="flex flex-col gap-1">
            <Label className="text-xs text-ink-subtle">Ghi bàn</Label>
            <Select
              value={row.scorerKey}
              onValueChange={(v) => setScorerField(idx, "scorerKey", String(v))}
            >
              <SelectTrigger className="h-9 w-full">
                <SelectValue placeholder="Chọn" />
              </SelectTrigger>
              <SelectContent>
                {players.length === 0 ? (
                  <SelectItem value="_none" disabled>
                    Chưa có cầu thủ
                  </SelectItem>
                ) : (
                  players.map((pl) => {
                    const key = pl.userId ? `u:${pl.userId}` : `p:${pl.id}`;
                    return (
                      <SelectItem key={pl.id} value={key}>
                        {pl.jerseyNumber != null ? `${pl.jerseyNumber}. ` : ""}
                        {pl.displayName}
                      </SelectItem>
                    );
                  })
                )}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1">
            <Label className="text-xs text-ink-subtle">Kiến tạo</Label>
            <Select
              value={row.assistKey}
              onValueChange={(v) => setScorerField(idx, "assistKey", String(v))}
            >
              <SelectTrigger className="h-9 w-full">
                <SelectValue placeholder="(không)" />
              </SelectTrigger>
              <SelectContent>
                {players.map((pl) => {
                  const key = pl.userId ? `u:${pl.userId}` : `p:${pl.id}`;
                  return (
                    <SelectItem
                      key={pl.id}
                      value={key}
                      disabled={key === row.scorerKey}
                    >
                      {pl.jerseyNumber != null ? `${pl.jerseyNumber}. ` : ""}
                      {pl.displayName}
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>
        </div>
      </li>
    );
  }

  const homeScorers = scorers.filter((s) => s.side === "home");
  const awayScorers = scorers.filter((s) => s.side === "away");

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="outline" size="sm" />}>
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M12 20h9" />
          <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
        </svg>
        Sửa trận
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Sửa trận</DialogTitle>
          <DialogDescription>
            Đổi đội, ngày giờ, khu vực, tỷ số và danh sách bàn thắng.
          </DialogDescription>
        </DialogHeader>

        <form action={formAction} className="flex flex-col gap-4">
          <input type="hidden" name="matchId" value={match.id} />
          <input type="hidden" name="homeParticipantId" value={homeId} />
          <input type="hidden" name="awayParticipantId" value={awayId} />
          {/* Hidden inputs cho scorers: 3 mảng song song (scorerKey/assistKey/side). */}
          {scorers.map((s, i) => (
            <div key={i}>
              <input type="hidden" name="scorerKey" value={s.scorerKey} />
              <input type="hidden" name="assistKey" value={s.assistKey} />
              <input type="hidden" name="side" value={s.side} />
            </div>
          ))}

          {/* 2 đội (Select). Disable option đã chọn ở select kia (không cho A vs A). */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="match-home">Đội nhà</Label>
              <Select value={homeId} onValueChange={(v) => setHomeId(String(v))}>
                <SelectTrigger id="match-home" className="h-11 w-full">
                  <SelectValue placeholder={match.sideAName ?? "Chọn đội"}>
                    {homeLabel}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {participants.map((p) => (
                    <SelectItem
                      key={p.id}
                      value={p.id}
                      disabled={p.id === awayId}
                    >
                      {p.displayName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {state.fieldErrors?.homeParticipantId ? (
                <p className="text-sm text-destructive">
                  {state.fieldErrors.homeParticipantId}
                </p>
              ) : null}
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="match-away">Đội khách</Label>
              <Select
                value={awayId}
                onValueChange={(v) => setAwayId(String(v))}
              >
                <SelectTrigger id="match-away" className="h-11 w-full">
                  <SelectValue placeholder={match.sideBName ?? "Chọn đội"}>
                    {awayLabel}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {participants.map((p) => (
                    <SelectItem
                      key={p.id}
                      value={p.id}
                      disabled={p.id === homeId}
                    >
                      {p.displayName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {state.fieldErrors?.awayParticipantId ? (
                <p className="text-sm text-destructive">
                  {state.fieldErrors.awayParticipantId}
                </p>
              ) : null}
            </div>
          </div>

          {/* Ngày giờ đá (datetime-local). */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="match-playtime">Ngày giờ đá</Label>
            <Input
              id="match-playtime"
              name="playTime"
              type="datetime-local"
              value={playTime}
              onChange={(e) => setPlayTime(e.target.value)}
              aria-invalid={!!state.fieldErrors?.playTime}
            />
            {state.fieldErrors?.playTime ? (
              <p className="text-sm text-destructive">
                {state.fieldErrors.playTime}
              </p>
            ) : null}
          </div>

          {/* Khu vực (text). */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="match-area">Khu vực / Sân</Label>
            <Input
              id="match-area"
              name="area"
              type="text"
              value={area}
              onChange={(e) => setArea(e.target.value)}
              maxLength={120}
              placeholder="VD: Sân Trung Tâm"
              aria-invalid={!!state.fieldErrors?.area}
            />
            {state.fieldErrors?.area ? (
              <p className="text-sm text-destructive">
                {state.fieldErrors.area}
              </p>
            ) : null}
          </div>

          {/* Tỷ số 2 bên (nullable). Label theo đội đang chọn. */}
          <div className="flex items-end justify-center gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="match-home-score" className="text-center">
                {homeLabel}
              </Label>
              <Input
                id="match-home-score"
                name="homeScore"
                type="number"
                min={0}
                max={50}
                inputMode="numeric"
                value={homeScore}
                onChange={(e) => setHomeScore(e.target.value)}
                placeholder="—"
                className="h-12 w-24 text-center text-xl font-bold"
                aria-invalid={!!state.fieldErrors?.homeScore}
              />
            </div>
            <span className="pb-3 text-xl font-bold text-ink-subtle">-</span>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="match-away-score" className="text-center">
                {awayLabel}
              </Label>
              <Input
                id="match-away-score"
                name="awayScore"
                type="number"
                min={0}
                max={50}
                inputMode="numeric"
                value={awayScore}
                onChange={(e) => setAwayScore(e.target.value)}
                placeholder="—"
                className="h-12 w-24 text-center text-xl font-bold"
                aria-invalid={!!state.fieldErrors?.awayScore}
              />
            </div>
          </div>
          {state.fieldErrors?.homeScore ? (
            <p className="text-sm text-destructive">
              {state.fieldErrors.homeScore}
            </p>
          ) : null}
          {state.fieldErrors?.awayScore ? (
            <p className="text-sm text-destructive">
              {state.fieldErrors.awayScore}
            </p>
          ) : null}

          {/* Danh sách bàn (chỉ hiện khi có tỷ số — organizer nhập sau khi đá). */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <Label>Bàn thắng</Label>
            </div>

            {/* Bàn đội nhà. */}
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-ink-muted">
                  {homeLabel}
                </span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => addScorer("home")}
                  disabled={homePlayers.length === 0}
                >
                  + Thêm bàn
                </Button>
              </div>
              {homeScorers.length === 0 ? (
                <p className="text-xs text-ink-subtle">
                  {homePlayers.length === 0
                    ? "Chưa có cầu thủ — thêm cầu thủ ở tab Đội."
                    : "Chưa có bàn."}
                </p>
              ) : (
                <ul className="flex flex-col gap-1.5">
                  {homeScorers.map((row) =>
                    renderScorerRow(row, scorers.indexOf(row)),
                  )}
                </ul>
              )}
            </div>

            {/* Bàn đội khách. */}
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-ink-muted">
                  {awayLabel}
                </span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => addScorer("away")}
                  disabled={awayPlayers.length === 0}
                >
                  + Thêm bàn
                </Button>
              </div>
              {awayScorers.length === 0 ? (
                <p className="text-xs text-ink-subtle">
                  {awayPlayers.length === 0
                    ? "Chưa có cầu thủ — thêm cầu thủ ở tab Đội."
                    : "Chưa có bàn."}
                </p>
              ) : (
                <ul className="flex flex-col gap-1.5">
                  {awayScorers.map((row) =>
                    renderScorerRow(row, scorers.indexOf(row)),
                  )}
                </ul>
              )}
            </div>

            {state.fieldErrors?.scorers ? (
              <p className="text-sm text-destructive">
                {state.fieldErrors.scorers}
              </p>
            ) : null}
          </div>

          {state.error ? (
            <p className="text-sm text-destructive">{state.error}</p>
          ) : null}

          <Button
            type="submit"
            disabled={pending}
            className="h-11 w-full text-base"
          >
            {pending ? "Đang lưu..." : isCompleted ? "Lưu thay đổi" : "Lưu trận"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
