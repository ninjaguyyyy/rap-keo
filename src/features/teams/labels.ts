// Nhãn tiếng Việt cho các enum của Team (hiển thị cho người dùng).
import type { SkillTier, TeamRole } from "@/generated/prisma/enums";
import { baseSkillTierLabels } from "@/lib/skill-labels";

// Trình độ đội: 7 mức chung (không có ANY). Dùng nguồn chung baseSkillTierLabels.
export const teamSkillTierLabels: Record<SkillTier, string> = baseSkillTierLabels;

// Vai trò thành viên trong đội. Chưa dùng trong MVP (chưa quản lý thành viên) —
// export sẵn để đồng bộ + tái dùng sau.
export const teamRoleLabels: Record<TeamRole, string> = {
  OWNER: "Đội trưởng",
  MEMBER: "Thành viên",
};
