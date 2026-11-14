"use server";

import { revalidatePath } from "next/cache";
import { NotificationType, UserRole } from "@/generated/prisma/enums";
import { publishNotificationEvent } from "@/features/notifications/sse-bus";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { sendWebPushNotification } from "@/lib/web-push";

const GONE_STATUS = 410;
const NOT_FOUND_STATUS = 404;

type PublicMatchFlowAction = "CONFIRM" | "REPORT";

type PublicMatchFlowActionState = {
  ok?: true;
  mode?: "ADMIN_UPDATED" | "NOTIFIED_ADMIN";
  message?: string;
  error?: string;
};

type MatchFlowReviewPayload = {
  kind: "MATCH_FLOW_REVIEW";
  matchId: string;
  action: PublicMatchFlowAction;
  statusAtRequest: string;
  fromUserId: string;
  fromUserName: string | null;
  requestedAt: string;
};

function actionLabel(action: PublicMatchFlowAction): string {
  return action === "CONFIRM" ? "Xác nhận đã chốt" : "Report đội đã có kèo";
}

function buildPushBody(action: PublicMatchFlowAction, fromUserName: string | null): string {
  const actor = fromUserName?.trim() || "Một người dùng";
  return `${actor} vừa bấm "${actionLabel(action)}".`;
}

async function sendAdminPushNotifications(
  adminIds: string[],
  title: string,
  body: string,
  url: string,
): Promise<void> {
  const subscriptions = await db.webPushSubscription.findMany({
    where: { userId: { in: adminIds } },
    select: { id: true, endpoint: true, p256dh: true, auth: true },
  });

  if (subscriptions.length === 0) return;

  const result = await Promise.all(
    subscriptions.map(async (subscription) => {
      try {
        await sendWebPushNotification(
          {
            endpoint: subscription.endpoint,
            keys: {
              p256dh: subscription.p256dh,
              auth: subscription.auth,
            },
          },
          {
            title,
            body,
            url,
          },
        );
        return { ok: true as const };
      } catch (error) {
        return { ok: false as const, subscriptionId: subscription.id, error };
      }
    }),
  );

  const staleIds: string[] = [];

  for (const item of result) {
    if (item.ok) continue;

    const statusCode =
      item.error && typeof item.error === "object" && "statusCode" in item.error
        ? Number(item.error.statusCode)
        : null;

    if (statusCode === GONE_STATUS || statusCode === NOT_FOUND_STATUS) {
      staleIds.push(item.subscriptionId);
    }
  }

  if (staleIds.length > 0) {
    await db.webPushSubscription.deleteMany({ where: { id: { in: staleIds } } });
  }
}

export async function submitPublicMatchFlowAction(
  matchId: string,
  action: PublicMatchFlowAction,
): Promise<PublicMatchFlowActionState> {
  let user;
  try {
    user = await requireUser();
  } catch {
    return { error: "Bạn cần đăng nhập để dùng thao tác này." };
  }

  const match = await db.match.findUnique({
    where: { id: matchId },
    select: { id: true, status: true },
  });
  if (!match) return { error: "Kèo không tồn tại." };

  if (user.role === UserRole.ADMIN) {
    if (match.status !== "MATCHED" && match.status !== "CONFIRMED") {
      await db.match.update({
        where: { id: match.id },
        data: { status: "MATCHED" },
      });
    }

    revalidatePath("/matches");
    revalidatePath(`/matches/${match.id}`);

    return {
      ok: true,
      mode: "ADMIN_UPDATED",
      message: "Admin đã cập nhật trạng thái kèo thành Đã ghép.",
    };
  }

  const admins = await db.user.findMany({
    where: { role: UserRole.ADMIN },
    select: { id: true },
  });
  if (admins.length === 0) {
    return { error: "Hiện chưa có Admin để nhận yêu cầu này." };
  }

  const payload: MatchFlowReviewPayload = {
    kind: "MATCH_FLOW_REVIEW",
    matchId: match.id,
    action,
    statusAtRequest: match.status,
    fromUserId: user.id,
    fromUserName: user.name ?? null,
    requestedAt: new Date().toISOString(),
  };

  const createdNotifications = await Promise.all(
    admins.map((admin) =>
      db.notification.create({
        data: {
          userId: admin.id,
          type: NotificationType.MATCH_REQUEST,
          payload,
        },
      }),
    ),
  );

  for (const notification of createdNotifications) {
    publishNotificationEvent({
      id: notification.id,
      userId: notification.userId,
      type: notification.type,
      payload: notification.payload,
      read: notification.read,
      createdAt: notification.createdAt.toISOString(),
    });
  }

  try {
    await sendAdminPushNotifications(
      admins.map((admin) => admin.id),
      "Phủi League · Cần duyệt kèo",
      buildPushBody(action, user.name ?? null),
      `/matches/${match.id}`,
    );
  } catch (error) {
    // DB notification vẫn đã lưu; push là best-effort.
    console.error("[submitPublicMatchFlowAction] push notify failed:", error);
  }

  revalidatePath("/notifications");
  revalidatePath("/", "layout");

  return {
    ok: true,
    mode: "NOTIFIED_ADMIN",
    message: "Đã gửi yêu cầu tới Admin để xử lý kèo.",
  };
}
