// Nhãn tiếng Việt cho các enum của Match (hiển thị cho người dùng).
import type {
  FieldType,
  MatchSkillTier,
  MatchStatus,
  MatchType,
} from "@/generated/prisma/enums";
import type { MatchRequestStatus } from "@/generated/prisma/enums";
import { baseSkillTierLabels } from "@/lib/skill-labels";

export const matchTypeLabels: Record<MatchType, string> = {
  FIND_OPPONENT: "Tìm đối",
  NEED_PLAYERS: "Thiếu người",
  FIELD_AVAILABLE: "Có sân trống",
  LOOKING_FOR_TEAM: "Tìm đội",
  // Trận nội bộ team tự tạo (private, không lên /matches).
  INTERNAL: "Nội bộ",
};

export const fieldTypeLabels: Record<FieldType, string> = {
  F5: "Sân 5",
  F7: "Sân 7",
  F11: "Sân 11",
};

// Nhãn trình độ cho Match: 7 mức chung (baseSkillTierLabels) + ANY (mọi trình độ).
// baseSkillTierLabels là nguồn duy nhất (dùng chung với Team) — xem @/lib/skill-labels.
export const skillTierLabels: Record<MatchSkillTier, string> = {
  ...baseSkillTierLabels,
  ANY: "Mọi trình độ",
};

// Nhãn khung giờ (khớp key của TIME_SLOT_RANGES trong queries.ts).
export const timeSlotLabels: Record<string, string> = {
  "0500": "05h00",
  "0530": "05h30",
  "0600": "06h00",
  "0630": "06h30",
  "1630": "16h30",
  "1730": "17h30",
  "1830": "18h30",
  "1930": "19h30",
  "2030": "20h30",
  "2130": "21h30",
};

// Sân (MVP: cố định 4 sân phổ biến. Map + field picker để task sau).
export const areaLabels: Record<string, string> = {
  trung_tam: "Sân Trung Tâm",
  da_phuoc: "Đa Phước",
  chuyen_viet: "Chuyên Việt",
  hong_phuc: "Hồng Phúc",
};

// Trạng thái "đã có sân" — hiển thị trên card.
export const hasFieldLabels = {
  true: "Đã có sân",
  false: "Chưa có sân",
} as const;

export const matchStatusLabels: Record<MatchStatus, string> = {
  OPEN: "Đang mở",
  MATCHED: "Đã ghép",
  CONFIRMED: "Đã chốt",
  COMPLETED: "Hoàn thành",
  CANCELLED: "Đã hủy",
  EXPIRED: "Hết hạn",
};

// Trạng thái yêu cầu ghép kèo (MatchRequest) — hiển thị trong "Kèo của tôi".
export const matchRequestStatusLabels: Record<MatchRequestStatus, string> = {
  PENDING: "Đang chờ",
  ACCEPTED: "Đã chấp nhận",
  REJECTED: "Đã từ chối",
  CANCELLED: "Đã hủy",
};

// Định dạng thời gian đá (giờ Việt Nam).
const playTimeFormatter = new Intl.DateTimeFormat("vi-VN", {
  weekday: "short",
  day: "2-digit",
  month: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Asia/Ho_Chi_Minh",
});

export function formatPlayTime(date: Date): string {
  return playTimeFormatter.format(date);
}

// Định dạng mảng giờ đá: gộp chung ngày nếu cùng ngày, VD "Th 3, 07/07 · 18h30 | 20h30".
// Dùng " | " (thay vì " · ") giữa các giờ để tránh nhầm thành khoảng thời gian
// "18h30-20h30" — "18h30 | 20h30" đọc rõ là 2 giờ rời rạc (HOẶC, không phải TỚI).
// Sort tăng dần theo thời gian trước khi format.
const dayMonthFormatter = new Intl.DateTimeFormat("vi-VN", {
  weekday: "short",
  day: "2-digit",
  month: "2-digit",
  timeZone: "Asia/Ho_Chi_Minh",
});
const hourMinuteFormatter = new Intl.DateTimeFormat("vi-VN", {
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Asia/Ho_Chi_Minh",
});

export function formatPlayTimes(dates: Date[]): string {
  const sorted = [...dates].sort((a, b) => a.getTime() - b.getTime());
  if (sorted.length === 0) return "";
  const first = sorted[0];
  const dayLabel = dayMonthFormatter.format(first);
  const hours = sorted.map((d) => hourMinuteFormatter.format(d)).join(" | ");
  return `${dayLabel} · ${hours}`;
}
