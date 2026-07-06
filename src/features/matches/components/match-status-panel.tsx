"use client";

// MatchStatusPanel — phần status rows + action của một kèo do user tạo.
// Dùng chung giữa MyMatchCard (trang /my-matches) và MyMatchFab popover (/matches)
// để không lặp logic accept/reject + 3 nhánh trạng thái.
//
// Nhánh hiển thị theo trạng thái nghiệp vụ:
//  - OPEN + 0 PENDING      → "Đang hiển thị trên bảng kèo" (dot brand-bright pulse)
//  - có PENDING             → list request inline (accept/reject)
//  - MATCHED/CONFIRMED      → "Đã chốt với <team>" (chỉ khi không còn PENDING)
//  - CANCELLED/EXPIRED      → chip muted
import { useEffect, useTransition, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { MyMatchItem } from "../queries";
import type { SkillTier } from "@/generated/prisma/enums";
import {
  acceptMatchRequest,
  rejectMatchRequest,
  cancelMyMatch,
} from "../actions";

const TEAM_SKILL_LABELS: Record<SkillTier, string> = {
  VERY_WEAK: "Siêu Yếu",
  WEAK: "Yếu",
  BELOW_AVERAGE: "Trung Bình Yếu",
  AVERAGE: "Trung Bình",
  ABOVE_AVERAGE: "Trung Bình Khá",
  GOOD: "Khá",
  STRONG: "Mạnh",
};

type RequestRowProps = {
  request: MyMatchItem["requests"][number];
  disabledAll: boolean;
};

// 1 dòng yêu cầu ghép kèo. PENDING: 2 nút accept/reject. ACCEPTED: nhãn đã chốt.
// REJECTED/CANCELLED: ẩn (chỉ hiện PENDING + ACCEPTED cho gọn).
function RequestRow({ request, disabledAll }: RequestRowProps) {
  const [pending, startTransition] = useTransition();
  const disabled = disabledAll || pending;
  const name =
    request.requesterTeam?.name ?? request.requester.name ?? "Người chơi lẻ";
  const skill = request.requesterTeam?.skillTier
    ? TEAM_SKILL_LABELS[request.requesterTeam.skillTier]
    : null;

  if (request.status === "ACCEPTED") {
    return (
      <div className="rounded-xl border border-brand/30 bg-brand-soft p-3">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-bold text-brand">{name}</p>
          <Badge className="bg-brand-soft text-brand">Đã chốt</Badge>
        </div>
      </div>
    );
  }
  if (request.status !== "PENDING") return null;

  return (
    <div className="rounded-xl border border-line bg-surface-muted p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-bold text-ink">{name}</p>
          {request.message ? (
            <p className="mt-0.5 line-clamp-2 text-xs text-ink-muted">
              “{request.message}”
            </p>
          ) : null}
        </div>
        {skill ? (
          <Badge variant="secondary" className="shrink-0">
            {skill}
          </Badge>
        ) : null}
      </div>
      <div className="mt-2 flex gap-2">
        <Button
          variant="default"
          size="sm"
          disabled={disabled}
          onClick={() =>
            startTransition(async () => {
              await acceptMatchRequest(request.id);
            })
          }
          className="flex-1"
        >
          Chấp nhận
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={disabled}
          onClick={() =>
            startTransition(async () => {
              await rejectMatchRequest(request.id);
            })
          }
        >
          Từ chối
        </Button>
      </div>
    </div>
  );
}

// "x phút trước" client-side. Mount mới tính now => tránh hydration mismatch.
/* eslint-disable react-hooks/set-state-in-effect */
function TimeAgo({ date }: { date: Date }) {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    setNow(Date.now());
    const t = setInterval(() => setNow(Date.now()), 60000);
    return () => clearInterval(t);
  }, []);
  if (now == null) return null;
  const diff = now - date.getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return <>vừa xong</>;
  if (m < 60) return <>{m} phút trước</>;
  const h = Math.floor(m / 60);
  if (h < 24) return <>{h} giờ trước</>;
  const d = Math.floor(h / 24);
  return <>{d} ngày trước</>;
}

export function MatchStatusPanel({ match }: { match: MyMatchItem }) {
  const [pendingCancel, startCancel] = useTransition();

  const isLive = match.status === "MATCHED" || match.status === "CONFIRMED";
  const pendingRequests = match.requests.filter((r) => r.status === "PENDING");
  const acceptedRequest = match.requests.find((r) => r.status === "ACCEPTED");
  const isOpen = match.status === "OPEN";
  const hasRequests = pendingRequests.length > 0;
  const isCancelledOrExpired =
    match.status === "CANCELLED" || match.status === "EXPIRED";

  function handleCancel() {
    if (!window.confirm("Gỡ kèo này khỏi bảng? Các đội đang hỏi sẽ bị từ chối.")) {
      return;
    }
    startCancel(async () => {
      await cancelMyMatch(match.id);
    });
  }

  return (
    <div className="flex flex-col gap-2">
      {isOpen && !hasRequests && (
        // Đang hiển thị trên bảng — dot brand-bright animate-ping.
        <div className="flex items-center gap-2 rounded-lg bg-brand-soft px-3 py-2">
          <span className="relative flex h-2.5 w-2.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand-bright opacity-60" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-brand-bright" />
          </span>
          <span className="text-sm font-semibold text-brand">
            Đang hiển thị trên bảng kèo
          </span>
          <span className="ml-auto text-xs text-ink-muted">
            <TimeAgo date={match.createdAt} />
          </span>
        </div>
      )}

      {hasRequests && (
        // Có đội hỏi cáp — list inline các PENDING (+ ACCEPTED nếu có).
        <div className="flex flex-col gap-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-ink-subtle">
            Yêu cầu cáp kèo
          </p>
          {acceptedRequest ? (
            <RequestRow request={acceptedRequest} disabledAll={false} />
          ) : null}
          {pendingRequests.map((r) => (
            <RequestRow key={r.id} request={r} disabledAll={pendingCancel} />
          ))}
        </div>
      )}

      {isLive && acceptedRequest && !hasRequests && (
        // Đã chốt (MATCHED/CONFIRMED, request đã accept, không còn PENDING).
        <div className="flex items-center gap-2 rounded-lg bg-brand-soft px-3 py-2">
          <svg
            className="text-brand"
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <polyline points="20 6 9 17 4 12" />
          </svg>
          <span className="text-sm font-bold text-brand">
            Đã chốt với{" "}
            {acceptedRequest.requesterTeam?.name ??
              acceptedRequest.requester.name ??
              "đối thủ"}
          </span>
        </div>
      )}

      {isCancelledOrExpired && (
        <div className="rounded-lg bg-surface-muted px-3 py-2">
          <span className="text-sm font-semibold text-ink-muted">
            {match.status === "CANCELLED" ? "Đã gỡ kèo" : "Kèo đã hết hạn"}
          </span>
        </div>
      )}

      {/* Action line: chỉ OPEN mới cho gỡ. */}
      {isOpen && (
        <div className="flex items-center justify-end gap-1.5 border-t border-line pt-2">
          <Button
            variant="outline"
            size="sm"
            disabled={pendingCancel}
            onClick={handleCancel}
          >
            Gỡ kèo
          </Button>
        </div>
      )}
    </div>
  );
}
