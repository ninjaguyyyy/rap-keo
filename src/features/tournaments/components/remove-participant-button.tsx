"use client";

// Nút xóa đội khỏi giải — xác nhận qua Dialog. useTransition + single-arg action
// (removeTournamentParticipant). Lỗi giữ trong dialog. Mirror RemoveMemberButton.
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
import { removeTournamentParticipant } from "../actions";

export function RemoveParticipantButton({
  tournamentId,
  participantId,
  displayName,
}: {
  tournamentId: string;
  participantId: string;
  displayName: string;
}) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [err, setErr] = useState<string | undefined>();

  function handleRemove() {
    setErr(undefined);
    startTransition(async () => {
      const res = await removeTournamentParticipant({
        tournamentId,
        participantId,
      });
      if (res.ok) {
        setOpen(false);
      } else {
        setErr(res.error ?? "Không xóa được đội. Thử lại nhé.");
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
            className="h-8 w-8 text-ink-subtle hover:text-destructive"
            aria-label={`Xóa ${displayName} khỏi giải`}
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
          <path d="M3 6h18" />
          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
        </svg>
      </DialogTrigger>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Xóa đội khỏi giải?</DialogTitle>
          <DialogDescription>
            Xóa &ldquo;{displayName}&rdquo; khỏi giải? Có thể thêm lại sau.
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
            {pending ? "Đang xóa..." : "Xóa đội"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
