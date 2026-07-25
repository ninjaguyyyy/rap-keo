// Zod schema cho form tạo/sửa giải đấu + add participant + set match score.
// Mirror pattern src/features/teams/schemas.ts (zod + superRefine theo mode).
import { z } from "zod";
import { FieldType, SkillTier, TournamentFormat } from "@/generated/prisma/enums";

const fieldTypeEnum = z.enum([FieldType.F5, FieldType.F7, FieldType.F11]);
const formatEnum = z.enum([TournamentFormat.LEAGUE]);
const skillTierEnum = z.enum([
  SkillTier.VERY_WEAK,
  SkillTier.WEAK,
  SkillTier.BELOW_AVERAGE,
  SkillTier.AVERAGE,
  SkillTier.ABOVE_AVERAGE,
  SkillTier.GOOD,
  SkillTier.STRONG,
]);

// Tạo giải. MVP: format chỉ LEAGUE. skillTier/area tùy chọn (chỉ hiển thị).
export const createTournamentSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Tên giải tối thiểu 2 ký tự")
    .max(80, "Tên giải tối đa 80 ký tự"),
  fieldType: fieldTypeEnum,
  format: formatEnum,
  skillTier: skillTierEnum.optional(),
  area: z.string().trim().max(120, "Khu vực tối đa 120 ký tự").optional(),
  description: z
    .string()
    .trim()
    .max(1000, "Mô tả tối đa 1000 ký tự")
    .optional(),
});

export type CreateTournamentInput = z.infer<typeof createTournamentSchema>;

// State cho useActionState: fieldErrors cho từng trường, error chung.
// createTournament trả thêm slug (để dialog redirect sang /tournaments/[slug]).
export type TournamentFormState = {
  ok?: boolean;
  error?: string;
  slug?: string;
  fieldErrors?: Partial<Record<keyof CreateTournamentInput, string>>;
};

// Sửa giải: id + subset field. Sau APPROVED, action tự skip các field cấu trúc
// (name/fieldType/format/skillTier) — chỉ cho phép description/area/banner.
export const updateTournamentSchema = z.object({
  id: z.string().uuid(),
  name: z
    .string()
    .trim()
    .min(2, "Tên giải tối thiểu 2 ký tự")
    .max(80, "Tên giải tối đa 80 ký tự"),
  fieldType: fieldTypeEnum,
  format: formatEnum,
  skillTier: skillTierEnum.optional(),
  area: z.string().trim().max(120, "Khu vực tối đa 120 ký tự").optional(),
  description: z
    .string()
    .trim()
    .max(1000, "Mô tả tối đa 1000 ký tự")
    .optional(),
});

export type UpdateTournamentInput = z.infer<typeof updateTournamentSchema>;

// Thêm participant: 2 chế độ — "team" (chọn team hệ thống) hoặc "name" (team lẻ).
// Mirror addMemberSchema (src/features/teams/schemas.ts:41-71).
export const addParticipantSchema = z
  .object({
    tournamentId: z.string().uuid(),
    mode: z.enum(["team", "name"]),
    teamId: z.string().uuid().nullish(),
    displayName: z
      .string()
      .trim()
      .min(2, "Tên đội tối thiểu 2 ký tự")
      .max(50, "Tên đội tối đa 50 ký tự")
      .nullish(),
  })
  .superRefine((data, ctx) => {
    if (data.mode === "team" && !data.teamId) {
      ctx.addIssue({
        code: "custom",
        message: "Vui lòng chọn đội.",
        path: ["teamId"],
      });
    }
    if (data.mode === "name" && !data.displayName) {
      ctx.addIssue({
        code: "custom",
        message: "Vui lòng nhập tên đội.",
        path: ["displayName"],
      });
    }
  });

export type AddParticipantInput = z.infer<typeof addParticipantSchema>;

// State cho addParticipant: fieldError cho teamId/displayName.
export type AddParticipantState = {
  ok?: boolean;
  error?: string;
  fieldErrors?: Partial<Record<"teamId" | "displayName", string>>;
};

// Sửa tên đội (displayName) của 1 participant. Mirror addParticipantSchema cho
// displayName (min 2, max 50). Unique trong giải (catch ở action). Cho cả team
// thật + team lẻ — chỉ đổi tên trong giải, không động Team.name gốc.
export const updateTournamentParticipantSchema = z.object({
  participantId: z.string().uuid(),
  displayName: z
    .string()
    .trim()
    .min(2, "Tên đội tối thiểu 2 ký tự")
    .max(50, "Tên đội tối đa 50 ký tự"),
});

export type UpdateTournamentParticipantInput = z.infer<
  typeof updateTournamentParticipantSchema
>;

export type UpdateTournamentParticipantState = {
  ok?: boolean;
  error?: string;
  fieldErrors?: Partial<Record<"displayName", string>>;
};

// Sửa 1 trận trong giải (organizer, dialog "Sửa trận"). Gộp lịch + tỷ số:
// - playTime: 1 datetime-local "YYYY-MM-DDTHH:mm" (tournament match MVP 1 giờ đá/trận,
//   đơn giản hơn Match public là array). Optional: để trống = chưa lên lịch.
// - area: khu vực (text, optional). fieldId tạm null MVP (chưa có Field picker).
// - homeScore/awayScore: nullable. Cả 2 null = chưa đá (status OPEN). Cả 2 number = COMPLETED.
// Mirror setTournamentMatchScoreSchema (đã thay thế) + playTimesSchema (matches feature).
const VN_OFFSET = "+07:00";

