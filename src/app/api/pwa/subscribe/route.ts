import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/session";
import {
  deleteWebPushSubscriptionSchema,
  webPushSubscriptionSchema,
} from "@/features/pwa/schemas";

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const body = await request.json();
    const parsed = webPushSubscriptionSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: "INVALID_SUBSCRIPTION" }, { status: 400 });
    }

    await db.webPushSubscription.upsert({
      where: { endpoint: parsed.data.endpoint },
      update: {
        p256dh: parsed.data.keys.p256dh,
        auth: parsed.data.keys.auth,
        userId: user.id,
        userAgent: request.headers.get("user-agent"),
      },
      create: {
        endpoint: parsed.data.endpoint,
        p256dh: parsed.data.keys.p256dh,
        auth: parsed.data.keys.auth,
        userId: user.id,
        userAgent: request.headers.get("user-agent"),
      },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHENTICATED") {
      return NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 });
    }

    return NextResponse.json({ error: "SUBSCRIBE_FAILED" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const user = await requireUser();
    const body = await request.json();
    const parsed = deleteWebPushSubscriptionSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: "INVALID_SUBSCRIPTION" }, { status: 400 });
    }

    await db.webPushSubscription.deleteMany({
      where: {
        endpoint: parsed.data.endpoint,
        userId: user.id,
      },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHENTICATED") {
      return NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 });
    }

    return NextResponse.json({ error: "UNSUBSCRIBE_FAILED" }, { status: 500 });
  }
}
