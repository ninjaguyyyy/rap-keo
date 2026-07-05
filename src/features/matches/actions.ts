"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { createMatchSchema, type CreateMatchState } from "./schemas";

// Tạo kèo mới. creator = user đăng nhập. MVP: chưa gắn team/field/location
// (Team CRUD, Field list, Map ở task sau) -> để null, user nhập area text.
export async function createMatch(
  _prev: CreateMatchState,
  formData: FormData,
): Promise<CreateMatchState> {
  const user = await requireUser();

  // skillTiers từ form: nhiều hidden input name="skillTiers".
  const skillRaw = formData.getAll("skillTiers").filter(Boolean) as string[];
  // playTimes từ form: nhiều hidden input name="playTimes" dạng "YYYY-MM-DDTHH:mm"
  // (đã ghép date + hour ở client). Validate/transform trong schema.
  const playTimesRaw = formData
    .getAll("playTimes")
    .map((v) => String(v).trim())
    .filter(Boolean);
  // hasField từ form: hidden input value "on"/"off" (client control).
  const hasFieldInput = formData.get("hasField") === "on";
  // playersCount từ form: "1" hoặc "2" (radio). Mặc định 1.
  const playersRaw = Number(formData.get("playersCount")) || 1;

  const parsed = createMatchSchema.safeParse({
    matchType: formData.get("matchType"),
    fieldType: formData.get("fieldType"),
    hasField: hasFieldInput,
    skillTiers: skillRaw,
    playTimes: playTimesRaw,
    area: formData.get("area"),
    playersCount: playersRaw,
    note: formData.get("note"),
  });

  if (!parsed.success) {
    const fieldErrors: CreateMatchState["fieldErrors"] = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0];
      if (typeof key === "string") {
        const fieldKey = key as keyof NonNullable<
          CreateMatchState["fieldErrors"]
        >;
        if (!fieldErrors[fieldKey]) fieldErrors[fieldKey] = issue.message;
      }
    }
    return { fieldErrors };
  }

  const { matchType, fieldType, hasField, skillTiers, playTimes, area, playersCount, note } =
    parsed.data;

  // LOOKING_FOR_TEAM: ghép "[N cầu rảnh] " vào đầu note để card hiển thị (không thêm cột DB).
  // Các loại khác: không ghi playersCount vào note.
  const isLookingForTeam = matchType === "LOOKING_FOR_TEAM";
  const noteWithCount =
    isLookingForTeam && playersCount > 0
      ? `[${playersCount} cầu rảnh] ${note ?? ""}`.trim()
      : note || null;

  try {
    await db.match.create({
      data: {
        creatorId: user.id,
        // teamId / fieldId / location: null ở MVP (xem note trong schemas.ts).
        matchType,
        fieldType,
        skillTiers,
        playTimes,
        area,
        note: noteWithCount,
        status: "OPEN",
        // Đánh dấu đã có sân hay chưa (MVP: boolean, chưa gắn fieldId cụ thể).
        // Khi build field picker: hasField=true -> chọn Field -> gán fieldId.
        // TODO: lưu hasField vào cột riêng khi thêm migration.
      },
    });
    // hasField chưa có cột DB riêng — log để verify UI; sẽ lưu cột khi migrate.
    if (hasField) {
      console.log("[createMatch] hasField=true (chưa lưu cột DB trong MVP này)");
    }
    revalidatePath("/matches");
    return { ok: true };
  } catch (err) {
    console.error("createMatch error:", err);
    return { error: "Không tạo được kèo. Thử lại nhé." };
  }
}
