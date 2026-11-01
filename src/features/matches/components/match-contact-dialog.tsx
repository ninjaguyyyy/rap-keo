"use client";

import { LinkIcon, PhoneIcon } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

type MatchContactDialogProps = Readonly<{
  phone: string;
  fbLink: string;
}>;

export function MatchContactDialog({
  phone,
  fbLink,
}: MatchContactDialogProps) {
  return (
    <Dialog>
      <DialogTrigger
        render={(
          <button
            type="button"
            className="inline-flex h-7 items-center rounded-[8px] border border-brand/25 bg-white px-2.5 text-xs font-semibold text-brand"
          />
        )}
      >
        Nhận kèo
      </DialogTrigger>

      <DialogContent className="max-w-88 rounded-2xl p-4 sm:p-5">
        <DialogHeader className="gap-1.5">
          <DialogTitle className="text-[17px] font-extrabold text-ink">Thông tin liên lạc</DialogTitle>
          <DialogDescription className="text-xs text-ink-muted">
            Liên hệ đội chủ kèo để chốt nhanh.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <div className="flex items-center justify-between rounded-xl border border-line bg-surface p-3">
            <div className="flex items-center gap-2">
              <span className="inline-flex size-7 items-center justify-center rounded-full bg-brand-soft text-brand">
                <PhoneIcon className="size-4" />
              </span>
              <span className="text-xs font-semibold text-ink-muted">Số điện thoại</span>
            </div>
            <a href={`tel:${phone}`} className="text-sm font-bold text-brand hover:underline">
              {phone}
            </a>
          </div>

          <div className="flex items-center justify-between rounded-xl border border-line bg-surface p-3">
            <div className="flex items-center gap-2">
              <span className="inline-flex size-7 items-center justify-center rounded-full bg-brand-soft text-brand">
                <LinkIcon className="size-4" />
              </span>
              <span className="text-xs font-semibold text-ink-muted">Fb link</span>
            </div>
            <a
              href={fbLink}
              target="_blank"
              rel="noreferrer"
              className="max-w-40 truncate text-sm font-bold text-brand hover:underline"
            >
              Mở Facebook
            </a>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}