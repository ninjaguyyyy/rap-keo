"use client";

import { useRouter, useSearchParams } from "next/navigation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
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
  label,
  allLabel,
  options,
  value,
  onChange,
}: {
  paramKey: string;
  label: string;
  allLabel: string;
  options: Record<string, string>;
  value: string;
  onChange: (key: string, value: string) => void;
}) {
  // Label hiển thị trên trigger: nếu có giá trị -> "<label>: <selectedLabel>",
  // không -> "<label>" (placeholder lo phần value trống).
  const hasValue = value && value !== ALL;
  const triggerLabel = hasValue ? `${label}: ${options[value] ?? value}` : label;
  return (
    <Select
      value={value || ALL}
      onValueChange={(v) => onChange(paramKey, v === ALL ? "" : String(v))}
    >
      <SelectTrigger className="h-10 w-full">
        <SelectValue placeholder={label}>{triggerLabel}</SelectValue>
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={ALL}>{allLabel}</SelectItem>
        {Object.entries(options).map(([val, lbl]) => (
          <SelectItem key={val} value={val}>
            {lbl}
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

// Icon phễu/bộ lọc cho trigger.
function FilterIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      className={className}
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <line x1="4" y1="6" x2="20" y2="6" />
      <line x1="7" y1="12" x2="17" y2="12" />
      <line x1="10" y1="18" x2="14" y2="18" />
    </svg>
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

  // Xóa toàn bộ filter (về /matches không query).
  function clearAll() {
    router.push("/matches");
  }

  const selectedSkills = searchParams.getAll("skillTier") as MatchSkillTier[];
  const selectedSlots = searchParams.getAll("timeSlot") as TimeSlot[];

  const skillOptions = Object.entries(skillTierLabels) as [MatchSkillTier, string][];
  const slotOptions = Object.entries(timeSlotLabels) as [TimeSlot, string][];

  // Đếm filter active để đổi màu pill.
  const activeCount =
    (searchParams.get("matchType") ? 1 : 0) +
    (searchParams.get("fieldType") ? 1 : 0) +
    selectedSkills.length +
    selectedSlots.length;
  const hasFilters = activeCount > 0;

  // Tóm tắt giá trị filter đang active để hiện trên pill (vd "16h30 · Yếu").
  // Hiện tất cả giá trị; pill có max-width + truncate nên text quá dài sẽ tự "..."
  // thay vì cắt số. Thứ tự: timeSlot > skillTier > matchType > fieldType.
  const activeSummary = [
    ...selectedSlots.map((s) => timeSlotLabels[s]),
    ...selectedSkills.map((s) => skillTierLabels[s]),
    ...(searchParams.get("matchType")
      ? [matchTypeLabels[searchParams.get("matchType") as keyof typeof matchTypeLabels]]
      : []),
    ...(searchParams.get("fieldType")
      ? [fieldTypeLabels[searchParams.get("fieldType") as keyof typeof fieldTypeLabels]]
      : []),
  ];

  return (
    <Popover>
      {/* Trigger: pill "Bộ lọc" + icon. Khi có filter active -> nền brand + hiển
          thị tất cả giá trị đang lọc (vd "16h30 · Yếu"), pill max-width + truncate. */}
      <PopoverTrigger
        render={
          <button
            type="button"
            aria-label="Bộ lọc"
            className={cn(
              "inline-flex h-10 max-w-full items-center gap-1.5 rounded-full border px-4 text-sm font-semibold transition-colors",
              hasFilters
                ? "border-brand bg-brand text-white"
                : "border-line bg-surface text-ink-muted hover:border-brand hover:text-brand",
            )}
          />
        }
      >
        <FilterIcon className="shrink-0" />
        {hasFilters ? (
          <span className="truncate">{activeSummary.join(" · ")}</span>
        ) : (
          "Bộ lọc"
        )}
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="w-[min(20rem,calc(100vw-2rem))] p-3"
      >
        {/* Header: tiêu đề + nút "Xóa tất cả". */}
        <div className="flex items-center justify-between">
          <span className="text-sm font-bold text-ink">Bộ lọc</span>
          {hasFilters ? (
            <button
              type="button"
              onClick={clearAll}
              className="text-xs font-semibold text-brand hover:text-brand-hover hover:underline"
            >
              Xóa tất cả
            </button>
          ) : null}
        </div>

        <div className="flex flex-col gap-3">
          <FilterSelect
            paramKey="matchType"
            label="Loại kèo"
            allLabel="Mọi loại kèo"
            options={matchTypeLabels}
            value={searchParams.get("matchType") ?? ""}
            onChange={setParam}
          />
          <FilterSelect
            paramKey="fieldType"
            label="Loại sân"
            allLabel="Mọi loại sân"
            options={fieldTypeLabels}
            value={searchParams.get("fieldType") ?? ""}
            onChange={setParam}
          />

          {/* Khung giờ (multi). */}
          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-semibold text-ink-muted">Khung giờ</span>
            <ChipGroup
              options={slotOptions}
              selected={selectedSlots}
              onToggle={(v) => toggleMulti("timeSlot", v)}
              ariaLabel="Lọc theo khung giờ"
            />
          </div>

          {/* Trình độ (multi). */}
          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-semibold text-ink-muted">Trình độ</span>
            <ChipGroup
              options={skillOptions}
              selected={selectedSkills}
              onToggle={(v) => toggleMulti("skillTier", v)}
              ariaLabel="Lọc theo trình độ"
            />
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
