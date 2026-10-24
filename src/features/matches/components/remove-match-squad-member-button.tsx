"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
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
import { removeMatchSquadMember } from "../actions";

export function RemoveMatchSquadMemberButton({
  matchId,
  userId,
  memberName,
}: {
  matchId: string;
  userId: string;
  memberName: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | undefined>();

  function handleRemove() {
    setError(undefined);
    startTransition(async () => {
      const result = await removeMatchSquadMember(matchId, userId);
      if (result.ok) {
        setOpen(false);
        router.refresh();
      } else {
        setError(result.error ?? "Không cập nhật được đội hình. Thử lại nhé.");
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
            aria-label={`Xóa ${memberName} khỏi đội hình trận`}
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
          <DialogTitle>Loại khỏi đội hình trận?</DialogTitle>
          <DialogDescription>
            Xóa &ldquo;{memberName}&rdquo; khỏi danh sách cầu thủ ra sân của trận
            này.
          </DialogDescription>
        </DialogHeader>

        {error ? <p className="text-sm text-destructive">{error}</p> : null}

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <DialogClose render={<Button variant="outline" />}>Hủy</DialogClose>
          <Button
            variant="destructive"
            disabled={pending}
            onClick={handleRemove}
          >
            {pending ? "Đang cập nhật..." : "Loại khỏi đội hình"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
