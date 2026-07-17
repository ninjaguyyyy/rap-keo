import "server-only";
import { db } from "@/lib/db";

// Số notification hiển thị trong dropdown header (bản rút gọn).
export const NOTIFICATION_DROPDOWN_LIMIT = 8;

export type NotificationRecord = {
  id: string;
  type: string;
  payload: unknown;
  read: boolean;
  createdAt: string;
};

// Lấy N notification mới nhất của user (mặc định cho dropdown header).
export async function listNotifications(
  userId: string,
  limit = NOTIFICATION_DROPDOWN_LIMIT,
): Promise<NotificationRecord[]> {
  const rows = await db.notification.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: limit,
  });

  return rows.map((row) => ({
    id: row.id,
    type: row.type,
    payload: row.payload,
    read: row.read,
    createdAt: row.createdAt.toISOString(),
  }));
}

// Đếm số notification chưa đọc — dùng cho badge số trên chuông.
export async function countUnreadNotifications(userId: string): Promise<number> {
  return db.notification.count({
    where: { userId, read: false },
  });
}
