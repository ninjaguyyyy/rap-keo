"use client";

// MyMatchFab — float button dính dưới-phải trên /matches.
// Chỉ hiện khi user có kèo OPEN (match != null). Click -> popover show tóm tắt
// trạng thái kèo ưu tiên + action (accept/reject inline / gỡ kèo) + link /my-matches.
//
// Reuse MatchStatusPanel (giống MyMatchCard) cho phần status + action.
import Link from "next/link";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import type { MyMatchItem } from "../queries";
import { areaLabels, formatPlayTimes, matchTypeLabels } from "../labels";
import { MatchStatusPanel } from "./match-status-panel";

// Icon + badge/dot trong trigger. PopoverTrigger render=<button> (đã set className
// vị trí/kích thước), children là nội dung nút. Tách ra cho gọn.
function FabInner({ match }: { match: MyMatchItem }) {
  const pendingCount = match.requests.filter(
    (r) => r.status === "PENDING",
  ).length;
  return (
    <>
      <svg
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 2" />
      </svg>
      {pendingCount > 0 ? (
        // Badge số đội hỏi (lime) — nổi bật hơn dot khi có activity.
        <span className="absolute -right-1 -top-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-accent-lime px-1 text-xs font-bold text-accent-lime-ink ring-2 ring-surface">
          {pendingCount}
        </span>
      ) : (
        // Dot trạng thái "đang hiển thị" (brand-bright pulse).
        <span className="absolute -right-0.5 -top-0.5 flex h-3.5 w-3.5">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand-bright opacity-60" />
          <span className="relative inline-flex h-3.5 w-3.5 rounded-full bg-brand-bright ring-2 ring-surface" />
        </span>
      )}
    </>
  );
}

// Header gọn của popover: loại kèo + sân + giờ đá (1-2 dòng, không tràn).
function PopoverHeader({ match }: { match: MyMatchItem }) {
  const area =
    areaLabels[match.area ?? ""] ?? match.field?.name ?? "Chưa có sân";
  return (
    <div className="min-w-0">
      <p className="text-xs font-semibold uppercase tracking-wide text-ink-subtle">
        {matchTypeLabels[match.matchType]} · {area}
      </p>
      <p className="mt-0.5 truncate text-base font-bold text-ink">
        {formatPlayTimes(match.playTimes)}
      </p>
    </div>
  );
}

export function MyMatchFab({ match }: { match: MyMatchItem | null }) {
  if (!match) return null;

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-4 z-30 mx-auto flex max-w-md justify-end px-4">
      <Popover>
        <PopoverTrigger
          render={
            <button
              type="button"
              aria-label="Trạng thái kèo của tôi"
              className="pointer-events-auto relative grid h-14 w-14 place-items-center rounded-full bg-brand text-white shadow-lg ring-4 ring-surface/80 transition-transform hover:scale-105 active:scale-95"
            />
          }
        >
          <FabInner match={match} />
        </PopoverTrigger>
        <PopoverContent
          side="top"
          align="end"
          sideOffset={8}
          className="w-[min(20rem,calc(100vw-2rem))] p-3"
        >
          <PopoverHeader match={match} />
          <div className="mt-2">
            <MatchStatusPanel match={match} />
          </div>
          <Link
            href="/my-matches"
            className="mt-2 block text-center text-xs font-semibold text-brand hover:text-brand-hover hover:underline"
          >
            Xem tất cả trong “Kèo của tôi” ›
          </Link>
        </PopoverContent>
      </Popover>
    </div>
  );
}
