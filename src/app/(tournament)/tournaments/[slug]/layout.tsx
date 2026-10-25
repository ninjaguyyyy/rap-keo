import type { ReactNode } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { getTournamentBySlug } from "@/features/tournaments/queries";
import {
  fieldTypeLabels,
  tournamentFormatLabels,
  tournamentStatusBadge,
  tournamentStatusLabels,
} from "@/features/tournaments/labels";

// Layout riêng cho trang chi tiết giải /tournaments/[slug] (route group (tournament)
// không ảnh hưởng URL). Bỏ hero banner của (main), tự render header = banner giải
// + tên + status badge + format/fieldType. Mirror (team)/teams/[id]/layout.tsx.
//
// getTournamentBySlug đã bọc cache() -> layout & page gọi chung 1 query DB.
// Auth + quyền: APPROVED/COMPLETED/CANCELLED public; DRAFT/PENDING/REJECTED chỉ
// organizer + ADMIN — ngoài ra notFound().
export default async function TournamentLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const viewer = await getCurrentUser();
  const tournament = await getTournamentBySlug(slug, viewer?.id);
  if (!tournament) {
    notFound();
  }

  return (
    <div className="min-h-dvh bg-surface-muted">
      {/* Header = banner full-bleed + scrim + hex overlay + tên + status. */}
      <header className="relative w-full overflow-hidden">
        {/* Banner giải. bannerUrl = ảnh upload (Supabase), fallback gradient brand-spotlight. */}
        {tournament.bannerUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={tournament.bannerUrl}
            alt=""
            className="absolute inset-0 h-full w-full object-cover"
          />
        ) : (
          <div className="absolute inset-0 bg-brand-spotlight" />
        )}
        {/* Scrim gradient tím spotlight (tối dần xuống đáy) để chữ trắng đọc rõ. */}
        <div className="absolute inset-0 bg-gradient-to-b from-brand-spotlight/45 via-brand-spotlight/75 to-brand-spotlight/95" />
        {/* Họa tiết lục giác mờ. */}
        <div className="hex-bg absolute inset-0" aria-hidden="true" />

        {/* Nội dung header (relative nổi trên banner/scrim), giới hạn max-w-md. */}
        <div className="relative mx-auto w-full max-w-md">
          {/* Nút back tròn góc trên-trái. */}
          <div className="px-4 pt-4">
            <Link
              href="/tournaments"
              aria-label="Quay lại danh sách giải"
              className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/15 text-white backdrop-blur transition-colors hover:bg-white/25"
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M15 18l-6-6 6-6" />
              </svg>
            </Link>
          </div>

          {/* Tên + status badge + metadata. */}
          <div className="flex flex-col items-center gap-2 px-4 pb-10 pt-2 text-center">
            <span
              className={
                "rounded-full px-2.5 py-0.5 text-xs font-bold " +
                tournamentStatusBadge[tournament.status]
              }
            >
              {tournamentStatusLabels[tournament.status]}
            </span>
            <h1 className="text-2xl font-extrabold tracking-tight text-white drop-shadow">
              {tournament.name}
            </h1>
            <div className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-sm font-medium text-white/90">
              <span>{tournamentFormatLabels[tournament.format]}</span>
              <span aria-hidden="true" className="text-white/50">·</span>
              <span>{fieldTypeLabels[tournament.fieldType]}</span>
            </div>
          </div>
        </div>
      </header>

      {/* Nội dung page: card nhô lên đè header (-mt-4 rounded-t-3xl). */}
      <main className="relative z-10 -mt-4 rounded-t-3xl bg-surface-muted px-4 py-4">
        <div className="mx-auto w-full max-w-md">{children}</div>
      </main>
    </div>
  );
}
