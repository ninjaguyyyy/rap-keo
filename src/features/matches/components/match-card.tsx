// MatchCard — dispatch theo matchType.
// Tất cả loại kèo đều dùng BroadcastCard (spotlight header + hex pattern).
// (DefaultMatchCard giữ lại cho backward-compat / view khác sau này.)
import type { MatchListItem } from "../queries";
import { BroadcastCard } from "./broadcast-card";

export function MatchCard({ match }: { match: MatchListItem }) {
  return <BroadcastCard match={match} />;
}
