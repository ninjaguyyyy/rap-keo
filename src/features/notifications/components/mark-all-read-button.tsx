"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { CheckCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { markAllNotificationsRead } from "../actions";

// Nút "Đánh dấu đã đọc" trên trang thông báo đầy đủ.
// Client island vì gọi server action + router.refresh() sau khi xong.
export function MarkAllReadButton() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const handleClick = () => {
    startTransition(async () => {
      await markAllNotificationsRead();
      router.refresh();
    });
  };

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleClick}
      disabled={pending}
      className="shrink-0 gap-1.5 text-brand"
    >
      <CheckCheck className="size-4" />
      {pending ? "Đang lưu..." : "Đánh dấu đã đọc"}
    </Button>
  );
}
