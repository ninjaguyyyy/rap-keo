"use client";

import { useRouter, useSearchParams } from "next/navigation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
  fieldTypeLabels,
  matchTypeLabels,
  skillTierLabels,
  timeSlotLabels,
} from "../labels";
import type { MatchSkillTier } from "@/generated/prisma/enums";

// TimeSlot = keyof TIME_SLOT_RANGES — nhưng queries.ts là server-only, nên định
// nghĩa type client-side khớp tuple (value là key cho URL).
type TimeSlot =
  | "0500" | "0530" | "0600" | "0630"
  | "1630" | "1730" | "1830" | "1930" | "2030" | "2130";

const ALL = "all";

function FilterSelect({
  paramKey,
  allLabel,
  options,
  value,
  onChange,
}: {
  paramKey: string;
  allLabel: string;
  options: Record<string, string>;
  value: string;
  onChange: (key: string, value: string) => void;
}) {
  return (
    <Select
      value={value || ALL}
      onValueChange={(v) => onChange(paramKey, v === ALL ? "" : String(v))}
    >
      <SelectTrigger className="h-10 w-auto">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={ALL}>{allLabel}</SelectItem>
        {Object.entries(options).map(([val, label]) => (
          <SelectItem key={val} value={val}>
            {label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

// Chip toggle group (multi-select). Mỗi chip là 1 nút bấm; bật/tắt thêm value
// vào URL param (lặp lại cho nhiều giá trị). Dùng chung cho trình độ + khung giờ.
function ChipGroup({
  options,
  selected,
  onToggle,
  ariaLabel,
}: {
  options: [string, string][];
  selected: string[];
  onToggle: (value: string) => void;
  ariaLabel: string;
}) {
  return (
    <div className="flex flex-wrap gap-1.5" role="group" aria-label={ariaLabel}>
      {options.map(([val, label]) => {
        const active = selected.includes(val);
        return (
          <button
            key={val}
            type="button"
            onClick={() => onToggle(val)}
            aria-pressed={active}
            className={cn(
              "inline-flex h-8 items-center rounded-full border px-3 text-xs font-semibold transition-colors",
              active
                ? "border-brand bg-brand text-white"
                : "border-line bg-surface text-ink-muted hover:border-brand hover:text-brand",
            )}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}

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

  // Toggle 1 giá trị trong URL param (multi-value), dùng cho skillTier + timeSlot.
  function toggleMulti(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    const current = params.getAll(key);
    const next = current.includes(value)
      ? current.filter((v) => v !== value)
      : [...current, value];
    params.delete(key);
    next.forEach((v) => params.append(key, v));
    router.push(`/matches?${params.toString()}`);
  }

  const selectedSkills = searchParams.getAll("skillTier") as MatchSkillTier[];
  const selectedSlots = searchParams.getAll("timeSlot") as TimeSlot[];

  const skillOptions = Object.entries(skillTierLabels) as [MatchSkillTier, string][];
  const slotOptions = Object.entries(timeSlotLabels) as [TimeSlot, string][];

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-2">
        <FilterSelect
          paramKey="matchType"
          allLabel="Mọi loại kèo"
          options={matchTypeLabels}
          value={searchParams.get("matchType") ?? ""}
          onChange={setParam}
        />
        <FilterSelect
          paramKey="fieldType"
          allLabel="Mọi loại sân"
          options={fieldTypeLabels}
          value={searchParams.get("fieldType") ?? ""}
          onChange={setParam}
        />
      </div>
      <ChipGroup
        options={slotOptions}
        selected={selectedSlots}
        onToggle={(v) => toggleMulti("timeSlot", v)}
        ariaLabel="Lọc theo khung giờ"
      />
      <ChipGroup
        options={skillOptions}
        selected={selectedSkills}
        onToggle={(v) => toggleMulti("skillTier", v)}
        ariaLabel="Lọc theo trình độ"
      />
    </div>
  );
}
