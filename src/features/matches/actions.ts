"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { InternalSquadSide } from "@/generated/prisma/enums";
import { requireUser, requireAdmin } from "@/lib/session";
import { buildBalancedInternalTeamSides } from "./internal-squad-balance";
import {
  createMatchSchema,
  updateInternalSquadSideSchema,
  updateMatchResultSchema,
  type CreateMatchState,
  type UpdateMatchResultState,
} from "./schemas";
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

// Xóa hẳn trận khỏi hệ thống. Chỉ đội trưởng của team gắn với trận được xóa.
// Dùng cho trang chi tiết trận (đặc biệt trận nội bộ/team match). Các bản ghi liên
// quan (request, player stats, vote session, votes) tự xóa theo FK cascade.
export async function deleteMatchByOwner(matchId: string): Promise<MatchActionState> {
  const user = await requireUser();

  const match = await db.match.findUnique({
    where: { id: matchId },
    select: { id: true, teamId: true, creatorId: true },
  });
  if (!match) return { error: "Trận không tồn tại." };
  if (!match.teamId) {
    return { error: "Trận này không thuộc đội nào để xóa theo quyền đội trưởng." };
  }

  const team = await db.team.findUnique({
    where: { id: match.teamId },
    select: { ownerId: true },
  });
  if (!team) return { error: "Đội không tồn tại." };
  if (team.ownerId !== user.id) {
    return { error: "Chỉ đội trưởng mới có quyền xóa trận." };
  }

  try {
    await db.match.delete({ where: { id: matchId } });
    revalidatePath("/matches");
    revalidatePath("/my-matches");
    revalidatePath(`/matches/${matchId}`);
    revalidatePath(`/teams/${match.teamId}`);
    return { ok: true };
  } catch (err) {
    console.error("deleteMatchByOwner error:", err);
    return { error: "Không xóa được trận. Thử lại nhé." };
  }
}

// Gỡ 1 cầu thủ khỏi đội hình trận. Chỉ đội trưởng đội chủ quản được thao tác.
export async function removeMatchSquadMember(
  matchId: string,
  userId: string,
): Promise<MatchActionState> {
  const user = await requireUser();

  const match = await db.match.findUnique({
    where: { id: matchId },
    select: { id: true, teamId: true, matchType: true },
  });
  if (!match) return { error: "Trận không tồn tại." };
  if (!match.teamId) return { error: "Trận không thuộc đội nào." };

  const team = await db.team.findUnique({
    where: { id: match.teamId },
    select: { ownerId: true },
  });
  if (!team) return { error: "Đội không tồn tại." };
  if (team.ownerId !== user.id) {
    return { error: "Chỉ đội trưởng mới có quyền chỉnh đội hình." };
  }

  try {
    await db.matchSquadMember.deleteMany({
      where: { matchId, userId },
    });
    revalidatePath(`/matches/${matchId}`);
    revalidatePath(`/teams/${match.teamId}`);
    return { ok: true };
  } catch (err) {
    console.error("removeMatchSquadMember error:", err);
    return { error: "Không cập nhật được đội hình. Thử lại nhé." };
  }
}

// Thêm lại 1 cầu thủ vào đội hình trận. Chỉ đội trưởng đội chủ quản được thao tác.
export async function addMatchSquadMember(
  matchId: string,
  userId: string,
): Promise<MatchActionState> {
  const user = await requireUser();

  const match = await db.match.findUnique({
    where: { id: matchId },
    select: { id: true, teamId: true },
  });
  if (!match) return { error: "Trận không tồn tại." };
  if (!match.teamId) return { error: "Trận không thuộc đội nào." };

  const team = await db.team.findUnique({
    where: { id: match.teamId },
    select: { ownerId: true },
  });
  if (!team) return { error: "Đội không tồn tại." };
  if (team.ownerId !== user.id) {
    return { error: "Chỉ đội trưởng mới có quyền chỉnh đội hình." };
  }

  const member = await db.teamMember.findUnique({
    where: { teamId_userId: { teamId: match.teamId, userId } },
    select: { userId: true },
  });
  if (!member) {
    return { error: "Cầu thủ này không thuộc đội." };
  }

  try {
    await db.matchSquadMember.createMany({
      data: [{ matchId, userId }],
      skipDuplicates: true,
    });
    revalidatePath(`/matches/${matchId}`);
    revalidatePath(`/teams/${match.teamId}`);
    return { ok: true };
  } catch (err) {
    console.error("addMatchSquadMember error:", err);
    return { error: "Không thêm được cầu thủ vào đội hình. Thử lại nhé." };
  }
}

