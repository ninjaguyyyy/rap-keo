"use client";

// Dialog tạo giải — mở trên /tournaments. Yêu cầu đăng nhập (server action
// createTournament -> requireUser() lo auth). Dialog đóng + redirect sang
// /tournaments/[id] sau khi tạo xong (state.id trả về từ action).
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { TournamentForm } from "./tournament-form";
import type { TournamentFormState } from "../schemas";

export function CreateTournamentDialog({ isAuthed }: { isAuthed: boolean }) {
  const [open, setOpen] = useState(false);
  const [state, setState] = useState<TournamentFormState>({});
  const router = useRouter();

  // Tạo xong -> đóng dialog + redirect sang trang detail (URL dùng slug).
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (state.ok && state.slug) {
      setOpen(false);
      router.push(`/tournaments/${state.slug}`);
    }
  }, [state, router]);
  /* eslint-enable react-hooks/set-state-in-effect */

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={<Button className="h-11 shrink-0 px-4 text-sm font-semibold" />}
      >
        <svg
          width="16"
          height="16"
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
        Tạo giải
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Tạo giải đấu mới</DialogTitle>
          <DialogDescription>
            {isAuthed
              ? "Đặt tên giải, chọn loại sân và thể thức. Sau khi thêm đội, gửi duyệt ADMIN để lên trang công khai."
              : "Cần đăng nhập để tạo giải. Đăng nhập nhanh bằng email OTP!"}
          </DialogDescription>
        </DialogHeader>
        {isAuthed ? (
          <TournamentForm onSuccessState={setState} />
        ) : (
          <div className="flex flex-col items-center gap-3 py-6 text-center">
            <span className="text-4xl" aria-hidden="true">🏆</span>
            <p className="text-sm text-ink-muted">
              Đăng nhập để tạo giải đấu, thêm đội và lên lịch thi đấu.
            </p>
            <Button
              className="h-11 w-full text-base"
              render={
                <a href="/login?callbackUrl=/tournaments">Đăng nhập</a>
              }
            />
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="text-sm text-ink-muted hover:text-ink"
            >
              Để sau
            </button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
