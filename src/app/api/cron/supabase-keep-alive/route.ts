import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_ATTEMPTS = 3;
const RETRY_DELAY_MS = 1500;

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isAuthorized(request: Request): {
  ok: boolean;
  missingConfig: boolean;
} {
  const authHeader = request.headers.get("authorization");
  const url = new URL(request.url);
  const queryToken = url.searchParams.get("token");

  const cronSecret = process.env.CRON_SECRET;
  const keepAliveToken = process.env.SUPABASE_KEEP_ALIVE_TOKEN;
  const hasConfiguredSecret = Boolean(cronSecret || keepAliveToken);

  if (!hasConfiguredSecret) {
    return {
      ok: process.env.NODE_ENV !== "production",
      missingConfig: process.env.NODE_ENV === "production",
    };
  }

  const validCronSecret = cronSecret
    ? authHeader === `Bearer ${cronSecret}`
    : false;
  const validKeepAliveToken = keepAliveToken
    ? queryToken === keepAliveToken
    : false;

  return {
    ok: validCronSecret || validKeepAliveToken,
    missingConfig: false,
  };
}

export async function GET(request: Request) {
  const auth = isAuthorized(request);
  if (auth.missingConfig) {
    return NextResponse.json(
      { error: "KEEP_ALIVE_AUTH_NOT_CONFIGURED" },
      { status: 500 },
    );
  }

  if (!auth.ok) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const startedAt = Date.now();

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    try {
      await db.$queryRaw`SELECT 1`;
      return NextResponse.json({
        ok: true,
        attempts: attempt,
        durationMs: Date.now() - startedAt,
      });
    } catch (error) {
      console.error("Supabase keep-alive ping failed", {
        attempt,
        error,
      });

      if (attempt === MAX_ATTEMPTS) {
        return NextResponse.json(
          {
            ok: false,
            error: "DATABASE_UNAVAILABLE",
            attempts: attempt,
            durationMs: Date.now() - startedAt,
          },
          { status: 503 },
        );
      }

      await wait(RETRY_DELAY_MS);
    }
  }

  return NextResponse.json(
    { ok: false, error: "UNKNOWN_KEEP_ALIVE_ERROR" },
    { status: 500 },
  );
}
