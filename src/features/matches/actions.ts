"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireUser, requireAdmin } from "@/lib/session";
import { createMatchSchema, type CreateMatchState } from "./schemas";
import { parseMatchFromText, type MatchDraft } from "./ai-parser";
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
    revalidatePath("/my-matches");
    return { ok: true };
  } catch (err) {
    console.error("createMatch error:", err);
    return { error: "Không tạo được kèo. Thử lại nhé." };
  }
}

// State cho useActionState parseMatchText.
export type ParseMatchTextState = {
  ok?: boolean;
  data?: MatchDraft;
  error?: string;
  input?: string;
};

// Parse text tự do (copy từ FB) -> MatchDraft (admin-only). KHÔNG tạo match,
// chỉ trả draft để form điền sẵn. requireAdmin vì tốn quota AI.
export async function parseMatchText(
  _prev: ParseMatchTextState,
  formData: FormData,
): Promise<ParseMatchTextState> {
  try {
    await requireAdmin();
  } catch {
    return { error: "Bạn không có quyền dùng tính năng này." };
  }

  const text = String(formData.get("rawText") ?? "").trim();
  if (!text) return { error: "Dán text kèo vào ô trước khi phân tích." };

  const data = await parseMatchFromText(text);
  return { ok: true, data, input: text };
}

// Kết quả chung cho các action quản lý kèo (accept/reject/cancel).
export type MatchActionState = { ok?: true; error?: string };

// Load MatchRequest + match liên quan; đảm bảo user hiện tại là người TẠO kèo
// (chỉ creator mới được chấp nhận/từ chối yêu cầu ghép kèo của mình).
async function getOwnedMatchRequest(requestId: string, userId: string) {
  const req = await db.matchRequest.findUnique({
    where: { id: requestId },
    include: { match: { select: { id: true, creatorId: true, status: true } } },
  });
  if (!req) return { error: "Yêu cầu không tồn tại." } as const;
  if (req.match.creatorId !== userId) {
    return { error: "Bạn không có quyền thao tác kèo này." } as const;
  }
  return { req } as const;
}

// Chấp nhận 1 yêu cầu ghép kèo: request này -> ACCEPTED, match -> MATCHED,
// các request PENDING khác của cùng match -> REJECTED (PRD mục 7 + ERD).
// Transaction để không bị race khi 2 request accept gần nhau.
export async function acceptMatchRequest(
  requestId: string,
): Promise<MatchActionState> {
  const user = await requireUser();
  const loaded = await getOwnedMatchRequest(requestId, user.id);
  if ("error" in loaded) return { error: loaded.error };
  const { req } = loaded;

  try {
    await db.$transaction([
      db.matchRequest.update({
        where: { id: req.id },
        data: { status: "ACCEPTED" },
      }),
      db.match.update({
        where: { id: req.matchId },
        data: { status: "MATCHED" },
      }),
      // Reject mọi request PENDING khác của cùng match.
      db.matchRequest.updateMany({
        where: { matchId: req.matchId, status: "PENDING", id: { not: req.id } },
        data: { status: "REJECTED" },
      }),
    ]);
    revalidatePath("/my-matches");
    revalidatePath("/matches");
    return { ok: true };
  } catch (err) {
    console.error("acceptMatchRequest error:", err);
    return { error: "Không chấp nhận được yêu cầu. Thử lại nhé." };
  }
}

// Từ chối 1 yêu cầu ghép kèo: chỉ request này -> REJECTED, không đổi match.status.
export async function rejectMatchRequest(
  requestId: string,
): Promise<MatchActionState> {
  const user = await requireUser();
  const loaded = await getOwnedMatchRequest(requestId, user.id);
  if ("error" in loaded) return { error: loaded.error };
  const { req } = loaded;

  try {
    await db.matchRequest.update({
      where: { id: req.id },
      data: { status: "REJECTED" },
    });
    revalidatePath("/my-matches");
    return { ok: true };
  } catch (err) {
    console.error("rejectMatchRequest error:", err);
    return { error: "Không từ chối được yêu cầu. Thử lại nhé." };
  }
}

// Gỡ kèo (creator hủy kèo đang mở): match -> CANCELLED. Các request PENDING còn lại
// cũng REJECTED để không còn "treo" (request không thể hoàn thành khi match đã hủy).
export async function cancelMyMatch(matchId: string): Promise<MatchActionState> {
  const user = await requireUser();
  const match = await db.match.findUnique({
    where: { id: matchId },
    select: { creatorId: true, status: true },
  });
  if (!match) return { error: "Kèo không tồn tại." };
  if (match.creatorId !== user.id) {
    return { error: "Bạn không có quyền thao tác kèo này." };
  }
  if (match.status === "CANCELLED") return { ok: true };

  try {
    await db.$transaction([
      db.match.update({
        where: { id: matchId },
        data: { status: "CANCELLED" },
      }),
      db.matchRequest.updateMany({
        where: { matchId, status: "PENDING" },
        data: { status: "REJECTED" },
      }),
    ]);
    revalidatePath("/my-matches");
    revalidatePath("/matches");
    return { ok: true };
  } catch (err) {
    console.error("cancelMyMatch error:", err);
    return { error: "Không gỡ được kèo. Thử lại nhé." };
  }
}
