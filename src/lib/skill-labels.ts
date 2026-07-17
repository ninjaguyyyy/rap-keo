// Nhãn tiếng Việt cho 7 mức trình độ (SkillTier) — nguồn dùng chung cho cả
// Team lẫn Match. Match bổ sung thêm "ANY" (mọi trình độ) ở labels riêng.
import type { SkillTier } from "@/generated/prisma/enums";

// Thứ tự yếu -> mạnh, khớp enum SkillTier trong Prisma schema.
export const baseSkillTierLabels: Record<SkillTier, string> = {
  VERY_WEAK: "Siêu Yếu",
  WEAK: "Yếu",
  BELOW_AVERAGE: "Trung Bình Yếu",
  AVERAGE: "Trung Bình",
  ABOVE_AVERAGE: "Trung Bình Khá",
  GOOD: "Khá",
  STRONG: "Mạnh",
};
