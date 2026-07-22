"use client";

// Dialog tạo trận cho team (từ team detail, tab Trận đấu). 2 loại:
// - "opponent": đá kèo — nhập tên đối thủ (opponentName).
// - "internal": đá nội bộ — nhập tên 2 bên (sideAName / sideBName).
// Trận đều sắp tới (status OPEN, chưa tỷ số), isPrivate=true (không lên /matches).
// Mirror AddMemberDialog (Dialog render prop + useActionState + segmented toggle).
import { useActionState, useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { fieldTypeLabels } from "@/features/matches/labels";
import { AreaCombobox } from "@/features/matches/components/area-combobox";
import { createTeamMatch } from "../actions";
import type { CreateTeamMatchState } from "../schemas";
import type { FieldType } from "@/generated/prisma/enums";

const initialState: CreateTeamMatchState = {};

type Kind = "opponent" | "internal";

// Ngày hôm nay theo giờ trình duyệt (giả định user ở VN), format "YYYY-MM-DD".
function todayStr(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

const FIELD_OPTIONS = Object.entries(fieldTypeLabels) as [FieldType, string][];

export function CreateTeamMatchDialog({ teamId }: { teamId: string }) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(
    createTeamMatch,
    initialState,
  );
  const [kind, setKind] = useState<Kind>("opponent");
  const [fieldType, setFieldType] = useState<FieldType>("F7");
  const [playDate, setPlayDate] = useState<string>(todayStr);
  const [playHour, setPlayHour] = useState<string>("19:30");
  const [area, setArea] = useState<string>("");
  const [opponentName, setOpponentName] = useState<string>("");
  const [sideAName, setSideAName] = useState<string>("");
  const [sideBName, setSideBName] = useState<string>("");

  // Ghép ngày + giờ -> "YYYY-MM-DDTHH:mm" (server gắn +07:00 + validate >= now+30').
  const playTime = `${playDate}T${playHour}`;

  // Tạo xong -> đóng dialog + reset. revalidatePath làm mới list.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (state.ok) {
      setOpen(false);
      setOpponentName("");
      setSideAName("");
      setSideBName("");
    }
  }, [state]);
  /* eslint-enable react-hooks/set-state-in-effect */

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm" className="h-9 px-3 text-sm" />}>
        <svg
          width="15"
          height="15"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <line x1="12" y1="5" x2="12" y2="19" />
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
        Tạo trận
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Tạo trận cho đội</DialogTitle>
          <DialogDescription>
            Lên lịch trận sắp tới. Trận chỉ hiện trong đội (không lên bảng kèo).
          </DialogDescription>
        </DialogHeader>

        <form action={formAction} className="flex flex-col gap-4">
          <input type="hidden" name="teamId" value={teamId} />
          <input type="hidden" name="kind" value={kind} />
          <input type="hidden" name="fieldType" value={fieldType} />
          <input type="hidden" name="playTime" value={playTime} />

          {/* Loại trận: Đá kèo / Đá nội bộ. */}
          <div className="flex flex-col gap-1.5">
            <Label>Loại trận</Label>
            <div
              role="group"
              aria-label="Loại trận"
              className="grid grid-cols-2 gap-1 rounded-lg bg-surface-muted p-1"
            >
              <ToggleButton active={kind === "opponent"} onClick={() => setKind("opponent")}>
                Đá kèo
              </ToggleButton>
              <ToggleButton active={kind === "internal"} onClick={() => setKind("internal")}>
                Đá nội bộ
              </ToggleButton>
            </div>
          </div>

          {/* Tên đối thủ / 2 bên nội bộ theo kind. */}
          {kind === "opponent" ? (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="opponent-name">Tên đối thủ</Label>
              <Input
                id="opponent-name"
                name="opponentName"
                type="text"
                value={opponentName}
                onChange={(e) => setOpponentName(e.target.value)}
                maxLength={50}
                placeholder="VD: FC Sấm Sét"
                required
                aria-invalid={!!state.fieldErrors?.opponentName}
              />
              {state.fieldErrors?.opponentName ? (
                <p className="text-sm text-destructive">
                  {state.fieldErrors.opponentName}
                </p>
              ) : null}
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="side-a-name">Tên bên A</Label>
                <Input
                  id="side-a-name"
                  name="sideAName"
                  type="text"
                  value={sideAName}
                  onChange={(e) => setSideAName(e.target.value)}
                  maxLength={50}
                  placeholder="VD: Đội xanh"
                  required
                  aria-invalid={!!state.fieldErrors?.sideAName}
                />
                {state.fieldErrors?.sideAName ? (
                  <p className="text-sm text-destructive">
                    {state.fieldErrors.sideAName}
                  </p>
                ) : null}
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="side-b-name">Tên bên B</Label>
                <Input
                  id="side-b-name"
                  name="sideBName"
                  type="text"
                  value={sideBName}
                  onChange={(e) => setSideBName(e.target.value)}
                  maxLength={50}
                  placeholder="VD: Đội đỏ"
                  required
                  aria-invalid={!!state.fieldErrors?.sideBName}
                />
                {state.fieldErrors?.sideBName ? (
                  <p className="text-sm text-destructive">
                    {state.fieldErrors.sideBName}
                  </p>
                ) : null}
              </div>
            </div>
          )}

          {/* Loại sân. */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="match-field">Loại sân</Label>
            <Select
              value={fieldType}
              onValueChange={(v) => setFieldType(v as FieldType)}
            >
              <SelectTrigger id="match-field" className="h-11 w-full">
                <SelectValue>{fieldTypeLabels[fieldType]}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                {FIELD_OPTIONS.map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Khu vực / sân (autocomplete, tùy chọn). */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="match-area">
              Khu vực / sân{" "}
              <span className="font-normal text-ink-subtle">(tùy chọn)</span>
            </Label>
            <AreaCombobox name="area" value={area} onChange={setArea} />
            {state.fieldErrors?.area ? (
              <p className="text-sm text-destructive">
                {state.fieldErrors.area}
              </p>
            ) : null}
          </div>

          {/* Ngày + giờ đá. */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="play-date">Ngày đá</Label>
              <Input
                id="play-date"
                name="playDate"
                type="date"
                required
                value={playDate}
                min={todayStr()}
                onChange={(e) => setPlayDate(e.target.value)}
                className="h-11 text-base"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="play-hour">Giờ đá</Label>
              <Input
                id="play-hour"
                name="playHour"
                type="time"
                required
                value={playHour}
                onChange={(e) => setPlayHour(e.target.value)}
                className="h-11 text-base"
              />
            </div>
          </div>
          {state.fieldErrors?.playTime ? (
            <p className="text-sm text-destructive">
              {state.fieldErrors.playTime}
            </p>
          ) : null}

          {state.error ? (
            <p className="text-sm text-destructive">{state.error}</p>
          ) : null}

          <Button
            type="submit"
            disabled={pending}
            className="h-11 w-full text-base"
          >
            {pending ? "Đang tạo..." : "Tạo trận"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function ToggleButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "h-9 rounded-md text-sm font-semibold transition-colors",
        active
          ? "bg-surface text-ink shadow-sm"
          : "text-ink-muted hover:text-ink",
      )}
    >
      {children}
    </button>
  );
}
