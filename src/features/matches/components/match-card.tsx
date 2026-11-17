// MatchCard — dispatch theo matchType.
// Tất cả loại kèo đều dùng BroadcastCard (spotlight header + hex pattern).
import type { MatchListItem } from "../queries";
import { BroadcastCard } from "./broadcast-card";

export function MatchCard({ match }: { match: MatchListItem }) {
  return <BroadcastCard match={match} />;
}
