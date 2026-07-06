import "server-only";
import { db } from "@/lib/db";
import {
  FieldType,
  MatchSkillTier,
  MatchType,
} from "@/generated/prisma/enums";

// Khung giờ đá: mỗi slot là một cửa sổ thời gian trong ngày (giờ Việt Nam).
// Sáng tách thành các slot 30 phút (05:00–07:00); tối là cửa sổ 1 tiếng [HH:30, (HH+1):30).
export const TIME_SLOT_RANGES: Record<string, { start: string; end: string }> = {
  "0500": { start: "05:00", end: "05:30" },
  "0530": { start: "05:30", end: "06:00" },
  "0600": { start: "06:00", end: "06:30" },
  "0630": { start: "06:30", end: "07:00" },
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
  skillTiers?: MatchSkillTier[];
  timeSlots?: TimeSlot[];
};

// Ép chuỗi (từ query param) về enum hợp lệ, ngược lại trả undefined.
export function parseMatchFilters(params: {
  matchType?: string;
  fieldType?: string;
  skillTier?: string | string[];
  timeSlot?: string | string[];
}): MatchFilters {
  const matchType =
    params.matchType && params.matchType in MatchType
      ? (params.matchType as MatchType)
      : undefined;
  const fieldType =
    params.fieldType && params.fieldType in FieldType
      ? (params.fieldType as FieldType)
      : undefined;
  // skillTier có thể là chuỗi đơn hoặc mảng (nhiều giá trị ?skillTier=A&skillTier=B).
  // Lọc bỏ giá trị không hợp lệ; giữ thứ tự chọn của user.
  const rawSkill = Array.isArray(params.skillTier)
    ? params.skillTier
    : params.skillTier
      ? [params.skillTier]
      : [];
  const skillTiers = rawSkill
    .filter((s): s is MatchSkillTier => s in MatchSkillTier)
    .filter((s, i, arr) => arr.indexOf(s) === i);
  // timeSlot cũng multi-value (lặp lại ?timeSlot=1830&timeSlot=1930).
  const rawTime = Array.isArray(params.timeSlot)
    ? params.timeSlot
    : params.timeSlot
      ? [params.timeSlot]
      : [];
  const timeSlots = rawTime
    .filter((s): s is TimeSlot => s in TIME_SLOT_RANGES)
    .filter((s, i, arr) => arr.indexOf(s) === i);
  return {
    matchType,
    fieldType,
    skillTiers: skillTiers.length > 0 ? skillTiers : undefined,
    timeSlots: timeSlots.length > 0 ? timeSlots : undefined,
  };
}

// Trả về id các kèo có MỘT giờ đá (play_times) rơi vào slot. Dùng raw SQL vì cần
// trích phần giờ-trong-ngày theo giờ VN từ timestamp, và unnest mảng play_times.
// Lưu ý: cột play_times là `timestamp without time zone` (Prisma lưu UTC wall time
// naive), nên phải double-cast `AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Ho_Chi_Minh'`
// để ra giờ VN trước khi extract .time. Giá trị time bọc dấu nháy đơn cho PG parse.
async function matchIdsInTimeSlots(slots: TimeSlot[]): Promise<Set<string>> {
  const conds = slots
    .map((s) => {
      const { start, end } = TIME_SLOT_RANGES[s];
      return `(t AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Ho_Chi_Minh')::time >= '${start}'::time AND (t AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Ho_Chi_Minh')::time < '${end}'::time`;
    })
    .join(" OR ");
  const rows = await db.$queryRawUnsafe<{ id: string }[]>(
    `SELECT DISTINCT m.id FROM matches m, unnest(m.play_times) AS t WHERE ${conds}`,
  );
  return new Set(rows.map((r) => r.id));
}

/**
 * Liệt kê kèo đang mở, có ít nhất 1 giờ sắp diễn ra, sắp xếp theo giờ sớm nhất.
 * Hỗ trợ lọc theo loại kèo / loại sân / trình độ / khung giờ. (Lọc "gần" theo geo để task sau.)
 */
