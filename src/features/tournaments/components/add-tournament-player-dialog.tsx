"use client";

// Dialog thêm cầu thủ vào 1 participant — 2 chế độ: "Chọn từ đội" (TeamMember có
// sẵn, chỉ khi participant có teamId) hoặc "Nhập tên" (cầu thủ ngoài).
// jerseyNumber tùy chọn (1-99). Mirror add-participant-dialog.tsx.
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
import { addTournamentPlayer } from "../actions";
import type { AddTournamentPlayerState } from "../schemas";

const initialState: AddTournamentPlayerState = {};

type Mode = "member" | "name";

// TeamMember option để chọn (pre-fetch từ server). userId để gắn + exclude.
type MemberOption = {
  userId: string;
  name: string;
};

export function AddTournamentPlayerDialog({
  participantId,
  // participant có teamId -> có mode "member". null/undefined -> chỉ "name".
  hasTeam,
  memberOptions,
  // userId của các player đã có trong participant -> exclude khỏi select (filter
  // client-side, tránh trùng).
  existingPlayerUserIds,
}: {
  participantId: string;
  hasTeam: boolean;
  memberOptions: MemberOption[];
  existingPlayerUserIds: string[];
}) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(
    addTournamentPlayer,
    initialState,
  );
  // Default mode: "member" nếu có team, ngược lại "name".
  const [mode, setMode] = useState<Mode>(hasTeam ? "member" : "name");
  const [userId, setUserId] = useState<string>("");
  const [displayName, setDisplayName] = useState<string>("");
  const [jerseyNumber, setJerseyNumber] = useState<string>("");

  // Thêm xong -> đóng dialog + reset. revalidatePath làm mới list.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (state.ok) {
      setOpen(false);
      setUserId("");
      setDisplayName("");
      setJerseyNumber("");
    }
  }, [state]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const excludeSet = new Set(existingPlayerUserIds);
  const availableMembers = memberOptions.filter(
    (m) => !excludeSet.has(m.userId),
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm" className="h-8 px-2.5 text-xs" />}>
        <svg
          width="14"
          height="14"
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
        Thêm cầu thủ
      </DialogTrigger>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Thêm cầu thủ</DialogTitle>
          <DialogDescription>
            Chọn từ đội (nếu là team hệ thống) hoặc nhập tên cầu thủ ngoài.
          </DialogDescription>
        </DialogHeader>

        <form action={formAction} className="flex flex-col gap-4">
          <input type="hidden" name="participantId" value={participantId} />
          <input type="hidden" name="mode" value={mode} />

          {/* Segmented toggle 2 chế độ — ẩn nếu participant không có team. */}
          {hasTeam ? (
            <div
              role="group"
              aria-label="Cách thêm cầu thủ"
              className="grid grid-cols-2 gap-1 rounded-lg bg-surface-muted p-1"
            >
              <ToggleButton
                active={mode === "member"}
                onClick={() => setMode("member")}
              >
                Chọn từ đội
              </ToggleButton>
              <ToggleButton
                active={mode === "name"}
                onClick={() => setMode("name")}
              >
                Nhập tên
              </ToggleButton>
            </div>
          ) : null}

          {mode === "member" ? (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="player-member">Cầu thủ</Label>
              <input type="hidden" name="userId" value={userId} />
              <Select value={userId} onValueChange={(v) => setUserId(String(v))}>
                <SelectTrigger id="player-member" className="h-11 w-full">
                  <SelectValue placeholder="Chọn cầu thủ">
                    {availableMembers.find((m) => m.userId === userId)?.name ?? ""}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {availableMembers.length === 0 ? (
                    <SelectItem value="_none" disabled>
                      Không còn cầu thủ để chọn
                    </SelectItem>
                  ) : (
                    availableMembers.map((m) => (
                      <SelectItem key={m.userId} value={m.userId}>
                        {m.name}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              {state.fieldErrors?.userId ? (
                <p className="text-sm text-destructive">
                  {state.fieldErrors.userId}
                </p>
              ) : null}
            </div>
          ) : (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="player-name">Tên cầu thủ</Label>
              <Input
                id="player-name"
                name="displayName"
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                maxLength={50}
                placeholder="VD: Văn A"
                required
                aria-invalid={!!state.fieldErrors?.displayName}
              />
              {state.fieldErrors?.displayName ? (
                <p className="text-sm text-destructive">
                  {state.fieldErrors.displayName}
                </p>
              ) : null}
            </div>
          )}

          {/* Số áo (tùy chọn) — dùng chung cả 2 mode. */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="player-jersey">Số áo (tùy chọn)</Label>
            <Input
              id="player-jersey"
              name="jerseyNumber"
              type="number"
              min={1}
              max={99}
              inputMode="numeric"
              value={jerseyNumber}
              onChange={(e) => setJerseyNumber(e.target.value)}
              placeholder="1-99"
              aria-invalid={!!state.fieldErrors?.jerseyNumber}
            />
            {state.fieldErrors?.jerseyNumber ? (
              <p className="text-sm text-destructive">
                {state.fieldErrors.jerseyNumber}
              </p>
            ) : null}
          </div>

          {state.error ? (
            <p className="text-sm text-destructive">{state.error}</p>
          ) : null}

          <Button
            type="submit"
            disabled={pending}
            className="h-11 w-full text-base"
          >
            {pending ? "Đang thêm..." : "Thêm cầu thủ"}
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
