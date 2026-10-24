import { redirect } from "next/navigation";

export default async function LegacyMatchMvpVotePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const target = `/matches/${id}?tab=mvp`;
  redirect(target);
}
