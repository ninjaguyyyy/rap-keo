"use client";

// Nút xóa đội — xác nhận qua Dialog (mobile-friendly hơn window.confirm).
// Gọi deleteTeam trong useTransition. Lỗi hiển thị ngay trong dialog, giữ mở.
// onDeleted: callback sau khi xóa thành công (vd detail page -> router.push).
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
import { deleteTeam } from "../actions";

export function DeleteTeamButton({
  team,
  onDeleted,
}: {
  team: { id: string; name: string };
  onDeleted?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [err, setErr] = useState<string | undefined>();

  function handleDelete() {
    setErr(undefined);
    startTransition(async () => {
      const res = await deleteTeam(team.id);
      if (res.ok) {
        setOpen(false);
        onDeleted?.();
      } else {
        setErr(res.error ?? "Không xóa được đội. Thử lại nhé.");
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
        Xóa
      </DialogTrigger>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Xóa đội?</DialogTitle>
          <DialogDescription>
            Xóa đội &ldquo;{team.name}&rdquo;? Hành động này không thể hoàn tác.
          </DialogDescription>
        </DialogHeader>

        {err ? <p className="text-sm text-destructive">{err}</p> : null}

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <DialogClose render={<Button variant="outline" />}>Hủy</DialogClose>
          <Button
            variant="destructive"
            disabled={pending}
            onClick={handleDelete}
          >
            {pending ? "Đang xóa..." : "Xóa đội"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
