"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import {
  markAllNotificationsRead,
  markNotificationRead,
} from "../actions";
import { presentNotification } from "../presenter";
import type { NotificationRecord } from "../queries";

type NotificationBellProps = {
  initialItems: NotificationRecord[];
  initialUnread: number;
};

export function NotificationBell({
  initialItems,
  initialUnread,
}: NotificationBellProps) {
  const router = useRouter();
  const [items, setItems] = useState<NotificationRecord[]>(initialItems);
  const [unread, setUnread] = useState<number>(initialUnread);
  const [open, setOpen] = useState(false);
  const [, startTransition] = useTransition();

  // Mở dropdown -> đánh dấu tất cả đã đọc (best-effort, không chặn UI).
  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen);
    if (!nextOpen || unread === 0) return;

    const prevItems = items;
    setItems((cur) => cur.map((it) => ({ ...it, read: true })));
    setUnread(0);

    startTransition(async () => {
      try {
        await markAllNotificationsRead();
        router.refresh();
      } catch {
        // Rollback nếu server action fail để badge không "dối" user.
        setItems(prevItems);
        setUnread(initialUnread);
      }
    });
  };

  const handleItemClick = (id: string) => {
    setItems((cur) =>
      cur.map((it) => (it.id === id ? { ...it, read: true } : it)),
    );
    setUnread((c) => Math.max(0, c - 1));
    startTransition(() => {
      markNotificationRead(id).catch(() => undefined);
    });
  };

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger
        render={
          <button
            type="button"
            aria-label="Thông báo"
            className="relative inline-flex h-9 w-9 items-center justify-center rounded-full text-white/90 transition hover:bg-white/10 hover:text-white"
          >
            <Bell className="size-5" />
            {unread > 0 ? (
              <span className="absolute top-1 right-1 inline-flex min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold leading-none text-destructive-foreground">
                {unread > 9 ? "9+" : unread}
              </span>
            ) : null}
          </button>
        }
      />
      <PopoverContent
        align="end"
        sideOffset={8}
        className="w-[min(360px,calc(100vw-24px))] p-0"
      >
        <div className="flex items-center justify-between border-b border-line px-3 py-2.5">
          <p className="text-sm font-semibold text-ink">Thông báo</p>
          <span className="text-xs text-ink-muted">
            {unread > 0 ? `${unread} chưa đọc` : "Đã đọc hết"}
          </span>
        </div>

        {items.length === 0 ? (
          <div className="px-4 py-8 text-center text-sm text-ink-muted">
            Chưa có thông báo nào.
          </div>
        ) : (
          <ul className="max-h-80 divide-y divide-line overflow-y-auto">
            {items.map((record) => {
              const item = presentNotification(record);
              const Icon = item.icon;
              const content = (
                <div className="flex gap-2.5 px-3 py-2.5">
                  <Icon
                    className={cn(
                      "mt-0.5 size-4 shrink-0",
                      item.unread ? "text-brand" : "text-ink-subtle",
                    )}
                  />
                  <div className="min-w-0 flex-1">
                    <p
                      className={cn(
                        "truncate text-sm",
                        item.unread ? "font-semibold text-ink" : "text-ink",
                      )}
                    >
                      {item.title}
                    </p>
                    <p className="line-clamp-2 text-xs text-ink-muted">
                      {item.description}
                    </p>
                    <p className="mt-0.5 text-[11px] text-ink-subtle">
                      {formatRelative(item.createdAt)}
                    </p>
                  </div>
                  {item.unread ? (
                    <span
                      aria-hidden
                      className="mt-1.5 size-2 shrink-0 rounded-full bg-brand"
                    />
                  ) : null}
                </div>
              );
              return (
                <li key={item.id}>
                  {item.href ? (
                    <Link
                      href={item.href}
                      onClick={() => handleItemClick(item.id)}
                      className="block transition hover:bg-muted"
                    >
                      {content}
                    </Link>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleItemClick(item.id)}
                      className="block w-full text-left transition hover:bg-muted"
                    >
                      {content}
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        )}

        <div className="border-t border-line p-2">
          <Button
            variant="ghost"
            size="sm"
            render={
              <Link
                href="/notifications"
                onClick={() => setOpen(false)}
                className="w-full justify-center"
              >
                Xem tất cả
              </Link>
            }
          />
        </div>
      </PopoverContent>
    </Popover>
  );
}

// Format kiểu "vừa xong" / "5 phút trước" / "2 giờ trước" / "Hôm qua" / ngày tháng.
function formatRelative(iso: string): string {
  const now = Date.now();
  const then = new Date(iso).getTime();
  const diffMs = now - then;
  if (diffMs < 0 || Number.isNaN(then)) return iso;

  const minute = 60_000;
  const hour = 60 * minute;
  const day = 24 * hour;

  if (diffMs < minute) return "Vừa xong";
  if (diffMs < hour) return `${Math.floor(diffMs / minute)} phút trước`;
  if (diffMs < day) return `${Math.floor(diffMs / hour)} giờ trước`;
  if (diffMs < 2 * day) return "Hôm qua";

  return new Date(iso).toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}
