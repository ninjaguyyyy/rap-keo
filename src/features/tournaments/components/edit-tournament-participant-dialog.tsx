"use client";

// Dialog sửa tên đội (displayName) trong giải. Organizer, chỉ DRAFT/REJECTED.
// Mirror EditTournamentDialog (Dialog + form + useActionState + useEffect đóng).
// Chỉ đổi displayName trong giải — không động Team.name gốc. Nếu đã có fixture
// thì sideAName/sideBName cũ trong Match không tự đổi (organizer "Sinh lại lịch").
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
import { updateTournamentParticipant } from "../actions";
import type { UpdateTournamentParticipantState } from "../schemas";

const initialState: UpdateTournamentParticipantState = {};

export function EditTournamentParticipantDialog({
  participantId,
  displayName,
}: {
  participantId: string;
  displayName: string;
}) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(
    updateTournamentParticipant,
    initialState,
  );
  const [name, setName] = useState<string>(displayName);

  // Reset input khi mở lại (đề phòng participant đổi tên từ nơi khác).
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (open) setName(displayName);
  }, [open, displayName]);
  useEffect(() => {
    if (state.ok) setOpen(false);
  }, [state]);
  /* eslint-enable react-hooks/set-state-in-effect */

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-ink-subtle hover:text-ink"
            aria-label={`Sửa tên ${displayName}`}
          />
        }
      >
        <svg
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
          <path d="M12 20h9" />
          <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
        </svg>
      </DialogTrigger>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Sửa tên đội</DialogTitle>
          <DialogDescription>
            Đổi tên đội trong giải đấu này. Tên đội gốc (nếu là team hệ thống) không bị ảnh hưởng.
          </DialogDescription>
        </DialogHeader>

        <form action={formAction} className="flex flex-col gap-4">
          <input type="hidden" name="participantId" value={participantId} />

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="participant-display-name">Tên đội</Label>
            <Input
              id="participant-display-name"
              name="displayName"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={50}
              required
              aria-invalid={!!state.fieldErrors?.displayName}
            />
            {state.fieldErrors?.displayName ? (
              <p className="text-sm text-destructive">
                {state.fieldErrors.displayName}
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
            {pending ? "Đang lưu..." : "Lưu tên đội"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
