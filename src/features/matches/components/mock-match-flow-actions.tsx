"use client";

import { useState, useTransition } from "react";
import { ExternalLinkIcon, PhoneIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { MOCK_REPORTED_MATCH_IDS_KEY } from "@/features/matches/mock-open-data";
import { submitPublicMatchFlowAction } from "@/features/matches/public-match-flow-actions";

type MatchFlowState = "OPEN" | "CONTACTED" | "CONFIRMED" | "REPORTED";

type MockMatchFlowActionsProps = Readonly<{
  matchId: string;
  phone: string;
  fbLink: string;
}>;

export function MockMatchFlowActions({ matchId, phone, fbLink }: MockMatchFlowActionsProps) {
  const hasPhone = Boolean(phone.trim());
  const hasFbLink = Boolean(fbLink.trim());
  const [flowState, setFlowState] = useState<MatchFlowState>("OPEN");
  const [feedback, setFeedback] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const hasContacted = flowState !== "OPEN";
  const isFinal = flowState === "CONFIRMED" || flowState === "REPORTED";

  function handleContactClick() {
    if (flowState === "OPEN") {
      setFlowState("CONTACTED");
    }
  }

  function persistReportedMatchId() {
    try {
      const raw = window.localStorage.getItem(MOCK_REPORTED_MATCH_IDS_KEY);
      const parsed = raw ? (JSON.parse(raw) as unknown) : [];
      const current = Array.isArray(parsed)
        ? parsed.filter((value): value is string => typeof value === "string")
        : [];
      if (!current.includes(matchId)) {
        window.localStorage.setItem(
          MOCK_REPORTED_MATCH_IDS_KEY,
          JSON.stringify([...current, matchId]),
        );
      }
    } catch {
      // no-op for mock flow persistence
    }
  }

  function handleConfirm() {
    if (!hasContacted || isFinal || pending) return;
    setFeedback(null);
    startTransition(async () => {
      const result = await submitPublicMatchFlowAction(matchId, "CONFIRM");
      if (!result.ok) {
        setFeedback(result.error ?? "Không xử lý được thao tác. Vui lòng thử lại.");
        return;
      }
      setFlowState("CONFIRMED");
      setFeedback(result.message ?? "Đã xử lý yêu cầu.");
    });
  }

  function handleReport() {
    if (!hasContacted || isFinal || pending) return;
    setFeedback(null);
    startTransition(async () => {
      const result = await submitPublicMatchFlowAction(matchId, "REPORT");
      if (!result.ok) {
        setFeedback(result.error ?? "Không xử lý được thao tác. Vui lòng thử lại.");
        return;
      }
      persistReportedMatchId();
      setFlowState("REPORTED");
      setFeedback(result.message ?? "Đã xử lý yêu cầu.");
    });
  }

  return (
    <div className="space-y-3">
      {hasFbLink ? (
        <a
          href={fbLink}
          target="_blank"
          rel="noreferrer"
          className="flex h-8 w-full items-center justify-center gap-2 rounded-full border border-brand text-xs font-medium text-brand"
        >
          <ExternalLinkIcon className="size-3.5" />
          <span>Link bài đăng FB</span>
          <span className="inline-flex items-center justify-center rounded-full bg-brand px-1.5 py-0.75 text-[9px] font-bold leading-none text-white">
            Open
          </span>
        </a>
      ) : null}

      {hasPhone ? (
        <a
          href={`tel:${phone}`}
          onClick={handleContactClick}
          className="flex h-8 w-full items-center justify-center gap-2 rounded-full border border-brand text-xs font-medium text-brand"
        >
          <PhoneIcon className="size-3.5" />
          <span>Gọi trực tiếp</span>
        </a>
      ) : (
        <a
          href={fbLink}
          target="_blank"
          rel="noreferrer"
          onClick={handleContactClick}
          className="flex h-8 w-full items-center justify-center gap-2 rounded-full border border-brand text-xs font-medium text-brand"
        >
          <ExternalLinkIcon className="size-3.5" />
          <span>Inbox qua Facebook</span>
        </a>
      )}

      <div className="grid grid-cols-2 gap-3 pt-1">
        <button
          type="button"
          onClick={handleConfirm}
          disabled={!hasContacted || isFinal || pending}
          className={cn(
            "inline-flex h-9 w-full items-center justify-center rounded-full px-4 text-center text-[13px] leading-none font-medium transition-colors",
            !hasContacted || isFinal || pending
              ? "cursor-not-allowed bg-brand/35 text-white/90"
              : "bg-brand text-white hover:bg-brand-hover",
          )}
        >
          Xác nhận đã chốt
        </button>

        <button
          type="button"
          onClick={handleReport}
          disabled={!hasContacted || isFinal || pending}
          className={cn(
            "inline-flex h-9 w-full items-center justify-center rounded-full border bg-surface px-4 text-center text-[13px] leading-none font-medium transition-colors",
            !hasContacted || isFinal || pending
              ? "cursor-not-allowed border-brand/40 text-brand/55"
              : "border-brand text-brand hover:bg-brand-soft/45",
          )}
        >
          Report đội đã có kèo
        </button>
      </div>

      {feedback ? (
        <p className="text-center text-[11px] font-medium text-ink-muted">{feedback}</p>
      ) : null}
    </div>
  );
}
