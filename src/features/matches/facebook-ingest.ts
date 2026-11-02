import { z } from "zod";
import {
  FieldType,
  MatchSkillTier,
  MatchType,
  SourceTeamNameSource,
} from "@/generated/prisma/enums";

const isoDateTimeSchema = z
  .string()
  .datetime({ offset: true })
  .transform((value) => new Date(value));

const normalizedPayloadSchema = z.object({
  teamName: z.string().trim().min(1).max(120).optional(),
  matchType: z.enum([
    MatchType.FIND_OPPONENT,
    MatchType.NEED_PLAYERS,
    MatchType.FIELD_AVAILABLE,
    MatchType.LOOKING_FOR_TEAM,
  ]),
  fieldType: z.enum([FieldType.F5, FieldType.F7, FieldType.F11]),
  skillTiers: z
    .array(
      z.enum([
        MatchSkillTier.VERY_WEAK,
        MatchSkillTier.WEAK,
        MatchSkillTier.BELOW_AVERAGE,
        MatchSkillTier.AVERAGE,
        MatchSkillTier.ABOVE_AVERAGE,
        MatchSkillTier.GOOD,
        MatchSkillTier.STRONG,
        MatchSkillTier.ANY,
      ]),
    )
    .min(1)
    .max(8),
  playTimes: z.array(isoDateTimeSchema).min(1).max(10),
  area: z.string().trim().min(1).max(120).optional(),
  note: z.string().trim().min(1).max(1000).optional(),
});

export const facebookIngestItemSchema = z.object({
  externalId: z.string().trim().min(1).max(191),
  groupId: z.string().trim().min(1).max(191).optional(),
  postId: z.string().trim().min(1).max(191).optional(),
  postUrl: z.string().url().max(2048),
  postedAt: isoDateTimeSchema.optional(),
  scrapedAt: isoDateTimeSchema.optional(),
  posterName: z.string().trim().min(1).max(120),
  phone: z
    .string()
    .trim()
    .min(6)
    .max(32)
    .optional()
    .transform((value) => (value ? normalizePhone(value) : undefined)),
  rawText: z.string().trim().min(1).max(10000),
  normalized: normalizedPayloadSchema,
  confidence: z.number().min(0).max(1).optional(),
});

export const facebookIngestRequestSchema = z.object({
  runId: z.string().trim().min(1).max(191).optional(),
  source: z.literal("facebook").default("facebook"),
  items: z.array(z.unknown()).min(1).max(50),
});

const TEAM_NAME_STOP_WORDS_REGEX =
  /\b(cần|can|tìm|tim|kiếm|kiem|đá|da|sân|san|kèo|keo|liên hệ|lien he|lh|ib|inbox|sđt|sdt|zalo)\b/i;

function normalizeWhitespace(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function normalizePhone(value: string): string {
  const compact = value.trim().replace(/[\s().-]/g, "");
  if (compact.startsWith("00")) {
    const digits = compact.slice(2).replace(/\D/g, "");
    return `+${digits}`.slice(0, 32);
  }
  if (compact.startsWith("+")) {
    const digits = compact.slice(1).replace(/\D/g, "");
    return `+${digits}`.slice(0, 32);
  }
  return compact.replace(/\D/g, "").slice(0, 32);
}

function cleanupTeamNameCandidate(value: string): string | null {
  const normalized = normalizeWhitespace(value)
    .replace(/^[\s:|,\-–—]+|[\s:|,\-–—]+$/g, "")
    .trim();

  if (!normalized) return null;

  const stopWordIndex = normalized.search(TEAM_NAME_STOP_WORDS_REGEX);
  const sliced =
    stopWordIndex > 0 ? normalized.slice(0, stopWordIndex).trim() : normalized;
  const cleaned = sliced.replace(/^[\s:|,\-–—]+|[\s:|,\-–—]+$/g, "").trim();

  if (cleaned.length < 2) return null;
  if (cleaned.length > 120) return cleaned.slice(0, 120).trim();
  return cleaned;
}

function sanitizePosterName(value: string): string {
  const cleaned = normalizeWhitespace(value).slice(0, 120).trim();
  return cleaned || "Người đăng bài";
}

function isLikelyPhone(value: string): boolean {
  const digitsOnly = value.replace(/\D/g, "");
  return digitsOnly.length >= 9 && digitsOnly.length <= 12;
}

function extractPhoneFromRawText(rawText: string): string | undefined {
  const candidates = rawText.match(/(?:\+?84|0)\d(?:[\s.\-]?\d){8,10}/g);
  if (!candidates || candidates.length === 0) return undefined;
  for (const candidate of candidates) {
    const normalized = normalizePhone(candidate);
    if (isLikelyPhone(normalized)) return normalized;
  }
  return undefined;
}

function extractTeamNameFromRawText(rawText: string): string | null {
  const lines = rawText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 12);

  const keywordPatterns = [
    /(?:^|\b)(?:đội|doi|clb|club|team)\s*[:\-]?\s*([^\n]{2,140})/i,
    /\bfc\s+([^\n]{2,140})/i,
  ];

  for (const line of lines) {
    for (const pattern of keywordPatterns) {
      const matched = line.match(pattern);
      if (!matched) continue;
      const candidate =
        pattern.source.startsWith("\\bfc") && matched[1]
          ? `FC ${matched[1]}`
          : matched[1];
      const cleaned = cleanupTeamNameCandidate(candidate);
      if (cleaned) return cleaned;
    }
  }

  return null;
}

export function resolveSourceTeamName(input: {
  normalizedTeamName?: string;
  rawText: string;
  posterName: string;
}): { teamName: string; source: SourceTeamNameSource } {
  const fromNormalized = input.normalizedTeamName
    ? cleanupTeamNameCandidate(input.normalizedTeamName)
    : null;
  if (fromNormalized) {
    return {
      teamName: fromNormalized,
      source: SourceTeamNameSource.NORMALIZED,
    };
  }

  const fromRawText = extractTeamNameFromRawText(input.rawText);
  if (fromRawText) {
    return {
      teamName: fromRawText,
      source: SourceTeamNameSource.RAW_TEXT,
    };
  }

  return {
    teamName: sanitizePosterName(input.posterName),
    source: SourceTeamNameSource.POSTER_NAME,
  };
}

export function resolveSourcePhone(input: {
  phone?: string;
  rawText: string;
}): string | undefined {
  if (input.phone && isLikelyPhone(input.phone)) return input.phone;
  return extractPhoneFromRawText(input.rawText);
}
