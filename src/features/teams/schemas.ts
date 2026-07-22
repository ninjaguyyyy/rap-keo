// Zod schema cho form tạo/sửa đội. Enum validate chặt theo Prisma SkillTier (7 mức, no ANY).
import { z } from "zod";
import { FieldType, SkillTier } from "@/generated/prisma/enums";
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

// Thêm thành viên: 2 chế độ — "name" (khách, chỉ tên) hoặc "phone" (user đã đăng ký).
// teamId đi qua hidden input. phoneSchema (regex VN /^0\d{9,10}$/) tái dùng từ auth.
// name/phone dùng .nullish() vì FormData.get() trả null khi field không render
// (vd mode "name" thì phone không có -> null, không phải undefined).
export const addMemberSchema = z
  .object({
    teamId: z.string().uuid(),
    mode: z.enum(["name", "phone"]),
    // name dùng cho mode "name": tối thiểu 2, tối đa 50 ký tự.
    name: z
      .string()
      .trim()
      .min(2, "Tên thành viên tối thiểu 2 ký tự")
      .max(50, "Tên thành viên tối đa 50 ký tự")
      .nullish(),
    // phone dùng cho mode "phone".
    phone: phoneSchema.nullish(),
  })
  // Bắt buộc field đúng theo mode + gắn lỗi đúng field (name hoặc phone) để UI hiện.
  .superRefine((data, ctx) => {
    if (data.mode === "name" && !data.name) {
      ctx.addIssue({
        code: "custom",
        message: "Vui lòng nhập tên thành viên.",
        path: ["name"],
      });
    }
    if (data.mode === "phone" && !data.phone) {
      ctx.addIssue({
        code: "custom",
        message: "Vui lòng nhập số điện thoại.",
        path: ["phone"],
      });
    }
  });

export type AddMemberInput = z.infer<typeof addMemberSchema>;

// State cho useActionState của addMember: fieldError cho name/phone (+ teamId/mode ẩn).
export type AddMemberState = {
  ok?: boolean;
  error?: string;
  fieldErrors?: Partial<Record<"name" | "phone", string>>;
};

// Tạo trận cho team (từ team detail). 2 loại:
// - "opponent": đá kèo — nhập tên đối thủ (opponentName), matchType FIND_OPPONENT.
// - "internal": đá nội bộ — nhập tên 2 bên (sideAName, sideBName), matchType INTERNAL.
// Trận đều là LỊCH SẮP TỚI (status OPEN, chưa có tỷ số) + isPrivate=true (không lên /matches).
// playTime: 1 mốc thời gian "YYYY-MM-DDTHH:mm" (client ghép date+hour) -> transform sang
// Date +07:00 giống match-form. Phải cách now >= 30 phút (không tạo trong quá khứ).
const VN_OFFSET = "+07:00";
const fieldTypeEnum = z.enum([FieldType.F5, FieldType.F7, FieldType.F11]);

const playTimeSchema = z
  .string()
  .min(1, "Chọn ngày và giờ đá")
  .regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/, "Giờ đá không hợp lệ")
  .transform((v) => new Date(`${v}:00${VN_OFFSET}`))
  .refine((d) => !Number.isNaN(d.getTime()), { message: "Giờ đá không hợp lệ" })
  .refine((d) => d.getTime() - Date.now() >= 30 * 60 * 1000, {
    message: "Giờ đá phải cách bây giờ ít nhất 30 phút",
  });

export const createTeamMatchSchema = z
  .object({
    teamId: z.string().uuid(),
    kind: z.enum(["opponent", "internal"]),
    fieldType: fieldTypeEnum,
    playTime: playTimeSchema,
    area: z.string().trim().max(120, "Khu vực tối đa 120 ký tự").optional(),
    // opponentName: bắt buộc khi kind "opponent".
    opponentName: z
      .string()
      .trim()
      .min(2, "Tên đối thủ tối thiểu 2 ký tự")
      .max(50, "Tên đối thủ tối đa 50 ký tự")
      .nullish(),
    // sideAName / sideBName: bắt buộc khi kind "internal".
    sideAName: z
      .string()
      .trim()
      .min(2, "Tên bên A tối thiểu 2 ký tự")
      .max(50, "Tên bên A tối đa 50 ký tự")
      .nullish(),
    sideBName: z
      .string()
      .trim()
      .min(2, "Tên bên B tối thiểu 2 ký tự")
      .max(50, "Tên bên B tối đa 50 ký tự")
      .nullish(),
  })
  .superRefine((data, ctx) => {
    if (data.kind === "opponent" && !data.opponentName) {
      ctx.addIssue({
        code: "custom",
        message: "Vui lòng nhập tên đối thủ.",
        path: ["opponentName"],
      });
    }
    if (data.kind === "internal") {
      if (!data.sideAName) {
        ctx.addIssue({
          code: "custom",
          message: "Vui lòng nhập tên bên A.",
          path: ["sideAName"],
        });
      }
      if (!data.sideBName) {
        ctx.addIssue({
          code: "custom",
          message: "Vui lòng nhập tên bên B.",
          path: ["sideBName"],
        });
      }
    }
  });

export type CreateTeamMatchInput = z.infer<typeof createTeamMatchSchema>;

// State cho useActionState của createTeamMatch.
export type CreateTeamMatchState = {
  ok?: boolean;
  error?: string;
  fieldErrors?: Partial<
    Record<
      | "fieldType"
      | "playTime"
      | "area"
      | "opponentName"
      | "sideAName"
      | "sideBName",
      string
    >
  >;
};

