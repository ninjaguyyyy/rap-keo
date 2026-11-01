"use client";

import { useRouter, useSearchParams } from "next/navigation";
import * as Slider from "@radix-ui/react-slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import {
  areaLabels,
  fieldTypeLabels,
  matchTypeLabels,
  skillTierLabels,
  timeSlotLabels,
} from "../labels";
import { ChevronLeftIcon, ChevronRightIcon, Clock3Icon, SlidersHorizontalIcon } from "lucide-react";
import type { MatchSkillTier } from "@/generated/prisma/enums";

// TimeSlot = keyof TIME_SLOT_RANGES — nhưng queries.ts là server-only, nên định
// nghĩa type client-side khớp tuple (value là key cho URL).
type TimeSlot =
  | "1500" | "1530" | "1600" | "1630" | "1700" | "1730"
  | "1800" | "1830" | "1900" | "1930" | "2000" | "2030"
  | "2100" | "2130" | "2200" | "2230" | "2300" | "2330";

const ALL = "all";

function FilterSelect({
  paramKey,
  placeholder,
  allLabel,
  options,
  value,
  onChange,
  triggerClassName,
}: Readonly<{
  paramKey: string;
  placeholder: string;
  allLabel: string;
  options: Record<string, string>;
  value: string;
  onChange: (key: string, value: string) => void;
  triggerClassName?: string;
}>) {
  const hasValue = value && value !== ALL;
  const triggerLabel = hasValue ? options[value] ?? value : placeholder;

  return (
    <Select
      value={value || ALL}
      onValueChange={(v) => onChange(paramKey, v === ALL ? "" : String(v))}
    >
      <SelectTrigger
        className={cn(
          "h-8.5! min-w-28 rounded-[8px]! border-[0.1rem] border-[#a68da8] bg-transparent px-3 py-2 text-sm font-medium text-brand",
          "[&>svg]:size-6 [&>svg]:translate-y-px",
          triggerClassName,
        )}
      >
        <SelectValue placeholder={placeholder}>{triggerLabel}</SelectValue>
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
}: Readonly<{
  options: [string, string][];
  selected: string[];
  onToggle: (value: string) => void;
  ariaLabel: string;
}>) {
  return (
    <fieldset className="flex flex-wrap gap-1.5">
      <legend className="sr-only">{ariaLabel}</legend>
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
                ? "border-brand bg-brand text-white shadow-sm"
                : "border-line bg-surface text-ink-muted hover:border-brand hover:text-brand",
            )}
          >
            {label}
          </button>
        );
      })}
    </fieldset>
  );
}

type DayOption = {
  key: string;
  label: string;
  count: number;
};

