import { NextResponse } from "next/server";
import { getPublicVapidKey } from "@/lib/web-push";

export async function GET() {
  const publicKey = getPublicVapidKey();
  if (!publicKey) {
    return NextResponse.json(
      { error: "WEB_PUSH_NOT_CONFIGURED" },
      { status: 503 },
    );
  }

  return NextResponse.json({ publicKey });
}
