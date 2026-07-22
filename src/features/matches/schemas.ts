// Zod schema cho form tạo kèo. Enum validate chặt theo Prisma enum.
import { z } from "zod";
import { FieldType, MatchSkillTier, MatchType } from "@/generated/prisma/enums";

// Giá trị enum hợp lệ (dùng cho z.enum literal).
const matchTypeEnum = z.enum([
  MatchType.FIND_OPPONENT,
  MatchType.NEED_PLAYERS,
  MatchType.FIELD_AVAILABLE,
  MatchType.LOOKING_FOR_TEAM,
]);
const fieldTypeEnum = z.enum([FieldType.F5, FieldType.F7, FieldType.F11]);
const skillTierEnum = z.enum([
  MatchSkillTier.VERY_WEAK,
  MatchSkillTier.WEAK,
  MatchSkillTier.BELOW_AVERAGE,
  MatchSkillTier.AVERAGE,
  MatchSkillTier.ABOVE_AVERAGE,
  MatchSkillTier.GOOD,
  MatchSkillTier.STRONG,
  MatchSkillTier.ANY,
]);

// Giờ VN = UTC+7. Form tách "ngày" (date) + "giờ" (HH:mm slot). Ta ghép thành
// timestamp +07:00 để lưu đúng ý user, bất kể timezone máy chạy.
const VN_OFFSET = "+07:00";
const MIN_PLAYTIME_MS = 30 * 60 * 1000; // không cho tạo kèo trong quá khứ / sát giờ

// Sân: free text (label sân hoặc text tự do). MVP dùng combobox gợi ý 4 sân
// nhưng cho phép nhập text khác (sân mới). Card display fallback hiện text thô.
const areaSchema = z.string().trim().min(1, "Chọn sân").max(120, "Tối đa 120 ký tự");

// Mảng timestamp "đã ghép" dạng "YYYY-MM-DDTHH:mm" từ form (client ghép date+slot).
// Transform sang Date +07:00, validate mỗi combo >= now + 30', loại trùng.
const playTimesSchema = z
  .array(z.string().min(1))
  .min(1, "Chọn ít nhất 1 giờ đá")
  .transform((arr) =>
    arr
      .map((v) => v.trim())
      .filter((v) => /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(v))
      .map((v) => new Date(`${v}:00${VN_OFFSET}`)),
  )
  .refine((arr) => arr.length > 0, { message: "Giờ đá không hợp lệ" })
  .refine(
    (arr) => arr.every((d) => !Number.isNaN(d.getTime())),
    { message: "Giờ đá không hợp lệ" },
  )
  .refine(
    (arr) => arr.every((d) => d.getTime() - Date.now() >= MIN_PLAYTIME_MS),
    { message: "Giờ đá phải cách bây giờ ít nhất 30 phút" },
  )
  // Loại trùng (cùng timestamp) — giữ thứ tự.
  .transform((arr) =>
    arr.filter(
      (d, i, rest) =>
        rest.findIndex((x) => x.getTime() === d.getTime()) === i,
    ),
  );

// Mảng trình độ: kèo mở cho nhiều trình độ. Ít nhất 1.
const skillTiersSchema = z
  .array(skillTierEnum)
  .min(1, "Chọn ít nhất 1 trình độ");

// hasField: đã có sân cụ thể hay chưa (boolean).
// playersCount: số cầu rảnh (1-2), chỉ dùng cho LOOKING_FOR_TEAM. Mặc định 1.
export const createMatchSchema = z.object({
  matchType: matchTypeEnum,
  fieldType: fieldTypeEnum,
  hasField: z.boolean(),
  skillTiers: skillTiersSchema,
  playTimes: playTimesSchema,
  area: areaSchema,
  playersCount: z.number().int().min(1).max(2).default(1),
  note: z.string().trim().max(500, "Ghi chú tối đa 500 ký tự").optional(),
});

export type CreateMatchInput = z.infer<typeof createMatchSchema>;

// State cho useActionState: fieldErrors cho từng trường, error chung.
export type CreateMatchState = {
  ok?: boolean;
  error?: string;
  fieldErrors?: Partial<Record<keyof CreateMatchInput, string>>;
};

// Cập nhật kết quả trận (popup trên match detail). Tỷ số 2 bên + danh sách bàn
// của đội nhà (mỗi bàn: scorer + kiến tạo tùy chọn, chọn từ thành viên đội).
// Cập nhật = set status COMPLETED (đã đá) + ghi PlayerStat.
const scoreSchema = z
  .number()
  .int("Tỷ số không hợp lệ")
  .min(0, "Tỷ số không âm")
  .max(50, "Tỷ số tối đa 50");

// 1 bàn: scorerId bắt buộc, assistId tùy chọn (nullish vì FormData.get trả null).
const scorerSchema = z.object({
  scorerId: z.string().uuid("Chọn người ghi bàn"),
  assistId: z.string().uuid().nullish(),
});

export const updateMatchResultSchema = z
  .object({
    matchId: z.string().uuid(),
    homeScore: scoreSchema,
    awayScore: scoreSchema,
    // Mảng bàn (dynamic rows). Có thể ít hơn homeScore (không ghi đủ cũng OK).
    scorers: z.array(scorerSchema).max(50, "Quá nhiều bàn").default([]),
  })
  // assistId không được trùng scorerId (không tự kiến tạo cho mình).
  .superRefine((data, ctx) => {
    data.scorers.forEach((s, i) => {
      if (s.assistId && s.assistId === s.scorerId) {
        ctx.addIssue({
          code: "custom",
          message: "Người kiến tạo không được trùng người ghi bàn.",
          path: ["scorers", i, "assistId"],
        });
      }
    });
  });

export type UpdateMatchResultInput = z.infer<typeof updateMatchResultSchema>;

export type UpdateMatchResultState = {
  ok?: boolean;
  error?: string;
  fieldErrors?: Partial<Record<"homeScore" | "awayScore" | "scorers", string>>;
};
