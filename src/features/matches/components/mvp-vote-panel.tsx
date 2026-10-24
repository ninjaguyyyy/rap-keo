"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { submitMvpVote, closeMvpVote } from "../mvp-vote-actions";
import type { CloseMvpVoteState, SubmitMvpVoteState } from "../mvp-vote-schemas";

type Candidate = {
  userId: string;
  name: string;
};

type VoteCount = {
  candidateUserId: string;
  count: number;
};

const initialSubmitState: SubmitMvpVoteState = {};
const initialCloseState: CloseMvpVoteState = {};

const timeFormatter = new Intl.DateTimeFormat("vi-VN", {
  day: "2-digit",
  month: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Asia/Ho_Chi_Minh",
});

export function MvpVotePanel({
  matchId,
  candidates,
  initialCandidateUserId,
  voteCounts,
  isClosed,
  expiresAt,
  winnerUserId,
  isOwner,
  canVoteAsLoggedMember,
  allowIdentityVoteWithoutLogin,
  initialVoterUserId,
}: {
  matchId: string;
  candidates: Candidate[];
  initialCandidateUserId: string | null;
  voteCounts: VoteCount[];
  isClosed: boolean;
  expiresAt: string;
  winnerUserId: string | null;
  isOwner: boolean;
  canVoteAsLoggedMember: boolean;
  allowIdentityVoteWithoutLogin: boolean;
  initialVoterUserId: string | null;
}) {
  const router = useRouter();
  const isIdentityVoteMode = !canVoteAsLoggedMember && allowIdentityVoteWithoutLogin;
  const [selectedCandidateId, setSelectedCandidateId] = useState<string>(
    initialCandidateUserId ?? "",
  );
  const [selectedVoterUserId, setSelectedVoterUserId] = useState<string>(
    initialVoterUserId ?? "",
  );
  const [submitState, submitAction, submitPending] = useActionState(
    submitMvpVote,
    initialSubmitState,
  );
  const [closeState, closeAction, closePending] = useActionState(
    closeMvpVote,
    initialCloseState,
  );

  useEffect(() => {
    if (submitState.ok || closeState.ok) {
      router.refresh();
    }
  }, [closeState.ok, router, submitState.ok]);

  const countsByCandidate = useMemo(
    () => new Map(voteCounts.map((vote) => [vote.candidateUserId, vote.count])),
    [voteCounts],
  );
  const hasCandidates = candidates.length > 0;
  const winnerName = candidates.find((candidate) => candidate.userId === winnerUserId)?.name ?? "—";
  const canSubmitVote =
    hasCandidates
    && Boolean(selectedCandidateId)
    && (canVoteAsLoggedMember || (isIdentityVoteMode && Boolean(selectedVoterUserId)));

  return (
    <div className="flex flex-col gap-4">
      <Card className="gap-3 p-4">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={isClosed ? "secondary" : "outline"}>
            {isClosed ? "Đã đóng vote" : "Đang mở vote"}
          </Badge>
          {!isClosed ? (
            <span className="text-xs text-ink-subtle">
              Hết hạn lúc {timeFormatter.format(new Date(expiresAt))}
            </span>
          ) : null}
        </div>

        {!isClosed ? (
          !hasCandidates ? (
            <p className="text-sm text-ink-muted">
              Chưa có danh sách cầu thủ tham gia trận để vote MVP.
            </p>
          ) : (
          canVoteAsLoggedMember || isIdentityVoteMode ? (
            <form action={submitAction} className="flex flex-col gap-3">
              <input type="hidden" name="matchId" value={matchId} />
              <input type="hidden" name="voterUserId" value={selectedVoterUserId} />
              <input type="hidden" name="candidateUserId" value={selectedCandidateId} />

              {isIdentityVoteMode ? (
                <div className="flex flex-col gap-1.5">
                  <p className="text-sm font-semibold text-ink">Bạn là ai?</p>
                  <Select
                    value={selectedVoterUserId}
                    onValueChange={(value) => setSelectedVoterUserId(String(value))}
                  >
                    <SelectTrigger className="h-10 w-full">
                      <SelectValue placeholder="Chọn tên của bạn trong đội" />
                    </SelectTrigger>
                    <SelectContent>
                      {candidates.map((candidate) => (
                        <SelectItem key={candidate.userId} value={candidate.userId}>
                          {candidate.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-ink-subtle">
                    Không cần đăng nhập. Mỗi cầu thủ trong danh sách có 1 phiếu.
                  </p>
                </div>
              ) : null}

              <div className="grid gap-2">
                {candidates.map((candidate) => {
                  const isActive = selectedCandidateId === candidate.userId;
                  return (
                    <Button
                      key={candidate.userId}
                      type="button"
                      variant="outline"
                      className={
                        `h-auto justify-between px-3 py-2 text-left transition-colors ${
                          isActive
                            ? "border-brand bg-brand-soft text-brand"
                            : "border-line bg-surface text-ink hover:bg-surface-muted"
                        }`
                      }
                      onClick={() => setSelectedCandidateId(candidate.userId)}
                    >
                      <span className="font-semibold">{candidate.name}</span>
                      {initialCandidateUserId === candidate.userId ? (
                        <Badge variant="outline">Phiếu của bạn</Badge>
                      ) : null}
                    </Button>
                  );
                })}
              </div>

              <Button type="submit" disabled={submitPending || !canSubmitVote}>
                {submitPending ? "Đang lưu..." : "Gửi vote MVP"}
              </Button>

              {submitState.ok ? (
                <p className="text-sm text-brand">
                  Đã lưu vote MVP của bạn.
                </p>
              ) : null}
              {submitState.error ? (
                <p className="text-sm text-destructive">{submitState.error}</p>
              ) : null}
            </form>
          ) : (
            <div className="flex flex-col gap-2">
              <p className="text-sm text-ink-muted">
                Bạn không có quyền gửi phiếu cho trận này.
              </p>
            </div>
          )
          )
        ) : (
          <div className="flex flex-col gap-2">
            <p className="text-sm font-semibold text-ink">
              MVP: <span className="text-brand">{winnerName}</span>
            </p>
            <ul className="flex flex-col gap-1 text-sm text-ink-muted">
              {candidates.map((candidate) => (
                <li key={candidate.userId} className="flex items-center justify-between">
                  <span>{candidate.name}</span>
                  <span className="font-semibold text-ink">
                    {countsByCandidate.get(candidate.userId) ?? 0} phiếu
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </Card>

      {!isClosed && isOwner ? (
        <form action={closeAction} className="flex flex-col gap-2">
          <input type="hidden" name="matchId" value={matchId} />
          <Button type="submit" variant="outline" disabled={closePending}>
            {closePending ? "Đang đóng vote..." : "Đóng vote ngay"}
          </Button>
          {closeState.error ? (
            <p className="text-sm text-destructive">{closeState.error}</p>
          ) : null}
        </form>
      ) : null}
    </div>
  );
}
