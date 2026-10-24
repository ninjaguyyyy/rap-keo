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
import { deleteMatchByOwner } from "../actions";

export function DeleteMatchButton({
  matchId,
  afterDeleteHref,
}: {
  matchId: string;
  afterDeleteHref: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | undefined>();

  function handleDelete() {
    setError(undefined);
    startTransition(async () => {
      const result = await deleteMatchByOwner(matchId);
      if (result.ok) {
        setOpen(false);
        router.push(afterDeleteHref);
        router.refresh();
      } else {
        setError(result.error ?? "Không xóa được trận. Thử lại nhé.");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="destructive" size="sm" />}>
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
        Xóa trận
      </DialogTrigger>

      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Xóa trận này?</DialogTitle>
          <DialogDescription>
            Hành động này sẽ xóa trận và toàn bộ dữ liệu thống kê/vote liên quan.
          </DialogDescription>
        </DialogHeader>

        {error ? <p className="text-sm text-destructive">{error}</p> : null}

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <DialogClose render={<Button variant="outline" />}>Hủy</DialogClose>
          <Button
            variant="destructive"
            disabled={pending}
            onClick={handleDelete}
          >
            {pending ? "Đang xóa..." : "Xóa trận"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