const scoreOrNullSchema = z
  .number()
  .int("Tỷ số không hợp lệ")
  .min(0, "Tỷ số không âm")
  .max(50, "Tỷ số tối đa 50")
  .nullish();

export const updateTournamentMatchSchema = z
  .object({
    matchId: z.string().uuid(),
    playTime: z
      .string()
      .trim()
      .optional()
      .refine(
        (v) => !v || /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(v),
        "Ngày giờ không hợp lệ",
      ),
    area: z.string().trim().max(120, "Khu vực tối đa 120 ký tự").optional(),
    homeScore: scoreOrNullSchema,
    awayScore: scoreOrNullSchema,
    // Sửa 2 đội trong trận (optional — null = giữ nguyên). UUID participant.
    homeParticipantId: z.string().uuid().nullish(),
    awayParticipantId: z.string().uuid().nullish(),
    // Danh sách bàn (dynamic rows). Mỗi bàn: scorerKey + assistKey (optional) + side.
    // scorerKey/assistKey composite: "u:<userId>" (user hệ thống) hoặc "p:<playerId>"
    // (cầu thủ ngoài giải). side: home/away — bàn thuộc participant nào.
    scorers: z.array(
      z.object({
        scorerKey: z.string().min(1, "Chọn người ghi bàn"),
        assistKey: z.string().nullish(),
        side: z.enum(["home", "away"]),
      }),
    ).max(50, "Quá nhiều bàn").default([]),
  })
  // Tỷ số phải có cả 2 hoặc cả 2 trống — không cho "2 vs null".
  .refine(
    (data) =>
      (data.homeScore == null && data.awayScore == null) ||
      (data.homeScore != null && data.awayScore != null),
    { message: "Nhập đủ tỷ số 2 bên hoặc để trống cả 2", path: ["awayScore"] },
  )
  // 2 đội phải khác nhau (nếu cả 2 đều set).
  .refine(
    (data) =>
      !data.homeParticipantId ||
      !data.awayParticipantId ||
      data.homeParticipantId !== data.awayParticipantId,
    { message: "Hai đội phải khác nhau", path: ["awayParticipantId"] },
  )
  // assistKey không được trùng scorerKey trong cùng bàn (không tự kiến tạo).
  .superRefine((data, ctx) => {
    data.scorers.forEach((s, i) => {
      if (s.assistKey && s.assistKey === s.scorerKey) {
        ctx.addIssue({
          code: "custom",
          message: "Người kiến tạo không được trùng người ghi bàn.",
          path: ["scorers", i, "assistKey"],
        });
      }
    });
  });

export type UpdateTournamentMatchInput = z.infer<typeof updateTournamentMatchSchema>;

export type UpdateTournamentMatchState = {
  ok?: boolean;
  error?: string;
  fieldErrors?: Partial<
    Record<
      "playTime" | "area" | "homeScore" | "awayScore" | "homeParticipantId" | "awayParticipantId" | "scorers",
      string
    >
  >;
};

// Helper dùng chung: parse playTime form "YYYY-MM-DDTHH:mm" -> Date +07:00.
// Trả undefined khi rỗng. Dùng cho updateTournamentMatch action.
export function parseTournamentPlayTime(v: string | undefined): Date | undefined {
  if (!v) return undefined;
  const d = new Date(`${v}:00${VN_OFFSET}`);
  return Number.isNaN(d.getTime()) ? undefined : d;
}

// Thêm cầu thủ vào 1 participant trong giải. 2 chế độ:
// - "member": chọn từ TeamMember của team (participant phải có teamId) -> userId.
// - "name": nhập tay (cầu thủ ngoài) -> chỉ displayName, userId null.
// jerseyNumber tùy chọn cả 2 mode (1-99). Unique trong participant.
// Mirror addParticipantSchema (superRefine theo mode).
export const addTournamentPlayerSchema = z
  .object({
    participantId: z.string().uuid(),
    mode: z.enum(["member", "name"]),
    userId: z.string().uuid().nullish(),
    displayName: z
      .string()
      .trim()
      .min(2, "Tên cầu thủ tối thiểu 2 ký tự")
      .max(50, "Tên cầu thủ tối đa 50 ký tự")
      .nullish(),
    jerseyNumber: z
      .number()
      .int("Số áo phải là số nguyên")
      .min(1, "Số áo tối thiểu 1")
      .max(99, "Số áo tối đa 99")
      .nullish(),
  })
  .superRefine((data, ctx) => {
    if (data.mode === "member" && !data.userId) {
      ctx.addIssue({
        code: "custom",
        message: "Vui lòng chọn cầu thủ.",
        path: ["userId"],
      });
    }
    if (data.mode === "name" && !data.displayName) {
      ctx.addIssue({
        code: "custom",
        message: "Vui lòng nhập tên cầu thủ.",
        path: ["displayName"],
      });
    }
  });

export type AddTournamentPlayerInput = z.infer<typeof addTournamentPlayerSchema>;

// State cho addTournamentPlayer: fieldError cho userId/displayName/jerseyNumber.
export type AddTournamentPlayerState = {
  ok?: boolean;
  error?: string;
  fieldErrors?: Partial<
    Record<"userId" | "displayName" | "jerseyNumber", string>
  >;
};
