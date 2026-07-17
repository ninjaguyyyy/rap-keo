import { redirect } from "next/navigation";
import Link from "next/link";
import { requireUser } from "@/lib/session";
import { listNotifications } from "@/features/notifications/queries";
import { presentNotification } from "@/features/notifications/presenter";
import { MarkAllReadButton } from "@/features/notifications/components/mark-all-read-button";

// Số notification tối đa hiển thị trên trang đầy đủ.
const NOTIFICATIONS_PAGE_LIMIT = 50;

// Trang thông báo đầy đủ. Route /notifications nằm trong PROTECTED_PREFIXES
// nên middleware đã lo redirect nếu chưa đăng nhập; vẫn giữ requireUser để chắc.
export default async function NotificationsPage() {
  const user = await requireUser().catch(() => null);
  if (!user) {
    redirect("/login?callbackUrl=/notifications");
  }

  const records = await listNotifications(user.id, NOTIFICATIONS_PAGE_LIMIT);
  const items = records.map(presentNotification);
  const hasUnread = items.some((item) => item.unread);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-xl font-bold text-ink">Thông báo</h1>
          <p className="text-sm text-ink-muted">
            {items.length > 0
              ? `${items.length} thông báo gần đây`
              : "Chưa có thông báo nào"}
          </p>
        </div>
        {hasUnread ? <MarkAllReadButton /> : null}
      </div>

      {items.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-line bg-surface px-4 py-12 text-center">
          <p className="text-sm text-ink-muted">
            Chưa có thông báo nào. Khi có hoạt động ráp kèo, bạn sẽ thấy ở đây.
          </p>
        </div>
      ) : (
        <ul className="divide-y divide-line overflow-hidden rounded-xl border border-line bg-surface">
          {items.map((item) => {
            const Icon = item.icon;
            const content = (
              <div className="flex gap-3 px-4 py-3.5">
                <Icon
                  className={
                    item.unread
                      ? "mt-0.5 size-5 shrink-0 text-brand"
                      : "mt-0.5 size-5 shrink-0 text-ink-subtle"
                  }
                />
                <div className="min-w-0 flex-1">
                  <p
                    className={
                      item.unread
                        ? "text-sm font-semibold text-ink"
                        : "text-sm text-ink"
                    }
                  >
                    {item.title}
                  </p>
                  <p className="mt-0.5 text-sm text-ink-muted">
                    {item.description}
                  </p>
                  <p className="mt-1 text-xs text-ink-subtle">
                    {new Date(item.createdAt).toLocaleString("vi-VN")}
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
                    className="block transition hover:bg-muted"
                  >
                    {content}
                  </Link>
                ) : (
                  content
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
