import type { MatchListItem } from "../queries";
import {
  fieldTypeLabels,
  formatCost,
  formatPlayTime,
  matchTypeLabels,
  skillTierLabels,
} from "../labels";

// Màu badge theo loại kèo.
const matchTypeStyles: Record<string, string> = {
  FIND_OPPONENT: "bg-blue-100 text-blue-700",
  NEED_PLAYERS: "bg-amber-100 text-amber-700",
  FIELD_AVAILABLE: "bg-emerald-100 text-emerald-700",
};

export function MatchCard({ match }: { match: MatchListItem }) {
  return (
    <article className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="mb-2 flex items-center justify-between gap-2">
        <span
          className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
            matchTypeStyles[match.matchType] ?? "bg-gray-100 text-gray-700"
          }`}
        >
          {matchTypeLabels[match.matchType]}
        </span>
        <span className="text-sm font-medium text-gray-900">
          {formatPlayTime(match.playTime)}
        </span>
      </div>

      <div className="mb-2 flex flex-wrap gap-1.5 text-xs">
        <span className="rounded-md bg-gray-100 px-2 py-0.5 text-gray-700">
          {fieldTypeLabels[match.fieldType]}
        </span>
        <span className="rounded-md bg-gray-100 px-2 py-0.5 text-gray-700">
          {skillTierLabels[match.skillTier]}
        </span>
        {match.costPerSide != null ? (
          <span className="rounded-md bg-gray-100 px-2 py-0.5 text-gray-700">
            {formatCost(match.costPerSide)}/đội
          </span>
        ) : null}
      </div>

      <p className="text-sm text-gray-600">
        📍 {match.field?.name ?? match.area ?? "Chưa có sân"}
        {match.field?.address ? (
          <span className="text-gray-400"> · {match.field.address}</span>
        ) : null}
      </p>

      {match.note ? (
        <p className="mt-2 line-clamp-2 text-sm text-gray-800">{match.note}</p>
      ) : null}

      <p className="mt-3 text-xs text-gray-500">
        {match.team?.name ?? match.creator.name ?? "Người dùng ẩn danh"}
      </p>
    </article>
  );
}
