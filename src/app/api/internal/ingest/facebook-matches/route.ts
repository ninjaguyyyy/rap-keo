import { NextResponse } from "next/server";
import { Prisma } from "@/generated/prisma/client";
import { MatchSourcePlatform, UserRole } from "@/generated/prisma/enums";
import { db } from "@/lib/db";
import {
  facebookIngestItemSchema,
  facebookIngestRequestSchema,
  resolveSourceTeamName,
} from "@/features/matches/facebook-ingest";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type IngestResultStatus =
  | "CREATED_MATCH"
  | "UPDATED_MATCH"
  | "REJECTED";

type IngestResult = {
  externalId?: string;
  status: IngestResultStatus;
  matchId?: string;
  teamNameSource?: string;
  error?: string;
};

function isAuthorized(request: Request): {
  ok: boolean;
  missingConfig: boolean;
} {
  const token = process.env.CRAWLER_INGEST_TOKEN;
  if (!token || token.trim() === "") {
    return { ok: false, missingConfig: true };
  }

  const authHeader = request.headers.get("authorization");
  return {
    ok: authHeader === `Bearer ${token}`,
    missingConfig: false,
  };
}

export async function POST(request: Request) {
  const auth = isAuthorized(request);

  if (auth.missingConfig) {
    return NextResponse.json(
      { error: "INGEST_AUTH_NOT_CONFIGURED" },
      { status: 500 },
    );
  }

  if (!auth.ok) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const creator = await db.user.findFirst({
    where: { role: UserRole.ADMIN },
    select: { id: true },
    orderBy: { createdAt: "asc" },
  });

  if (!creator) {
    return NextResponse.json(
      { error: "ADMIN_USER_NOT_FOUND" },
      { status: 500 },
    );
  }

  const body = await request.json().catch(() => null);
  const parsedRequest = facebookIngestRequestSchema.safeParse(body);
  if (!parsedRequest.success) {
    return NextResponse.json({ error: "INVALID_PAYLOAD" }, { status: 400 });
  }

  const now = new Date();
  let created = 0;
  let updated = 0;
  let rejected = 0;
  const results: IngestResult[] = [];

  for (const item of parsedRequest.data.items) {
    const parsedItem = facebookIngestItemSchema.safeParse(item);
    if (!parsedItem.success) {
      rejected += 1;
      results.push({
        status: "REJECTED",
        error: "INVALID_ITEM",
      });
      continue;
    }

    const payload = parsedItem.data;
    const resolvedTeam = resolveSourceTeamName({
      normalizedTeamName: payload.normalized.teamName,
      rawText: payload.rawText,
      posterName: payload.posterName,
    });

    try {
      const createdMatch = await db.match.create({
        data: {
          creatorId: creator.id,
          sourcePlatform: MatchSourcePlatform.FACEBOOK,
          sourceExternalId: payload.externalId,
          sourcePostUrl: payload.postUrl,
          sourcePosterName: payload.posterName,
          sourceTeamName: resolvedTeam.teamName,
          sourceTeamNameSource: resolvedTeam.source,
          sourcePostedAt: payload.postedAt ?? null,
          sourceScrapedAt: payload.scrapedAt ?? now,
          matchType: payload.normalized.matchType,
          fieldType: payload.normalized.fieldType,
          skillTiers: payload.normalized.skillTiers,
          playTimes: payload.normalized.playTimes,
          area: payload.normalized.area ?? null,
          note: payload.normalized.note ?? null,
          status: "OPEN",
        },
        select: { id: true },
      });

      created += 1;
      results.push({
        externalId: payload.externalId,
        status: "CREATED_MATCH",
        matchId: createdMatch.id,
        teamNameSource: resolvedTeam.source,
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        const existingMatch = await db.match.update({
          where: {
            sourcePlatform_sourceExternalId: {
              sourcePlatform: MatchSourcePlatform.FACEBOOK,
              sourceExternalId: payload.externalId,
            },
          },
          data: {
            sourcePostUrl: payload.postUrl,
            sourcePosterName: payload.posterName,
            sourceTeamName: resolvedTeam.teamName,
            sourceTeamNameSource: resolvedTeam.source,
            sourcePostedAt: payload.postedAt ?? null,
            sourceScrapedAt: payload.scrapedAt ?? now,
          },
          select: { id: true },
        });

        updated += 1;
        results.push({
          externalId: payload.externalId,
          status: "UPDATED_MATCH",
          matchId: existingMatch.id,
          teamNameSource: resolvedTeam.source,
        });
        continue;
      }

      rejected += 1;
      results.push({
        externalId: payload.externalId,
        status: "REJECTED",
        error: "CREATE_FAILED",
      });
      console.error("[facebook-ingest] create match error", {
        externalId: payload.externalId,
        error,
      });
    }
  }

  return NextResponse.json({
    ok: true,
    runId: parsedRequest.data.runId ?? null,
    received: parsedRequest.data.items.length,
    created,
    updated,
    rejected,
    results,
  });
}
