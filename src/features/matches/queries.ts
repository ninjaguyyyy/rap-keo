import "server-only";
import { db } from "@/lib/db";
import {
  FieldType,
  MatchSkillTier,
  MatchType,
} from "@/generated/prisma/enums";

// Khung giờ đá: mỗi slot là một cửa sổ thời gian trong ngày (giờ Việt Nam).
// "Sáng" gộp cả buổi sáng; các slot tối là cửa sổ 1 tiếng [HH:30, (HH+1):30).
export const TIME_SLOT_RANGES: Record<string, { start: string; end: string }> = {
  morning: { start: "05:00", end: "12:00" },
  "1630": { start: "16:30", end: "17:30" },
  "1730": { start: "17:30", end: "18:30" },
  "1830": { start: "18:30", end: "19:30" },
  "1930": { start: "19:30", end: "20:30" },
  "2030": { start: "20:30", end: "21:30" },
  "2130": { start: "21:30", end: "22:30" },
};

export type TimeSlot = keyof typeof TIME_SLOT_RANGES;

export type MatchFilters = {
  matchType?: MatchType;
  fieldType?: FieldType;
  skillTier?: MatchSkillTier;
  timeSlot?: TimeSlot;
};

// Ép chuỗi (từ query param) về enum hợp lệ, ngược lại trả undefined.
export function parseMatchFilters(params: {
  matchType?: string;
  fieldType?: string;
  skillTier?: string;
  timeSlot?: string;
}): MatchFilters {
  const matchType =
    params.matchType && params.matchType in MatchType
      ? (params.matchType as MatchType)
      : undefined;
  const fieldType =
    params.fieldType && params.fieldType in FieldType
      ? (params.fieldType as FieldType)
      : undefined;
  const skillTier =
    params.skillTier && params.skillTier in MatchSkillTier
      ? (params.skillTier as MatchSkillTier)
      : undefined;
  const timeSlot =
    params.timeSlot && params.timeSlot in TIME_SLOT_RANGES
      ? (params.timeSlot as TimeSlot)
      : undefined;
  return { matchType, fieldType, skillTier, timeSlot };
}

// Trả về id các kèo có giờ đá (theo giờ VN) rơi vào slot. Dùng raw SQL vì cần
// trích phần giờ-trong-ngày từ timestamp theo timezone.
async function matchIdsInTimeSlot(slot: TimeSlot): Promise<string[]> {
  const { start, end } = TIME_SLOT_RANGES[slot];
  const rows = await db.$queryRaw<{ id: string }[]>`
    SELECT id FROM matches
    WHERE (play_time AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Ho_Chi_Minh')::time >= ${start}::time
      AND (play_time AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Ho_Chi_Minh')::time <  ${end}::time
  `;
  return rows.map((r) => r.id);
}

/**
 * Liệt kê kèo đang mở, sắp diễn ra (playTime >= bây giờ), sắp xếp theo giờ tăng dần.
 * Hỗ trợ lọc theo loại kèo / loại sân / trình độ. (Lọc "gần" theo geo để task sau.)
 */
export async function listMatches(filters: MatchFilters = {}) {
  // Lọc khung giờ trước (raw SQL) -> ra tập id, rồi giao với các filter còn lại.
  let timeSlotIds: string[] | undefined;
  if (filters.timeSlot) {
    timeSlotIds = await matchIdsInTimeSlot(filters.timeSlot);
    if (timeSlotIds.length === 0) return [];
  }

  return db.match.findMany({
    where: {
      status: "OPEN",
      playTime: { gte: new Date() },
      ...(timeSlotIds ? { id: { in: timeSlotIds } } : {}),
      ...(filters.matchType ? { matchType: filters.matchType } : {}),
      ...(filters.fieldType ? { fieldType: filters.fieldType } : {}),
      ...(filters.skillTier ? { skillTier: filters.skillTier } : {}),
    },
    orderBy: { playTime: "asc" },
    include: {
      team: { select: { id: true, name: true } },
      field: { select: { id: true, name: true, address: true } },
      creator: { select: { id: true, name: true } },
    },
  });
}

export type MatchListItem = Awaited<ReturnType<typeof listMatches>>[number];
