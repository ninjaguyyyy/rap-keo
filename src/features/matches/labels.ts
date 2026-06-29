// Nhãn tiếng Việt cho các enum của Match (hiển thị cho người dùng).
import type {
  FieldType,
  MatchSkillTier,
  MatchStatus,
  MatchType,
} from "@/generated/prisma/enums";

export const matchTypeLabels: Record<MatchType, string> = {
  FIND_OPPONENT: "Tìm đối",
  NEED_PLAYERS: "Thiếu người",
  FIELD_AVAILABLE: "Có sân trống",
};

export const fieldTypeLabels: Record<FieldType, string> = {
  F5: "Sân 5",
  F7: "Sân 7",
  F11: "Sân 11",
};

// Dùng chung cho cả Match (có ANY) lẫn Team (7 mức, không ANY). Thứ tự yếu -> mạnh.
export const skillTierLabels: Record<MatchSkillTier, string> = {
  VERY_WEAK: "Siêu Yếu",
  WEAK: "Yếu",
  BELOW_AVERAGE: "Trung Bình Yếu",
  AVERAGE: "Trung Bình",
  ABOVE_AVERAGE: "Trung Bình Khá",
  GOOD: "Khá",
  STRONG: "Mạnh",
  ANY: "Mọi trình độ",
};

// Nhãn khung giờ (khớp key của TIME_SLOT_RANGES trong queries.ts).
export const timeSlotLabels: Record<string, string> = {
  morning: "Sáng",
  "1630": "16h30",
  "1730": "17h30",
  "1830": "18h30",
  "1930": "19h30",
  "2030": "20h30",
  "2130": "21h30",
};

export const matchStatusLabels: Record<MatchStatus, string> = {
  OPEN: "Đang mở",
  MATCHED: "Đã ghép",
  CONFIRMED: "Đã chốt",
  COMPLETED: "Hoàn thành",
  CANCELLED: "Đã hủy",
  EXPIRED: "Hết hạn",
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

// Định dạng chi phí (VND).
export function formatCost(vnd: number): string {
  return `${vnd.toLocaleString("vi-VN")}đ`;
}
