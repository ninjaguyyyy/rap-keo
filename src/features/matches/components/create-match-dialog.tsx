"use client";

// Dialog tạo kèo — mở ngay trên /matches thay vì redirect sang /matches/new.
// - User đã đăng nhập: hiện form đầy đủ.
// - User chưa đăng nhập: hiện thông báo + link đăng nhập (giữ nút "Tạo kèo" luôn
//   hiện để hấp dẫn; auth do server action `createMatch` -> `requireUser()` lo).
import { useState } from "react";
import Link from "next/link";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { MatchForm } from "./match-form";

export function CreateMatchDialog({ isAuthed }: { isAuthed: boolean }) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {/* Trigger: nút "Tạo kèo" màu brand, vùng chạm h-11 (DESIGN.md). */}
      <DialogTrigger
        render={
          <Button className="h-11 shrink-0 px-4 text-sm font-semibold" />
        }
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
        Tạo kèo
      </DialogTrigger>
      {/* max-h + overflow-y-auto để form dài scroll được trên mobile. */}
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Tạo kèo mới</DialogTitle>
          <DialogDescription>
            Điền thông tin kèo để đội khác thấy và ráp kèo với bạn.
          </DialogDescription>
        </DialogHeader>

        {isAuthed ? (
          <MatchForm onSuccess={() => setOpen(false)} />
        ) : (
          <div className="flex flex-col items-center gap-3 py-6 text-center">
            {/* Icon bóng + thông báo đăng nhập. */}
            <span className="text-4xl" aria-hidden="true">⚽</span>
            <p className="text-sm text-ink-muted">
              Cần đăng nhập để tạo kèo. Đăng nhập bằng email OTP, nhanh gọn!
            </p>
            {/* render Button as Link (Base UI dùng prop `render` thay vì asChild). */}
            <Button
              className="h-11 w-full text-base"
              render={
                <Link href="/login?callbackUrl=/matches">Đăng nhập</Link>
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
