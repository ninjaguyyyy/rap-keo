import { notFound } from "next/navigation";
import { findMockOpenMatch, openMatchesByDate } from "@/features/matches/mock-open-data";
import { PublicMatchDetailView } from "@/features/matches/components/public-match-detail-view";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function MockMatchDetailPage({ params }: Readonly<PageProps>) {
  const { id } = await params;
  const match = findMockOpenMatch(id);
  if (!match) notFound();

  const dayBlock = openMatchesByDate.find((block) => block.matches.some((item) => item.id === match.id));
  const dayLabel = dayBlock?.date ?? "";

  return (
    <PublicMatchDetailView
      matchId={match.id}
      homeTeam={match.homeTeam}
      awayTeam={match.awayTeam ?? "Đội của bạn"}
      kickoff={match.kickoff}
      dayLabel={dayLabel}
      fieldTypeLabel={match.fieldType}
      district={match.district}
      skillLabel={match.skillLabel}
      phone={match.phone}
      fbLink={match.fbLink}
      backHref="/"
    />
  );
}
