import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { sendWebPushNotification } from "@/lib/web-push";
import { testPushSchema } from "@/features/pwa/schemas";

const GONE_STATUS = 410;
const NOT_FOUND_STATUS = 404;

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const body = await request.json().catch(() => ({}));
    const parsed = testPushSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: "INVALID_PAYLOAD" }, { status: 400 });
    }

    const subscriptions = await db.webPushSubscription.findMany({
      where: { userId: user.id },
      select: { id: true, endpoint: true, p256dh: true, auth: true },
    });

    if (subscriptions.length === 0) {
      return NextResponse.json({ ok: false, message: "NO_SUBSCRIPTIONS" }, { status: 404 });
    }

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
              title: parsed.data.title ?? "Ráp Kèo",
              body: parsed.data.body ?? "Thông báo test từ ứng dụng PWA.",
              url: parsed.data.url ?? "/notifications",
            },
          );

          return { ok: true as const, subscriptionId: subscription.id };
        } catch (error) {
          return {
            ok: false as const,
            subscriptionId: subscription.id,
            error,
          };
        }
      }),
    );

    const staleIds: string[] = [];
    let sent = 0;

    for (const item of result) {
      if (item.ok) {
        sent += 1;
        continue;
      }

      const statusCode =
        item.error && typeof item.error === "object" && "statusCode" in item.error
          ? Number(item.error.statusCode)
          : null;

      if (statusCode === GONE_STATUS || statusCode === NOT_FOUND_STATUS) {
        staleIds.push(item.subscriptionId);
      }
    }

    if (staleIds.length > 0) {
      await db.webPushSubscription.deleteMany({
        where: { id: { in: staleIds } },
      });
    }

    return NextResponse.json({ ok: true, sent, total: subscriptions.length });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHENTICATED") {
      return NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 });
    }

    if (error instanceof Error && error.message === "WEB_PUSH_NOT_CONFIGURED") {
      return NextResponse.json({ error: "WEB_PUSH_NOT_CONFIGURED" }, { status: 503 });
    }

    return NextResponse.json({ error: "TEST_PUSH_FAILED" }, { status: 500 });
  }
}
