"use client";

import { useRouter, useSearchParams } from "next/navigation";
import {
  fieldTypeLabels,
  matchTypeLabels,
  skillTierLabels,
  timeSlotLabels,
} from "../labels";

const selectClass =
  "rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm text-gray-800 outline-none focus:border-green-600";

export function MatchFilters() {
  const router = useRouter();
  const searchParams = useSearchParams();

  function setParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    router.push(`/matches?${params.toString()}`);
  }

  return (
    <div className="flex flex-wrap gap-2">
      <select
        aria-label="Loại kèo"
        className={selectClass}
        value={searchParams.get("matchType") ?? ""}
        onChange={(e) => setParam("matchType", e.target.value)}
      >
        <option value="">Mọi loại kèo</option>
        {Object.entries(matchTypeLabels).map(([value, label]) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </select>

      <select
        aria-label="Loại sân"
        className={selectClass}
        value={searchParams.get("fieldType") ?? ""}
        onChange={(e) => setParam("fieldType", e.target.value)}
      >
        <option value="">Mọi loại sân</option>
        {Object.entries(fieldTypeLabels).map(([value, label]) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </select>

      <select
        aria-label="Trình độ"
        className={selectClass}
        value={searchParams.get("skillTier") ?? ""}
        onChange={(e) => setParam("skillTier", e.target.value)}
      >
        <option value="">Mọi trình độ</option>
        {Object.entries(skillTierLabels).map(([value, label]) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </select>

      <select
        aria-label="Khung giờ"
        className={selectClass}
        value={searchParams.get("timeSlot") ?? ""}
        onChange={(e) => setParam("timeSlot", e.target.value)}
      >
        <option value="">Mọi khung giờ</option>
        {Object.entries(timeSlotLabels).map(([value, label]) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </select>
    </div>
  );
}
