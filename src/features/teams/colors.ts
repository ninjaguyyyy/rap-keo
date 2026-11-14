// Danh sách màu chủ đạo cho đội bóng.
// Tiêu chí: nền đủ đậm để chữ trắng đạt độ tương phản tốt.
export const teamPrimaryColorValues = [
  "PURPLE_STORM",
  "CRIMSON_RED",
  "ROYAL_BLUE",
  "EMERALD_GREEN",
  "DEEP_TEAL",
  "MIDNIGHT_NAVY",
  "DARK_ORANGE",
  "CHARCOAL",
] as const;

export type TeamPrimaryColor = (typeof teamPrimaryColorValues)[number];

export const DEFAULT_TEAM_PRIMARY_COLOR: TeamPrimaryColor = "PURPLE_STORM";

export const teamPrimaryColorOptions: ReadonlyArray<{
  value: TeamPrimaryColor;
  label: string;
  hex: string;
}> = [
  { value: "PURPLE_STORM", label: "Tím đậm", hex: "#37003C" },
  { value: "CRIMSON_RED", label: "Đỏ đô", hex: "#B90206" },
  { value: "ROYAL_BLUE", label: "Xanh royal", hex: "#051489" },
  { value: "EMERALD_GREEN", label: "Xanh lá đậm", hex: "#0B6E4F" },
  { value: "DEEP_TEAL", label: "Xanh ngọc đậm", hex: "#005F73" },
  { value: "MIDNIGHT_NAVY", label: "Xanh navy đêm", hex: "#1B1F3B" },
  { value: "DARK_ORANGE", label: "Cam đất đậm", hex: "#A64B00" },
  { value: "CHARCOAL", label: "Xám than", hex: "#2B2D42" },
] as const;

const primaryColorHexMap = Object.fromEntries(
  teamPrimaryColorOptions.map((option) => [option.value, option.hex]),
) as Record<TeamPrimaryColor, string>;

export function resolveTeamPrimaryColorHex(color: string | null | undefined): string {
  if (!color) return primaryColorHexMap[DEFAULT_TEAM_PRIMARY_COLOR];
  if (color in primaryColorHexMap) {
    return primaryColorHexMap[color as TeamPrimaryColor];
  }
  return primaryColorHexMap[DEFAULT_TEAM_PRIMARY_COLOR];
}