// Gán cầu thủ nội bộ vào bên A/B. Chỉ đội trưởng được đổi.
export async function setInternalMatchSquadSide(
  matchId: string,
  userId: string,
  side: "SIDE_A" | "SIDE_B",
): Promise<MatchActionState> {
  const user = await requireUser();
  const parsed = updateInternalSquadSideSchema.safeParse({ matchId, userId, side });
  if (!parsed.success) return { error: "Dữ liệu đội hình không hợp lệ." };

  const match = await db.match.findUnique({
    where: { id: parsed.data.matchId },
    select: { id: true, teamId: true, matchType: true },
  });
  if (!match) return { error: "Trận không tồn tại." };
  if (!match.teamId) return { error: "Trận không thuộc đội nào." };
  if (match.matchType !== "INTERNAL") {
    return { error: "Chỉ trận nội bộ mới gán bên thi đấu A/B." };
  }

  const team = await db.team.findUnique({
    where: { id: match.teamId },
    select: { ownerId: true },
  });
  if (!team) return { error: "Đội không tồn tại." };
  if (team.ownerId !== user.id) {
    return { error: "Chỉ đội trưởng mới có quyền chỉnh đội hình nội bộ." };
  }

  try {
    const updated = await db.matchSquadMember.updateMany({
      where: { matchId: parsed.data.matchId, userId: parsed.data.userId },
      data: { internalSide: parsed.data.side },
    });
    if (updated.count === 0) {
      return { error: "Cầu thủ chưa có trong đội hình trận." };
    }
    revalidatePath(`/matches/${parsed.data.matchId}`);
    return { ok: true };
  } catch (err) {
    console.error("setInternalMatchSquadSide error:", err);
    return { error: "Không cập nhật được bên thi đấu. Thử lại nhé." };
  }
}

// Chia lại đội hình nội bộ ngẫu nhiên cân bằng theo điểm cầu thủ hiện tại.
export async function randomizeInternalMatchSquad(
  matchId: string,
): Promise<MatchActionState> {
  const user = await requireUser();
  const match = await db.match.findUnique({
    where: { id: matchId },
    select: { id: true, teamId: true, matchType: true },
  });
  if (!match) return { error: "Trận không tồn tại." };
  if (!match.teamId) return { error: "Trận không thuộc đội nào." };
  if (match.matchType !== "INTERNAL") {
    return { error: "Chỉ trận nội bộ mới chia đội A/B." };
  }

  const team = await db.team.findUnique({
    where: { id: match.teamId },
    select: { ownerId: true },
  });
  if (!team) return { error: "Đội không tồn tại." };
  if (team.ownerId !== user.id) {
    return { error: "Chỉ đội trưởng mới có quyền chia đội nội bộ." };
  }

  const squad = await db.matchSquadMember.findMany({
    where: { matchId },
    select: { userId: true },
  });
  if (squad.length === 0) return { error: "Trận chưa có cầu thủ trong đội hình." };

  try {
    const sideByUserId = await buildBalancedInternalTeamSides(
      match.teamId,
      squad.map((member) => member.userId),
    );
    await db.$transaction(
      squad.map((member) =>
        db.matchSquadMember.updateMany({
          where: { matchId, userId: member.userId },
          data: {
            internalSide: sideByUserId.get(member.userId) ?? InternalSquadSide.SIDE_A,
          },
        })),
    );
    revalidatePath(`/matches/${matchId}`);
    return { ok: true };
  } catch (err) {
    console.error("randomizeInternalMatchSquad error:", err);
    return { error: "Không chia lại đội hình được. Thử lại nhé." };
  }
}

