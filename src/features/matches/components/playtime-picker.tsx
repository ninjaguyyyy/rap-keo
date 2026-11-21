"use client";

import { useMemo, useState } from "react";
import { ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

type TimeOption = {
  value: string;
  label: string;
};

function toDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function fromDateKey(value: string): Date {
  const [y, m, d] = value.split("-").map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}

function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function monthValue(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

function monthLabel(date: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    year: "numeric",
  }).format(date);
}

const dayNameFormatter = new Intl.DateTimeFormat("en-US", {
  weekday: "short",
});

type PlaytimePickerProps = Readonly<{
  selectedDate: string;
  onDateChange: (value: string) => void;
  timeOptions: TimeOption[];
  selectedTimes: string[];
  onToggleTime: (value: string) => void;
  minDate?: string;
  dateLabel?: string;
  timeLabel?: string;
  timezoneLabel?: string;
  timeHint?: string;
  error?: string;
}>;

export function PlaytimePicker({
  selectedDate,
  onDateChange,
  timeOptions,
  selectedTimes,
  onToggleTime,
  minDate,
  dateLabel = "Ngày đá",
  timeLabel = "Giờ đá",
  timezoneLabel = "Hồ Chí Minh (GMT+7)",
  timeHint,
  error,
}: PlaytimePickerProps) {
  const selected = fromDateKey(selectedDate);
  const [windowStart, setWindowStart] = useState<Date>(selected);

  const minDateValue = minDate ? fromDateKey(minDate) : null;

  const days = useMemo(
    () => Array.from({ length: 6 }, (_, i) => addDays(windowStart, i)),
    [windowStart],
  );

  const monthOptions = useMemo(() => {
    const base = new Date(selected.getFullYear(), selected.getMonth(), 1);
    return Array.from({ length: 13 }, (_, i) => {
      const d = new Date(base.getFullYear(), base.getMonth() - 2 + i, 1);
      return { value: monthValue(d), label: monthLabel(d), date: d };
    });
  }, [selected]);

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-line bg-surface p-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <Label className="text-sm font-semibold text-ink">{dateLabel}</Label>
          <Select
            value={monthValue(selected)}
            onValueChange={(value) => {
              const [y, m] = value.split("-").map(Number);
              const nextDate = new Date(y, (m || 1) - 1, 1);
              const nextKey = toDateKey(nextDate);
              onDateChange(nextKey);
              setWindowStart(nextDate);
            }}
          >
            <SelectTrigger className="h-8 min-w-32 rounded-lg border-line px-2 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {monthOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-1">
          <Button
            type="button"
            size="icon"
            variant="outline"
            className="size-8 rounded-full"
            onClick={() => setWindowStart((prev) => addDays(prev, -6))}
            aria-label="Ngày trước"
          >
            <ChevronLeft className="size-4" />
          </Button>
          <Button
            type="button"
            size="icon"
            variant="outline"
            className="size-8 rounded-full"
            onClick={() => setWindowStart((prev) => addDays(prev, 6))}
            aria-label="Ngày sau"
          >
            <ChevronRight className="size-4" />
          </Button>
        </div>
      </div>

      <fieldset className="grid grid-cols-3 gap-2 sm:grid-cols-6">
        <legend className="sr-only">Chọn ngày đá</legend>
        {days.map((day) => {
          const key = toDateKey(day);
          const active = key === selectedDate;
          const disabled = minDateValue ? day < minDateValue : false;

          return (
            <button
              key={key}
              type="button"
              disabled={disabled}
              onClick={() => onDateChange(key)}
              className={cn(
                "flex h-20 flex-col items-center justify-center rounded-xl border text-sm transition-colors",
                active
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-line bg-surface text-ink hover:border-brand hover:text-brand",
                disabled && "cursor-not-allowed opacity-45",
              )}
              aria-pressed={active}
            >
              <span className="text-xs opacity-80">{dayNameFormatter.format(day)}</span>
              <span className="mt-1 text-[28px] leading-none font-bold tabular-nums">
                {String(day.getDate()).padStart(2, "0")}
              </span>
            </button>
          );
        })}
      </fieldset>

      <button
        type="button"
        className="inline-flex w-fit items-center gap-1.5 rounded-md px-1 text-sm font-medium text-ink-muted"
        aria-label="Múi giờ"
      >
        {timezoneLabel}
        <ChevronDown className="size-4" aria-hidden="true" />
      </button>

      <div className="flex flex-col gap-1.5">
        <Label className="text-sm font-semibold text-ink">{timeLabel}</Label>
        <fieldset className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          <legend className="sr-only">Chọn giờ đá</legend>
          {timeOptions.map((option) => {
            const active = selectedTimes.includes(option.value);
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => onToggleTime(option.value)}
                aria-pressed={active}
                className={cn(
                  "inline-flex h-10 items-center justify-center rounded-lg border px-3 text-sm font-semibold transition-colors",
                  active
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-line bg-surface text-ink-muted hover:border-brand hover:text-brand",
                )}
              >
                {option.label}
              </button>
            );
          })}
        </fieldset>
      </div>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      {!error && timeHint ? (
        <p className="text-xs text-muted-foreground">{timeHint}</p>
      ) : null}
    </div>
  );
}