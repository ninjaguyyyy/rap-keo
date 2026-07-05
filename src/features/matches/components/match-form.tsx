"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
  areaLabels,
  fieldTypeLabels,
  matchTypeLabels,
  skillTierLabels,
  timeSlotLabels,
} from "../labels";
import { createMatch } from "../actions";
import type { CreateMatchState } from "../schemas";
import type { MatchSkillTier } from "@/generated/prisma/enums";

// TimeSlot = keyof TIME_SLOT_RANGES (queries.ts) — nhưng queries.ts là server-only,
// nên định nghĩa type client-side khớp tuple (value là key cho URL/hidden input).
type TimeSlot =
  | "0500" | "0530" | "0600" | "0630"
  | "1630" | "1730" | "1830" | "1930" | "2030" | "2130";

const initialState: CreateMatchState = {};

// Ngày hôm nay theo giờ trình duyệt (giả định user ở VN), format "YYYY-MM-DD".
function todayStr(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

// Thang trình độ để chọn (giữ key enum làm value, label tiếng Việt).
const SKILL_OPTIONS = Object.entries(skillTierLabels) as [
  MatchSkillTier,
  string,
][];

// Slot giờ để chọn (giữ thứ tự trong object). Mỗi slot: key -> label.
const TIME_SLOTS = Object.entries(timeSlotLabels) as [TimeSlot, string][];

// Range giờ bắt đầu của mỗi slot (key -> "HH:mm"). Định nghĩa client-side để
// không phải import queries.ts (file server-only) vào client component.
const TIME_SLOT_START: Record<TimeSlot, string> = {
  "0500": "05:00",
  "0530": "05:30",
  "0600": "06:00",
  "0630": "06:30",
  "1630": "16:30",
  "1730": "17:30",
  "1830": "18:30",
  "1930": "19:30",
  "2030": "20:30",
  "2130": "21:30",
};

export function MatchForm({ onSuccess }: { onSuccess?: () => void }) {
  const [state, formAction, pending] = useActionState(
    createMatch,
    initialState,
  );
  const router = useRouter();
  // Ngày đá: default hôm nay (chỉ tính trên client để tránh mismatch SSR).
  const [playDate, setPlayDate] = useState<string>(todayStr);
  // Trạng thái chọn trình độ (multi). Đặt mặc định ["AVERAGE"] để user khỏi quên.
  const [skillTiers, setSkillTiers] = useState<MatchSkillTier[]>(["AVERAGE"]);
  // Trạng thái chọn giờ (multi - các slot.key).
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  // Đã có sân hay chưa (radio 2 lựa chọn). Default: chưa có sân.
  const [hasField, setHasField] = useState<boolean>(false);
  // Loại kèo (controlled để show/hide field "Số cầu rảnh" khi LOOKING_FOR_TEAM).
  const [matchType, setMatchType] = useState<string>("FIND_OPPONENT");
  // Số cầu rảnh (chỉ dùng cho LOOKING_FOR_TEAM). Default 1.
  const [playersCount, setPlayersCount] = useState<number>(1);

  function toggleSkill(value: MatchSkillTier) {
    setSkillTiers((prev) =>
      prev.includes(value)
        ? prev.filter((v) => v !== value)
        : [...prev, value],
    );
  }

  function toggleTimeSlot(value: TimeSlot) {
    setTimeSlots((prev) =>
      prev.includes(value)
        ? prev.filter((v) => v !== value)
        : [...prev, value],
    );
  }

  // Ghép ngày + mỗi slot -> "YYYY-MM-DDTHH:mm" (server gắn +07:00). Lấy giờ bắt đầu
  // của slot (VD slot "1930" -> "19:30") làm giờ đá chính thức.
  const playTimes = timeSlots
    .map((slot) => {
      const start = TIME_SLOT_START[slot]; // "HH:mm"
      return `${playDate}T${start}`;
    })
    .sort();

  useEffect(() => {
    if (state.ok) {
      // Trong modal -> đóng modal (list tự refresh qua revalidatePath trong action).
      // Dùng chỗ khác (không có onSuccess) -> fallback redirect về /matches.
      if (onSuccess) onSuccess();
      else router.push("/matches");
    }
  }, [state, router, onSuccess]);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      {/* Loại kèo */}
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="matchType">Loại kèo</Label>
        <Select
          name="matchType"
          value={matchType}
          onValueChange={(v) => setMatchType(String(v))}
          defaultValue="FIND_OPPONENT"
          required
        >
          <SelectTrigger id="matchType" className="h-11 w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(matchTypeLabels).map(([val, label]) => (
              <SelectItem key={val} value={val}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {state.fieldErrors?.matchType ? (
          <p className="text-sm text-destructive">
            {state.fieldErrors.matchType}
          </p>
        ) : null}
      </div>

      {/* Số cầu rảnh — chỉ hiện khi LOOKING_FOR_TEAM (cá nhân 1-2 cầu tìm đội). */}
      {matchType === "LOOKING_FOR_TEAM" ? (
        <div className="flex flex-col gap-1.5">
          <Label>Số cầu rảnh</Label>
          <div className="flex gap-2" role="group" aria-label="Số cầu rảnh">
            {[1, 2].map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setPlayersCount(n)}
                aria-pressed={playersCount === n}
                className={cn(
                  "inline-flex h-11 flex-1 items-center justify-center gap-1.5 rounded-lg border text-sm font-semibold transition-colors",
                  playersCount === n
                    ? "border-brand bg-brand text-white"
                    : "border-line bg-surface text-ink-muted hover:border-brand hover:text-brand",
                )}
              >
                <span className="text-base" aria-hidden="true">
                  {"👤".repeat(n)}
                </span>
                {n} cầu
              </button>
            ))}
          </div>
          <input
            type="hidden"
            name="playersCount"
            value={playersCount}
          />
          <p className="text-xs text-muted-foreground">
            Bạn có 1-2 cầu rảnh, muốn tìm đội đá nội bộ hoặc kèo.
          </p>
        </div>
      ) : null}

      {/* Loại sân */}
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="fieldType">Loại sân</Label>
        <Select name="fieldType" defaultValue="F7" required>
          <SelectTrigger id="fieldType" className="h-11 w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(fieldTypeLabels).map(([val, label]) => (
              <SelectItem key={val} value={val}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {state.fieldErrors?.fieldType ? (
          <p className="text-sm text-destructive">
            {state.fieldErrors.fieldType}
          </p>
        ) : null}
      </div>

      {/* Đã có sân chưa (radio 2 lựa chọn) — đặt sau Loại sân. */}
      <div className="flex flex-col gap-1.5">
        <Label>Đã có sân chưa?</Label>
        <div className="flex gap-2" role="group" aria-label="Đã có sân chưa">
          <button
            type="button"
            onClick={() => setHasField(true)}
            aria-pressed={hasField}
            className={cn(
              "inline-flex h-11 flex-1 items-center justify-center gap-1.5 rounded-lg border text-sm font-semibold transition-colors",
              hasField
                ? "border-brand bg-brand text-white"
                : "border-line bg-surface text-ink-muted hover:border-brand hover:text-brand",
            )}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <polyline points="20 6 9 17 4 12" />
            </svg>
            Đã có sân
          </button>
          <button
            type="button"
            onClick={() => setHasField(false)}
            aria-pressed={!hasField}
            className={cn(
              "inline-flex h-11 flex-1 items-center justify-center gap-1.5 rounded-lg border text-sm font-semibold transition-colors",
              !hasField
                ? "border-brand bg-brand text-white"
                : "border-line bg-surface text-ink-muted hover:border-brand hover:text-brand",
            )}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
            Chưa có sân
          </button>
        </div>
        {/* Hidden input: "on" khi checked -> server parse hasField=true. */}
        <input type="hidden" name="hasField" value={hasField ? "on" : "off"} />
        {state.fieldErrors?.hasField ? (
          <p className="text-sm text-destructive">
            {state.fieldErrors.hasField}
          </p>
        ) : null}
      </div>

      {/* Trình độ — multi-select dạng chip toggle (mobile-friendly). */}
      <div className="flex flex-col gap-1.5">
        <Label>Trình độ</Label>
        <div
          className="flex flex-wrap gap-1.5"
          role="group"
          aria-label="Chọn trình độ"
        >
          {SKILL_OPTIONS.map(([val, label]) => {
            const active = skillTiers.includes(val);
            return (
              <button
                key={val}
                type="button"
                onClick={() => toggleSkill(val)}
                aria-pressed={active}
                className={cn(
                  "inline-flex h-9 items-center rounded-full border px-3 text-sm font-semibold transition-colors",
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
        {/* Hidden inputs: mỗi trình độ chọn -> 1 entry name="skillTiers" để
            server action nhận qua formData.getAll("skillTiers"). */}
        {skillTiers.map((val) => (
          <input key={val} type="hidden" name="skillTiers" value={val} />
        ))}
        {state.fieldErrors?.skillTiers ? (
          <p className="text-sm text-destructive">
            {state.fieldErrors.skillTiers}
          </p>
        ) : (
          <p className="text-xs text-muted-foreground">
            Chọn 1 hoặc nhiều trình độ mà kèo mở cho.
          </p>
        )}
      </div>

      {/* Ngày đá + giờ đá (multi) */}
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="playDate">Ngày đá</Label>
        <Input
          id="playDate"
          name="playDate"
          type="date"
          required
          value={playDate}
          min={todayStr()}
          onChange={(e) => setPlayDate(e.target.value)}
          className="h-11 text-base"
        />
        {state.fieldErrors?.playTimes ? (
          <p className="text-sm text-destructive">
            {state.fieldErrors.playTimes}
          </p>
        ) : null}
      </div>

      <div className="flex flex-col gap-1.5">
        <Label>Giờ đá</Label>
        <div
          className="flex flex-wrap gap-1.5"
          role="group"
          aria-label="Chọn giờ đá"
        >
          {TIME_SLOTS.map(([val, label]) => {
            const active = timeSlots.includes(val);
            return (
              <button
                key={val}
                type="button"
                onClick={() => toggleTimeSlot(val)}
                aria-pressed={active}
                className={cn(
                  "inline-flex h-9 items-center rounded-full border px-3 text-sm font-semibold transition-colors",
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
        {/* Hidden inputs: mỗi combo ngày+slot -> 1 entry name="playTimes"
            dạng "YYYY-MM-DDTHH:mm" để server action nhận qua formData.getAll. */}
        {playTimes.map((pt) => (
          <input key={pt} type="hidden" name="playTimes" value={pt} />
        ))}
        {state.fieldErrors?.playTimes ? (
          <p className="text-sm text-destructive">
            {state.fieldErrors.playTimes}
          </p>
        ) : (
          <p className="text-xs text-muted-foreground">
            Chọn 1 hoặc nhiều khung giờ. Có thể chọn cả sáng và tối.
          </p>
        )}
      </div>

      {/* Khu vực — chọn 1 trong 4 sân (MVP). */}
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="area">Khu vực</Label>
        <Select name="area" defaultValue="trung_tam" required>
          <SelectTrigger id="area" className="h-11 w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(areaLabels).map(([val, label]) => (
              <SelectItem key={val} value={val}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {state.fieldErrors?.area ? (
          <p className="text-sm text-destructive">
            {state.fieldErrors.area}
          </p>
        ) : null}
      </div>

      {/* Ghi chú */}
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="note">Ghi chú</Label>
        <Textarea
          id="note"
          name="note"
          maxLength={500}
          rows={3}
          placeholder="VD: Tìm đối giao hữu, fair-play, có sẵn áo đấu..."
          className="text-base"
        />
        {state.fieldErrors?.note ? (
          <p className="text-sm text-destructive">
            {state.fieldErrors.note}
          </p>
        ) : null}
      </div>

      {/* Lỗi chung (DB / server). */}
      {state.error ? (
        <p className="text-sm text-destructive">{state.error}</p>
      ) : null}

      <Button type="submit" disabled={pending} className="h-11 w-full text-base">
        {pending ? "Đang tạo kèo..." : "Đăng kèo"}
      </Button>
    </form>
  );
}