export function MatchFilters({
  dayOptions,
  selectedDayKey,
}: Readonly<{
  dayOptions: DayOption[];
  selectedDayKey: string;
}>) {
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
  const slotValues = slotOptions.map(([value]) => value);
  const selectedSlotIndices = selectedSlots
    .map((value) => slotValues.indexOf(value))
    .filter((index) => index >= 0)
    .sort((a, b) => a - b);
  const draftRange: [number, number] = selectedSlotIndices.length > 0
    ? [selectedSlotIndices[0], selectedSlotIndices.at(-1) ?? selectedSlotIndices[0]]
    : [0, Math.max(0, slotValues.length - 1)];
  const hasSelectedTimeRange = selectedSlots.length > 0;
  const selectedDayIndex = Math.max(
    0,
    dayOptions.findIndex((day) => day.key === selectedDayKey),
  );
  const selectedDay = dayOptions[selectedDayIndex] ?? dayOptions[0];
  let dayStateLabel = "Sắp tới";
  if (selectedDayIndex === 0) {
    dayStateLabel = "Hôm nay";
  } else if (selectedDayIndex === 1) {
    dayStateLabel = "Ngày mai";
  }

  function setDay(dayKey: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("day", dayKey);
    router.push(`/matches?${params.toString()}`);
  }

  function goPrevDay() {
    const prevIndex = Math.max(0, selectedDayIndex - 1);
    setDay(dayOptions[prevIndex].key);
  }

  function goNextDay() {
    const nextIndex = Math.min(dayOptions.length - 1, selectedDayIndex + 1);
    setDay(dayOptions[nextIndex].key);
  }

  function applyTimeRangeByIndex(startIndexRaw: number, endIndexRaw: number) {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("timeSlot");

    const startIndex = Math.max(0, Math.min(slotValues.length - 1, startIndexRaw));
    const endIndex = Math.max(0, Math.min(slotValues.length - 1, endIndexRaw));
    if (slotValues.length === 0) {
      router.push(`/matches?${params.toString()}`);
      return;
    }

    const from = Math.min(startIndex, endIndex);
    const to = Math.max(startIndex, endIndex);
    slotValues.slice(from, to + 1).forEach((slot) => params.append("timeSlot", slot));
    router.push(`/matches?${params.toString()}`);
  }

  function clearTimeRange() {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("timeSlot");
    router.push(`/matches?${params.toString()}`);
  }

  // Đếm filter active để đổi màu pill.
  const activeCount =
    (searchParams.get("matchType") ? 1 : 0) +
    (searchParams.get("fieldType") ? 1 : 0) +
    (searchParams.get("area") ? 1 : 0) +
    selectedSkills.length +
    (hasSelectedTimeRange ? 1 : 0);
  const hasFilters = activeCount > 0;

  return (
    <div className="space-y-4">
      <div className="flex gap-2 overflow-x-auto pb-1">
        <Popover>
          <PopoverTrigger
            render={
              <Button
                type="button"
                variant="outline"
                size="icon"
                className={cn(
                  "h-8.5! w-8.5 shrink-0 rounded-[8px]! border-[0.1rem] border-[#a68da8] bg-transparent text-brand",
                  hasFilters ? "border-brand bg-brand-soft text-brand" : ""
                )}
                aria-label="Bộ lọc nâng cao"
              />
            }
          >
            <SlidersHorizontalIcon className="size-4" />
          </PopoverTrigger>
          <PopoverContent
            align="start"
            className="w-[min(20rem,calc(100vw-2rem))] rounded-2xl border-line p-3"
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-ink">Bộ lọc nâng cao</span>
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
                placeholder="Loại kèo"
                allLabel="Mọi loại kèo"
                options={matchTypeLabels}
                value={searchParams.get("matchType") ?? ""}
                onChange={setParam}
              />
              <FilterSelect
                paramKey="fieldType"
                placeholder="Loại sân"
                allLabel="Mọi loại sân"
                options={fieldTypeLabels}
                value={searchParams.get("fieldType") ?? ""}
                onChange={setParam}
              />
              <FilterSelect
                paramKey="area"
                placeholder="Sân"
                allLabel="Mọi sân"
                options={areaLabels}
                value={searchParams.get("area") ?? ""}
                onChange={setParam}
              />

              <div className="flex flex-col gap-1.5">
                <span className="text-xs font-semibold text-ink-muted">Khung giờ</span>
                <div className="rounded-xl border border-line/80 bg-surface-muted/55 p-2">
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1 text-[11px] font-semibold text-ink-muted">
                      <Clock3Icon className="size-3.5" />
                      <span>Khoảng thời gian</span>
                    </div>
                    {hasSelectedTimeRange ? (
                      <button
                        type="button"
                        onClick={clearTimeRange}
                        className="text-[11px] font-semibold text-brand hover:underline"
                      >
                        Bỏ lọc giờ
                      </button>
                    ) : null}
                  </div>

                  <div className="mb-2 flex items-center justify-between rounded-lg border border-line/70 bg-surface px-2 py-1.5 text-[11px] font-semibold text-ink-muted">
                    <span>{slotOptions[draftRange[0]]?.[1] ?? "--:--"}</span>
                    <span aria-hidden="true" className="text-ink-subtle">→</span>
                    <span>{slotOptions[draftRange[1]]?.[1] ?? "--:--"}</span>
                  </div>

                  <Slider.Root
                    key={`${draftRange[0]}-${draftRange[1]}-${hasSelectedTimeRange ? "on" : "off"}`}
                    className="relative flex h-8 w-full touch-none items-center"
                    min={0}
                    max={Math.max(0, slotValues.length - 1)}
                    step={1}
                    defaultValue={draftRange}
                    onValueCommit={(values) => {
                      if (values.length === 2) {
                        applyTimeRangeByIndex(values[0], values[1]);
                      }
                    }}
                  >
                    <Slider.Track className="relative h-2 grow rounded-full bg-brand-soft/70">
                      <Slider.Range className="absolute h-full rounded-full bg-brand" />
                    </Slider.Track>
                    <Slider.Thumb className="block size-4 rounded-full border border-brand bg-white shadow-sm outline-none ring-brand/35 focus-visible:ring-2" />
                    <Slider.Thumb className="block size-4 rounded-full border border-brand bg-white shadow-sm outline-none ring-brand/35 focus-visible:ring-2" />
                  </Slider.Root>

                  <div className="mt-1 flex justify-between text-[10px] font-medium text-ink-subtle">
                    <span>{slotOptions[0]?.[1]}</span>
                    <span>{slotOptions.at(-1)?.[1]}</span>
                  </div>
                </div>
              </div>

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

          <FilterSelect
            paramKey="matchType"
            placeholder="Loại kèo"
            allLabel="Mọi loại kèo"
            options={matchTypeLabels}
            value={searchParams.get("matchType") ?? ""}
            onChange={setParam}
          />

          <FilterSelect
            paramKey="fieldType"
            placeholder="Loại sân"
            allLabel="Mọi loại sân"
            options={fieldTypeLabels}
            value={searchParams.get("fieldType") ?? "F5"}
            onChange={setParam}
            triggerClassName="min-w-20"
          />

          <FilterSelect
            paramKey="skillTier"
            placeholder="Trình độ"
            allLabel="Mọi trình độ"
            options={skillTierLabels}
            value={searchParams.get("skillTier") ?? ""}
            onChange={setParam}
          />

        </div>

        <div className="flex items-center justify-center gap-6">
          <Button
            type="button"
            variant="ghost"
            className="h-8 w-8 rounded-full bg-[#ebe5eb] text-brand hover:bg-[#e3dce4]"
            onClick={goPrevDay}
            disabled={selectedDayIndex === 0}
          >
            <ChevronLeftIcon className="size-7" />
            <span className="sr-only">Ngày trước</span>
          </Button>

          <div className="mt-2 text-center tracking-[0.24px]">
            <p className="mb-0 font-heading text-[16px] leading-[140%] font-black text-brand">{dayStateLabel}</p>
            <p className="tracking-[0.24px] text-[13px] leading-tight font-medium text-ink-muted">
              {selectedDay.label} · {selectedDay.count} kèo
            </p>
          </div>

          <Button
            type="button"
            variant="ghost"
            className="h-8 w-8 rounded-full bg-[#ebe5eb] text-brand hover:bg-[#e3dce4]"
            onClick={goNextDay}
            disabled={selectedDayIndex === dayOptions.length - 1}
          >
            <ChevronRightIcon className="size-7" />
            <span className="sr-only">Ngày sau</span>
          </Button>
        </div>
      </div>
    );
  }