// Cập nhật kết quả trận (popup trên match detail). Owner HOẶC thành viên đội được
// cập nhật. Set tỷ số + status COMPLETED (đã đá) + thay thế PlayerStat (aggregate
// goals/assists/saves). Transaction để match + stats nhất quán.
export async function updateMatchResult(
  _prev: UpdateMatchResultState,
  formData: FormData,
): Promise<UpdateMatchResultState> {
  const user = await requireUser();

  // Đọc mảng scorers từ FormData: các entry name="scorerId[]" + "assistId[]" song
  // song (client render dynamic rows, mỗi row 2 hidden input cùng index qua vị trí).
  const scorerIds = formData.getAll("scorerId").map(String);
  const assistIds = formData.getAll("assistId").map((v) => {
    const s = String(v).trim();
    return s === "" ? null : s;
  });
  // Ghép cặp theo index. Nếu 2 mảng lệch长度 -> dùng max, fill null assist.
  const maxLen = Math.max(scorerIds.length, assistIds.length);
  const scorers = Array.from({ length: maxLen }, (_, i) => ({
    scorerId: scorerIds[i] ?? "",
    assistId: assistIds[i] ?? null,
  })).filter((s) => s.scorerId); // bỏ row rỗng (chưa chọn scorer).

  // Đọc mảng cứu thua: mỗi dòng gồm userId + count.
  const saveUserIds = formData.getAll("saveUserId").map(String);
  const saveCounts = formData.getAll("saveCount").map((value) => Number(value));
  const saveMaxLen = Math.max(saveUserIds.length, saveCounts.length);
  const saves = Array.from({ length: saveMaxLen }, (_, i) => ({
    userId: saveUserIds[i] ?? "",
    count: saveCounts[i] ?? 0,
  })).filter((save) => save.userId);

  const parsed = updateMatchResultSchema.safeParse({
    matchId: formData.get("matchId"),
    homeScore: Number(formData.get("homeScore")),
    awayScore: Number(formData.get("awayScore")),
    scorers,
    saves,
  });
  if (!parsed.success) {
    const fieldErrors: NonNullable<UpdateMatchResultState["fieldErrors"]> = {};
    for (const issue of parsed.error.issues) {
      const topKey = issue.path[0];
      if (
        topKey === "homeScore"
        || topKey === "awayScore"
        || topKey === "scorers"
        || topKey === "saves"
      ) {
        const fieldKey = topKey as "homeScore" | "awayScore" | "scorers" | "saves";
        if (!fieldErrors[fieldKey]) fieldErrors[fieldKey] = issue.message;
      }
    }
    return { fieldErrors };
  }

  const { matchId, homeScore, awayScore } = parsed.data;

  // Load match + kiểm tra quyền (owner hoặc thành viên đội).
  const match = await db.match.findUnique({
    where: { id: matchId },
    select: { teamId: true, status: true, matchType: true },
  });
  if (!match) return { error: "Trận không tồn tại." };
  if (!match.teamId) return { error: "Trận không thuộc đội nào." };

  const team = await db.team.findUnique({
    where: { id: match.teamId },
    select: {
      ownerId: true,
      members: { where: { userId: user.id }, select: { id: true } },
    },
  });
  if (!team) return { error: "Đội không tồn tại." };
  const isMember = team.ownerId === user.id || team.members.length > 0;
  if (!isMember) return { error: "Bạn không có quyền cập nhật trận này." };

  // Validate scorer/assist/save phải nằm trong đội hình tham gia trận.
  const squadMembers = await db.matchSquadMember.findMany({
    where: {
      matchId,
      ...(match.matchType === "INTERNAL"
        ? { internalSide: { in: [InternalSquadSide.SIDE_A, InternalSquadSide.SIDE_B] } }
        : {}),
    },
    select: {
      userId: true,
      user: {
        select: {
          name: true,
          phone: true,
        },
      },
    },
  });
  const memberIds = new Set(squadMembers.map((m) => m.userId));
  if (memberIds.size === 0) {
    return { error: "Trận chưa có cầu thủ tham gia để cập nhật thống kê." };
  }
  const memberNameById = new Map(
    squadMembers.map((m) => [m.userId, m.user.name ?? m.user.phone ?? "—"]),
  );
  for (const s of parsed.data.scorers) {
    if (!memberIds.has(s.scorerId)) {
      return { fieldErrors: { scorers: "Người ghi bàn không thuộc đội hình tham gia trận." } };
    }
    if (s.assistId && !memberIds.has(s.assistId)) {
      return { fieldErrors: { scorers: "Người kiến tạo không thuộc đội hình tham gia trận." } };
    }
  }
  for (const save of parsed.data.saves) {
    if (!memberIds.has(save.userId)) {
      return { fieldErrors: { saves: "Cầu thủ cứu thua không thuộc đội hình tham gia trận." } };
    }
  }

  // Aggregate PlayerStat: mỗi userId 1 row, goals = count làm scorer, assists =
  // count làm assist, saves = tổng số pha cứu thua nhập tay.
  const statsByUser = new Map<
    string,
    { goals: number; assists: number; saves: number; displayName: string }
  >();
  for (const s of parsed.data.scorers) {
    if (!statsByUser.has(s.scorerId)) {
      statsByUser.set(s.scorerId, {
        goals: 0,
        assists: 0,
        saves: 0,
        displayName: memberNameById.get(s.scorerId) ?? "—",
      });
    }
    statsByUser.get(s.scorerId)!.goals += 1;
    if (s.assistId) {
      if (!statsByUser.has(s.assistId)) {
        statsByUser.set(s.assistId, {
          goals: 0,
          assists: 0,
          saves: 0,
          displayName: memberNameById.get(s.assistId) ?? "—",
        });
      }
      statsByUser.get(s.assistId)!.assists += 1;
    }
  }
  for (const save of parsed.data.saves) {
    if (!statsByUser.has(save.userId)) {
      statsByUser.set(save.userId, {
        goals: 0,
        assists: 0,
        saves: 0,
        displayName: memberNameById.get(save.userId) ?? "—",
      });
    }
    statsByUser.get(save.userId)!.saves += save.count;
  }

  try {
    await db.$transaction(async (tx) => {
      // 1. Cập nhật tỷ số + status COMPLETED.
      await tx.match.update({
        where: { id: matchId },
        data: { homeScore, awayScore, status: "COMPLETED" },
      });
      // 2. Xóa PlayerStat cũ của match (replace toàn bộ).
      await tx.playerStat.deleteMany({ where: { matchId, teamId: match.teamId! } });
      // 3. Tạo PlayerStat mới từ aggregate.
      if (statsByUser.size > 0) {
        await tx.playerStat.createMany({
          data: [...statsByUser.entries()].map(([userId, v]) => ({
            matchId,
            teamId: match.teamId!,
            userId,
            displayName: v.displayName,
            goals: v.goals,
            assists: v.assists,
            saves: v.saves,
          })),
        });
      }
    });
    revalidatePath(`/matches/${matchId}`);
    revalidatePath(`/teams/${match.teamId}`);
    return { ok: true };
  } catch (err) {
    console.error("updateMatchResult error:", err);
    return { error: "Không cập nhật được kết quả. Thử lại nhé." };
  }
}