export async function listMatches(filters: MatchFilters = {}) {
  // Lọc khung giờ trước (raw SQL) -> ra tập id, rồi giao với các filter còn lại.
  let timeSlotIds: Set<string> | undefined;
  if (filters.timeSlots?.length) {
    timeSlotIds = await matchIdsInTimeSlots(filters.timeSlots);
    if (timeSlotIds.size === 0) return [];
  }

  // Lấy kèo OPEN (không lọc "sắp tới" ở DB vì play_times là mảng — không có
  // filter trực tiếp "có phần tử >= now"). Lọc trong app ở dưới.
  const matches = await db.match.findMany({
    where: {
      status: "OPEN",
      ...(timeSlotIds ? { id: { in: [...timeSlotIds] } } : {}),
      ...(filters.matchType ? { matchType: filters.matchType } : {}),
      ...(filters.fieldType ? { fieldType: filters.fieldType } : {}),
      // Kèo khớp nếu mảng skill_tiers chứa ĐỦ MỘT trình độ user chọn (hasSome).
      ...(filters.skillTiers?.length
        ? { skillTiers: { hasSome: filters.skillTiers } }
        : {}),
    },
    include: {
      team: { select: { id: true, name: true } },
      field: { select: { id: true, name: true, address: true } },
      creator: { select: { id: true, name: true } },
    },
  });

  // Lọc trong app: giữ kèo có ít nhất 1 giờ >= now.
  const now = Date.now();
  const upcoming = matches.filter((m) =>
    m.playTimes.some((p) => p.getTime() >= now),
  );
  // Sort theo giờ sớm nhất trong mảng.
  upcoming.sort(
    (a, b) =>
      Math.min(...a.playTimes.map((p) => p.getTime())) -
      Math.min(...b.playTimes.map((p) => p.getTime())),
  );
  return upcoming;
}

export type MatchListItem = Awaited<ReturnType<typeof listMatches>>[number];

/**
 * Liệt kê tất cả kèo do user tạo (creator-based, MVPe bypass team membership),
 * kèm các yêu cầu ghép kèo (MatchRequest) để hiển thị trạng thái "có đội hỏi cáp".
 * Không lọc theo status — user xem được cả kèo đang mở, đã chốt, đã hủy, hết hạn
 * (tab "đang đăng"/"đã chốt"/"lịch sử" lọc ở UI sau). Sort mới nhất trước.
 */
// Include shape dùng chung cho listMyMatches + getActiveMyMatch (đồng bộ type).
const myMatchInclude = {
  team: { select: { id: true, name: true } },
  field: { select: { id: true, name: true, address: true } },
  creator: { select: { id: true, name: true } },
  requests: {
    include: {
      requester: { select: { id: true, name: true } },
      requesterTeam: { select: { id: true, name: true, skillTier: true } },
    },
    orderBy: { createdAt: "desc" },
  },
} as const;

export async function listMyMatches(userId: string) {
  return db.match.findMany({
    where: { creatorId: userId },
    include: myMatchInclude,
    orderBy: { createdAt: "desc" },
  });
}

export type MyMatchItem = Awaited<ReturnType<typeof listMyMatches>>[number];

/**
 * Lấy 1 kèo "active" của user để hiển thị float button trên /matches:
 * ưu tiên kèo OPEN có nhiều request PENDING nhất, fallback kèo OPEN mới nhất.
 * Trả null nếu user không có kèo OPEN nào (→ FAB không hiện).
 */
export async function getActiveMyMatch(
  userId: string,
): Promise<MyMatchItem | null> {
  // Prisma không orderby trực tiếp "số PENDING" (cần filter trên count relation).
  // Lấy top các kèo OPEN mới nhất, sort trong app theo số PENDING rồi createdAt.
  const matches = await db.match.findMany({
    where: { creatorId: userId, status: "OPEN" },
    include: myMatchInclude,
    orderBy: { createdAt: "desc" },
    // Giới hạn để sort trong app nhẹ — user hiếm khi có >20 kèo OPEN cùng lúc.
    take: 20,
  });
  if (matches.length === 0) return null;
  matches.sort((a, b) => {
    const ap = a.requests.filter((r) => r.status === "PENDING").length;
    const bp = b.requests.filter((r) => r.status === "PENDING").length;
    if (ap !== bp) return bp - ap;
    return b.createdAt.getTime() - a.createdAt.getTime();
  });
  return matches[0];
}
