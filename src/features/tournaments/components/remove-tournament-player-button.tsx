"use client";

// Nút xóa cầu thủ khỏi participant — xác nhận qua Dialog. useTransition +
// single-arg action (removeTournamentPlayer). Mirror remove-participant-button.
import { useState, useTransition } from "react";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { removeTournamentPlayer } from "../actions";

export function RemoveTournamentPlayerButton({
  participantId,
  playerId,
  displayName,
}: {
  participantId: string;
  playerId: string;
  displayName: string;
}) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [err, setErr] = useState<string | undefined>();

  function handleRemove() {
    setErr(undefined);
    startTransition(async () => {
      const res = await removeTournamentPlayer({ participantId, playerId });
      if (res.ok) {
        setOpen(false);
      } else {
        setErr(res.error ?? "Không xóa được cầu thủ. Thử lại nhé.");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-ink-subtle hover:text-destructive"
            aria-label={`Xóa cầu thủ ${displayName}`}
          />
        }
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M3 6h18" />
          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
        </svg>
      </DialogTrigger>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Xóa cầu thủ?</DialogTitle>
          <DialogDescription>
            Xóa &ldquo;{displayName}&rdquo; khỏi đội trong giải? Có thể thêm lại sau.
          </DialogDescription>
        </DialogHeader>

        {err ? <p className="text-sm text-destructive">{err}</p> : null}

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <DialogClose render={<Button variant="outline" />}>Hủy</DialogClose>
          <Button
            variant="destructive"
            disabled={pending}
            onClick={handleRemove}
          >
            {pending ? "Đang xóa..." : "Xóa cầu thủ"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
