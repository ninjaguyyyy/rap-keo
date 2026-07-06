"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
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
import { createMatch, parseMatchText } from "../actions";
import type { CreateMatchState } from "../schemas";
import type { ParseMatchTextState } from "../actions";
import type { MatchSkillTier, MatchType, FieldType } from "@/generated/prisma/enums";
import type { MatchDraft } from "../ai-parser";
import { AreaCombobox } from "./area-combobox";

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

export function MatchForm({ onSuccess, isAdmin = false }: { onSuccess?: () => void; isAdmin?: boolean }) {
  const [state, formAction, pending] = useActionState(
    createMatch,
    initialState,
  );
  const [parseState, setParseState] = useState<ParseMatchTextState>({});
  const [parseInput, setParseInput] = useState("");
  const [parseFetching, startParseTransition] = useTransition();
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
  // Sân (combobox free text — AI parser set được). State giữ label hoặc text tự do.
  const [area, setArea] = useState<string>("Sân Trung Tâm");
  // fieldType controlled (cho AI parser set) — defaultValue fallback F7.
  const [fieldTypeValue, setFieldTypeValue] = useState<string>("F7");
  // note controlled (cho AI parser set).
  const [noteValue, setNoteValue] = useState<string>("");
  // Track lần parse để tránh apply lại cùng draft sau khi user đã sửa.
  const [lastParsedInput, setLastParsedInput] = useState<string | null>(null);

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
      // Trong modal -> đóng modal rồi redirect sang "Kèo của tôi" để user thấy kèo
      // vừa đăng + trạng thái. Dùng fallback /my-matches cả khi không có onSuccess
      // (form dùng ngoài modal) vì đây là đích tự nhiên sau khi tạo kèo.
      if (onSuccess) onSuccess();
      router.push("/my-matches");
    }
  }, [state, router, onSuccess]);

  // Apply draft từ AI parser vào state form (chạy 1 lần khi parse xong).
  // Tránh apply lại: track input đã parse bằng parseState.input.
  // Lint rule react-hooks/set-state-in-effect tắt cho khối này vì đây là side-effect
  // có chủ đích: sync kết quả server action (parseState) về form state.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (!parseState?.ok || !parseState.data) return;
    if (parseState.input === lastParsedInput) return;
    setLastParsedInput(parseState.input ?? null);

    const draft: MatchDraft = parseState.data;
    if (draft.matchType) setMatchType(draft.matchType);
    if (draft.fieldType) {
      setFieldTypeValue(draft.fieldType);
    }
    if (draft.skillTiers && draft.skillTiers.length > 0) {
      setSkillTiers(draft.skillTiers);
    }
    if (draft.timeSlots && draft.timeSlots.length > 0) {
      setTimeSlots(draft.timeSlots as TimeSlot[]);
    }
    if (typeof draft.hasField === "boolean") setHasField(draft.hasField);
    // draft.area có thể là enum key (từ AI: "trung_tam") -> map sang label "Sân Trung Tâm".
    // Nếu không match key -> dùng nguyên text (free text).
    if (draft.area) setArea(areaLabels[draft.area] ?? draft.area);
    if (draft.note) setNoteValue(draft.note);
  }, [parseState, lastParsedInput]);
  /* eslint-enable react-hooks/set-state-in-effect */

  return (
    <form action={formAction} className="flex flex-col gap-4">
      {/* Admin: section "Phân tích text" — dán text FB, Gemini điền form. */}
      {isAdmin ? (
        <div className="rounded-lg border border-brand/30 bg-brand-soft/40 p-3">
          <div className="mb-1.5 flex items-center gap-1.5">
            <span className="text-base" aria-hidden="true">✨</span>
            <span className="text-sm font-bold text-ink">Tạo kèo nhanh từ text</span>
            <span className="ml-auto rounded-full bg-brand px-1.5 py-0.5 text-[10px] font-bold text-white">
              ADMIN
            </span>
          </div>
          <p className="mb-2 text-xs text-muted-foreground">
            Dán text kèo copy từ group FB — AI điền giúp các trường bên dưới.
          </p>
          {/* Parse bằng transition (gọi server action trực tiếp, không nested <form>
              để tránh lỗi "form unexpectedly submitted" khi nằm trong form Tạo kèo). */}
          <div className="flex flex-col gap-2">
            <Textarea
              value={parseInput}
              onChange={(e) => setParseInput(e.target.value)}
              rows={3}
              placeholder="VD: Cần tìm kèo Yếu đã có sân trung tâm 19h30 sân 7..."
              className="text-sm"
            />
            {parseState?.error ? (
              <p className="text-xs text-destructive">{parseState.error}</p>
            ) : null}
            {parseState?.ok && parseState.data ? (
              <p className="text-xs font-medium text-brand">
                ✓ Đã điền form từ text — kiểm tra lại rồi &ldquo;Đăng kèo&rdquo;.
              </p>
            ) : null}
            <Button
              type="button"
              variant="secondary"
              disabled={parseFetching || !parseInput.trim()}
              onClick={() =>
                startParseTransition(async () => {
                  // Gọi server action trực tiếp (trả Promise<state>), setState thủ công.
                  // Tránh useActionState + nested form (lỗi "form unexpectedly submitted").
                  const fd = new FormData();
                  fd.set("rawText", parseInput);
                  const result = await parseMatchText(parseState, fd);
                  setParseState(result);
                })
              }
              className="h-9 w-full text-sm"
            >
              {parseFetching ? "Đang phân tích..." : "Phân tích AI"}
            </Button>          </div>
        </div>
      ) : null}

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
            <SelectValue>{matchTypeLabels[matchType as MatchType]}</SelectValue>
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
        <Select
          name="fieldType"
          value={fieldTypeValue}
          onValueChange={(v) => setFieldTypeValue(String(v))}
          defaultValue="F7"
          required
        >
          <SelectTrigger id="fieldType" className="h-11 w-full">
            <SelectValue>{fieldTypeLabels[fieldTypeValue as FieldType]}</SelectValue>
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

      {/* Sân — combobox: gợi ý 4 sân + cho nhập text tự do. Controlled để
          AI parser set được (map key->label khi apply draft). */}
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="area">Sân</Label>
        <AreaCombobox
          value={area}
          onChange={setArea}
          required
        />
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
          value={noteValue}
          onChange={(e) => setNoteValue(e.target.value)}
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
