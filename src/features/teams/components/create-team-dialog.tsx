"use client";

// Dialog tạo đội — mở trên /teams. /teams đã protected nên user luôn đăng nhập.
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { TeamForm } from "./team-form";

export function CreateTeamDialog() {
  const [open, setOpen] = useState(false);

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
        Tạo đội
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Tạo đội mới</DialogTitle>
          <DialogDescription>
            Đặt tên đội và chọn trình độ để đội khác dễ ráp kèo.
          </DialogDescription>
        </DialogHeader>
        <TeamForm onSuccess={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  );
}
