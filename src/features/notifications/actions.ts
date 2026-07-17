"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/session";
import { db } from "@/lib/db";

// Đánh dấu tất cả notification của user hiện tại là đã đọc.
export async function markAllNotificationsRead() {
  const user = await requireUser();

  await db.notification.updateMany({
    where: { userId: user.id, read: false },
    data: { read: true },
  });

  revalidatePath("/notifications");
  revalidatePath("/", "layout");
}

// Đánh dấu 1 notification là đã đọc (scoped theo user để tránh đọc chéo).
export async function markNotificationRead(id: string) {
  const user = await requireUser();

  await db.notification.updateMany({
    where: { id, userId: user.id, read: false },
    data: { read: true },
  });

  revalidatePath("/notifications");
  revalidatePath("/", "layout");
}
