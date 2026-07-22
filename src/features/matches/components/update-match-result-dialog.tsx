"use client";

// Dialog cập nhật kết quả trận (popup trên match detail). Owner + thành viên đội
// được cập nhật. Nhập tỷ số 2 bên + danh sách bàn (mỗi bàn: scorer + kiến tạo,
// chọn từ thành viên đội). Lưu -> set status COMPLETED + ghi PlayerStat.
// Mirror EditTeamDialog (Dialog render prop) + useActionState.
import { useActionState, useEffect, useState } from "react";
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
import { updateMatchResult } from "../actions";
import type { UpdateMatchResultState } from "../schemas";
import type { MatchDetail } from "../queries";
import type { TeamMemberItem } from "@/features/teams/queries";

const initialState: UpdateMatchResultState = {};

type ScorerRow = { scorerId: string; assistId: string };

// Reconstruct scorer rows từ playerStats hiện tại (prefill edit mode):
// Không prefill scorer — logic reconstruct cặp scorer-assist không chính xác từ
// aggregate (DB chỉ lưu goals/assists count, không lưu cặp). User nhập lại khi sửa.
function initialScorers(): ScorerRow[] {
  return [];
}

export function UpdateMatchResultDialog({
  match,
  members,
}: {
  match: MatchDetail;
  members: TeamMemberItem[];
}) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(
    updateMatchResult,
    initialState,
  );
  const [homeScore, setHomeScore] = useState<string>(
    match.homeScore?.toString() ?? "0",
  );
  const [awayScore, setAwayScore] = useState<string>(
    match.awayScore?.toString() ?? "0",
  );
  const [scorers, setScorers] = useState<ScorerRow[]>(() => initialScorers());

  // Lưu xong -> đóng dialog. revalidatePath làm mới hero + tabs.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (state.ok) {
      setOpen(false);
    }
  }, [state]);
  /* eslint-enable react-hooks/set-state-in-effect */

  function addScorer() {
    setScorers((prev) => [...prev, { scorerId: "", assistId: "" }]);
  }
  function removeScorer(idx: number) {
    setScorers((prev) => prev.filter((_, i) => i !== idx));
  }
  function setScorerField(idx: number, field: "scorerId" | "assistId", value: string) {
    setScorers((prev) =>
      prev.map((row, i) => (i === idx ? { ...row, [field]: value } : row)),
    );
  }

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
        Cập nhật kết quả
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Cập nhật kết quả trận</DialogTitle>
          <DialogDescription>
            Nhập tỷ số và danh sách bàn thắng. Lưu sẽ đánh dấu trận đã đá.
          </DialogDescription>
        </DialogHeader>

        <form action={formAction} className="flex flex-col gap-4">
          <input type="hidden" name="matchId" value={match.id} />

          {/* Tỷ số 2 bên. */}
          <div className="flex items-end justify-center gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="home-score" className="text-center">Đội nhà</Label>
              <Input
                id="home-score"
                name="homeScore"
                type="number"
                min={0}
                max={50}
                inputMode="numeric"
                value={homeScore}
                onChange={(e) => setHomeScore(e.target.value)}
                className="h-12 w-20 text-center text-xl font-bold"
                aria-invalid={!!state.fieldErrors?.homeScore}
              />
            </div>
            <span className="pb-3 text-xl font-bold text-ink-subtle">-</span>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="away-score" className="text-center">Đội khách</Label>
              <Input
                id="away-score"
                name="awayScore"
                type="number"
                min={0}
                max={50}
                inputMode="numeric"
                value={awayScore}
                onChange={(e) => setAwayScore(e.target.value)}
                className="h-12 w-20 text-center text-xl font-bold"
                aria-invalid={!!state.fieldErrors?.awayScore}
              />
            </div>
          </div>
          {state.fieldErrors?.homeScore ? (
            <p className="text-sm text-destructive">{state.fieldErrors.homeScore}</p>
          ) : null}
          {state.fieldErrors?.awayScore ? (
            <p className="text-sm text-destructive">{state.fieldErrors.awayScore}</p>
          ) : null}

          {/* Danh sách bàn (dynamic rows). */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <Label>Bàn thắng đội nhà</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addScorer}
                disabled={members.length === 0}
              >
                + Thêm bàn
              </Button>
            </div>

            {members.length === 0 ? (
              <p className="text-xs text-ink-subtle">
                Đội chưa có thành viên để chọn người ghi bàn.
              </p>
            ) : null}

            {scorers.length === 0 && members.length > 0 ? (
              <p className="text-xs text-ink-subtle">
                Bấm “Thêm bàn” để ghi người ghi bàn / kiến tạo.
              </p>
            ) : null}

            <ul className="flex flex-col gap-2">
              {scorers.map((row, idx) => (
                <li key={idx} className="flex items-center gap-2">
                  {/* Scorer + assist hidden inputs (submit mảng song song). */}
                  <input type="hidden" name="scorerId" value={row.scorerId} />
                  <input type="hidden" name="assistId" value={row.assistId} />

                  <div className="flex flex-1 flex-col gap-1">
                    <Select
                      value={row.scorerId}
                      onValueChange={(v) => setScorerField(idx, "scorerId", String(v))}
                    >
                      <SelectTrigger className="h-10 w-full" aria-label="Người ghi bàn">
                        <SelectValue placeholder="Ghi bàn" />
                      </SelectTrigger>
                      <SelectContent>
                        {members.map((m) => (
                          <SelectItem key={m.userId} value={m.userId}>
                            {m.user.name ?? m.user.phone ?? "—"}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex flex-1 flex-col gap-1">
                    <Select
                      value={row.assistId}
                      onValueChange={(v) => setScorerField(idx, "assistId", String(v))}
                    >
                      <SelectTrigger className="h-10 w-full" aria-label="Người kiến tạo">
                        <SelectValue placeholder="Kiến tạo (tùy chọn)" />
                      </SelectTrigger>
                      <SelectContent>
                        {members.map((m) => (
                          <SelectItem key={m.userId} value={m.userId}>
                            {m.user.name ?? m.user.phone ?? "—"}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-10 w-10 shrink-0 text-ink-subtle hover:text-destructive"
                    onClick={() => removeScorer(idx)}
                    aria-label="Xóa bàn"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M3 6h18" />
                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                    </svg>
                  </Button>
                </li>
              ))}
            </ul>
            {state.fieldErrors?.scorers ? (
              <p className="text-sm text-destructive">{state.fieldErrors.scorers}</p>
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
            {pending ? "Đang lưu..." : "Lưu kết quả"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
