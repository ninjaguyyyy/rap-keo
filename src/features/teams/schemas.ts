// Zod schema cho form tạo/sửa đội. Enum validate chặt theo Prisma SkillTier (7 mức, no ANY).
import { z } from "zod";
import { SkillTier } from "@/generated/prisma/enums";
import { phoneSchema } from "@/features/auth/schemas";

// Trình độ đội: đúng 7 mức của SkillTier (khác Match — Match có thêm ANY).
export const teamSkillTierEnum = z.enum([
  SkillTier.VERY_WEAK,
  SkillTier.WEAK,
  SkillTier.BELOW_AVERAGE,
  SkillTier.AVERAGE,
  SkillTier.ABOVE_AVERAGE,
  SkillTier.GOOD,
  SkillTier.STRONG,
]);

// homeArea: khu vực hoạt động (free text, tùy chọn). Blank -> coerce null ở action.
export const createTeamSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Tên đội tối thiểu 2 ký tự")
    .max(50, "Tên đội tối đa 50 ký tự"),
  skillTier: teamSkillTierEnum,
  homeArea: z.string().trim().max(120, "Khu vực tối đa 120 ký tự").optional(),
});

export type CreateTeamInput = z.infer<typeof createTeamSchema>;

// State cho useActionState: fieldErrors cho từng trường, error chung.
export type TeamFormState = {
  ok?: boolean;
  error?: string;
  fieldErrors?: Partial<Record<keyof CreateTeamInput, string>>;
};

// Thêm thành viên: nhập SĐT tìm user đã đăng ký. teamId đi qua hidden input.
// phoneSchema (regex VN /^0\d{9,10}$/) tái dùng từ auth.
export const addMemberSchema = z.object({
  teamId: z.string().uuid(),
  phone: phoneSchema,
});

export type AddMemberInput = z.infer<typeof addMemberSchema>;

// State cho useActionState của addMember: chỉ có fieldError cho phone (+ teamId ẩn).
export type AddMemberState = {
  ok?: boolean;
  error?: string;
  fieldErrors?: Partial<Record<keyof AddMemberInput, string>>;
};

