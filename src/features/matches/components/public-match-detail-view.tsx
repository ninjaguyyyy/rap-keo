import Image from "next/image";
import Link from "next/link";
import { ListIcon } from "lucide-react";
import { ScrollToTopOnMount } from "@/components/layout/scroll-to-top-on-mount";
import { MockMatchFlowActions } from "@/features/matches/components/mock-match-flow-actions";

type PublicMatchDetailViewProps = Readonly<{
  matchId: string;
  homeTeam: string;
  awayTeam: string;
  kickoff: string;
  dayLabel?: string;
  fieldTypeLabel: string;
  district: string;
  skillLabel: string;
  phone: string;
  fbLink: string;
  backHref?: string;
}>;

export function PublicMatchDetailView({
  matchId,
  homeTeam,
  awayTeam,
  kickoff,
  dayLabel = "",
  fieldTypeLabel,
  district,
  skillLabel,
  phone,
  fbLink,
  backHref = "/matches",
}: PublicMatchDetailViewProps) {
  return (
    <div className="min-h-dvh bg-surface-muted px-2 pb-3 pt-8">
      <ScrollToTopOnMount />
      <div className="w-full rounded-[1.75rem] bg-surface ring-1 ring-line/70">
        <section className="relative overflow-hidden rounded-t-[1.75rem] px-4 pb-3 pt-3 text-white">
          <div className="absolute inset-0 grid grid-cols-2">
            <div className="bg-[#b90206] bg-[url('/scoreboard-header-light.svg')] bg-cover bg-center opacity-100" />
            <div className="bg-[#051489] bg-[url('/scoreboard-header-light.svg')] bg-cover bg-center opacity-100" />
          </div>
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_8%_12%,rgba(255,255,255,0.22),transparent_30%),radial-gradient(circle_at_95%_92%,rgba(255,255,255,0.14),transparent_38%)]" />

          <div className="relative grid grid-cols-[1fr_auto_1fr] items-start gap-2">
            <TeamBadge name={homeTeam} align="start" />
            <div className="justify-self-center self-center rounded-2xl bg-surface px-4 py-2 text-center shadow-md">
              <span className="font-heading text-[32px] leading-none font-bold tracking-tight text-brand">
                {kickoff}
              </span>
            </div>
            <TeamBadge name={awayTeam} align="end" />
          </div>
        </section>

        <section className="space-y-3 p-4">
          <MockMatchFlowActions matchId={matchId} phone={phone} fbLink={fbLink} />

          <div className="space-y-1.5 px-1 text-center text-ink-muted">
            <p className="text-[12px] font-normal tracking-[0.56px]">
              <span>Phủi League</span>
              {dayLabel ? <span className="mx-2.5">•</span> : null}
              {dayLabel ? <span>{dayLabel}</span> : null}
            </p>
            <p className="text-[12px]">
              <span>{fieldTypeLabel}</span>
              <span className="mx-2">•</span>
              <span>{district}</span>
              <span className="mx-2">•</span>
              <span>{skillLabel}</span>
            </p>
          </div>
        </section>
      </div>

      <Link
        href={backHref}
        className="mt-3 inline-flex h-8 w-full items-center justify-center gap-1.5 rounded-full bg-[#ebe5eb] text-xs font-medium text-brand"
      >
        <ListIcon className="size-4" />
        Về danh sách kèo
      </Link>
    </div>
  );
}

function TeamBadge({ name, align }: Readonly<{ name: string; align: "start" | "end" }>) {
  return (
    <div className={align === "end" ? "text-right" : "text-left"}>
      <div className="mx-auto mb-1 flex h-14 w-14 items-center justify-center rounded-full border border-white/65 bg-white/18 backdrop-blur-sm">
        <Image
          src="/logo-with-background.png"
          alt={`Logo ${name}`}
          width={44}
          height={44}
          className="h-11 w-11 rounded-full object-cover"
        />
      </div>
      <p className="w-full truncate text-center text-[14px] leading-tight font-bold text-white">{name}</p>
    </div>
  );
}
