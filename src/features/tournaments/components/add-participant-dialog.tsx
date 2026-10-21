"use client";

// Dialog thêm đội vào giải — 2 chế độ: "Chọn đội" (team có sẵn trong hệ thống)
// hoặc "Nhập tên" (team lẻ, chỉ tên). Mirror add-member-dialog.tsx.
// Mode "team": Combobox search team theo tên (server query qua prop list sẵn).
// Mode "name": Input text displayName.
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
import { addTournamentParticipant } from "../actions";
import type { AddParticipantState } from "../schemas";

const initialState: AddParticipantState = {};

type Mode = "team" | "name";

type TeamOption = {
  id: string;
  name: string;
  skillTier: string;
};

export function AddParticipantDialog({
  tournamentId,
  teamOptions,
}: {
  tournamentId: string;
  // List team có sẵn (search đã lọc limit 20 từ server). Truyền vào để dialog
  // không cần fetch client-side (giữ server-only cho queries).
  teamOptions: TeamOption[];
}) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(
    addTournamentParticipant,
    initialState,
  );
  const [mode, setMode] = useState<Mode>("team");
  const [teamId, setTeamId] = useState<string>("");
  const [displayName, setDisplayName] = useState<string>("");

  // Thêm xong -> đóng dialog + reset. revalidatePath làm mới list.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (state.ok) {
      setOpen(false);
      setTeamId("");
      setDisplayName("");
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
        Thêm đội
      </DialogTrigger>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Thêm đội vào giải</DialogTitle>
          <DialogDescription>
            Chọn đội có sẵn trong hệ thống, hoặc nhập tên đội lẻ (đội ngoài).
          </DialogDescription>
        </DialogHeader>

        <form action={formAction} className="flex flex-col gap-4">
          <input type="hidden" name="tournamentId" value={tournamentId} />
          <input type="hidden" name="mode" value={mode} />

          {/* Segmented toggle 2 chế độ. */}
          <div
            role="group"
            aria-label="Cách thêm đội"
            className="grid grid-cols-2 gap-1 rounded-lg bg-surface-muted p-1"
          >
            <ToggleButton active={mode === "team"} onClick={() => setMode("team")}>
              Chọn đội
            </ToggleButton>
            <ToggleButton active={mode === "name"} onClick={() => setMode("name")}>
              Nhập tên
            </ToggleButton>
          </div>

          {mode === "team" ? (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="participant-team">Đội</Label>
              <input type="hidden" name="teamId" value={teamId} />
              <Select value={teamId} onValueChange={(v) => setTeamId(String(v))}>
                <SelectTrigger id="participant-team" className="h-11 w-full">
                  <SelectValue placeholder="Chọn đội">
                    {teamOptions.find((t) => t.id === teamId)?.name ?? ""}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {teamOptions.length === 0 ? (
                    <SelectItem value="_none" disabled>
                      Không có đội phù hợp
                    </SelectItem>
                  ) : (
                    teamOptions.map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.name}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              {state.fieldErrors?.teamId ? (
                <p className="text-sm text-destructive">
                  {state.fieldErrors.teamId}
                </p>
              ) : null}
            </div>
          ) : (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="participant-name">Tên đội</Label>
              <Input
                id="participant-name"
                name="displayName"
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                maxLength={50}
                placeholder="VD: FC Sấm Sét"
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

          {state.error ? (
            <p className="text-sm text-destructive">{state.error}</p>
          ) : null}

          <Button
            type="submit"
            disabled={pending}
            className="h-11 w-full text-base"
          >
            {pending ? "Đang thêm..." : "Thêm vào giải"}
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
