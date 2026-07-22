"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/session";
import {
  createTeamSchema,
  addMemberSchema,
  createTeamMatchSchema,
  type TeamFormState,
  type AddMemberState,
  type CreateTeamMatchState,
} from "./schemas";
import { MatchType, TeamRole } from "@/generated/prisma/enums";
import { uploadTeamCover, deleteTeamCover } from "@/lib/supabase-storage";

// Giới hạn upload ảnh bìa: loại MIME + dung lượng tối đa (5MB).
const COVER_ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const COVER_MAX_BYTES = 5 * 1024 * 1024;

// Kết quả chung cho action đơn (deleteTeam) — mirror MatchActionState.
export type TeamActionState = { ok?: true; error?: string };

// Map lỗi zod -> fieldErrors (chỉ lấy message đầu cho mỗi field). Giống createMatch.
function toFieldErrors(
  issues: { path: PropertyKey[]; message: string }[],
): TeamFormState["fieldErrors"] {
  const fieldErrors: NonNullable<TeamFormState["fieldErrors"]> = {};
  for (const issue of issues) {
    const key = issue.path[0];
    if (typeof key === "string") {
      const fieldKey = key as keyof NonNullable<TeamFormState["fieldErrors"]>;
      if (!fieldErrors[fieldKey]) fieldErrors[fieldKey] = issue.message;
    }
  }
  return fieldErrors;
}

// Tạo đội mới. owner = user đăng nhập. Tạo Team + TeamMember(OWNER) trong 1
// transaction để đảm bảo chủ đội luôn có bản ghi thành viên (đồng bộ ERD).
export async function createTeam(
  _prev: TeamFormState,
  formData: FormData,
): Promise<TeamFormState> {
  const user = await requireUser();

  const parsed = createTeamSchema.safeParse({
    name: formData.get("name"),
    skillTier: formData.get("skillTier"),
    homeArea: formData.get("homeArea"),
  });

  if (!parsed.success) {
    return { fieldErrors: toFieldErrors(parsed.error.issues) };
  }

  const { name, skillTier, homeArea } = parsed.data;
  // Blank homeArea -> null (không lưu chuỗi rỗng), giống pattern note trong createMatch.
  const homeAreaValue = homeArea || null;

  try {
    // Interactive transaction: cần id đội vừa tạo để chèn TeamMember. Nếu bước
    // chèn member fail -> rollback cả team (không để đội "mồ côi" không có chủ).
    await db.$transaction(async (tx) => {
      const team = await tx.team.create({
        data: { name, ownerId: user.id, skillTier, homeArea: homeAreaValue },
      });
      await tx.teamMember.create({
        data: { teamId: team.id, userId: user.id, role: TeamRole.OWNER },
      });
    });
    revalidatePath("/teams");
    return { ok: true };
  } catch (err) {
    console.error("createTeam error:", err);
    return { error: "Không tạo được đội. Thử lại nhé." };
  }
}

// Cập nhật đội. id đọc từ hidden input. Chỉ chủ đội mới được sửa.
export async function updateTeam(
  _prev: TeamFormState,
  formData: FormData,
): Promise<TeamFormState> {
  const user = await requireUser();
  const teamId = String(formData.get("id") ?? "");

  const parsed = createTeamSchema.safeParse({
    name: formData.get("name"),
    skillTier: formData.get("skillTier"),
    homeArea: formData.get("homeArea"),
  });

  if (!parsed.success) {
    return { fieldErrors: toFieldErrors(parsed.error.issues) };
  }

  // Ownership check: đội tồn tại + user là chủ. Lấy cả coverUrl cũ để xoá khi thay.
  const existing = await db.team.findUnique({
    where: { id: teamId },
    select: { ownerId: true, coverUrl: true },
  });
  if (!existing) return { error: "Đội không tồn tại." };
  if (existing.ownerId !== user.id) {
    return { error: "Bạn không có quyền sửa đội này." };
  }

  const { name, skillTier, homeArea } = parsed.data;

  // Upload ảnh bìa (tùy chọn): chỉ xử lý khi user chọn file mới.
  // formData.get("cover") trả File (nếu có chọn) hoặc chuỗi rỗng (không chọn).
  const coverEntry = formData.get("cover");
  let coverUrl: string | undefined;
  if (coverEntry instanceof File && coverEntry.size > 0) {
    if (!COVER_ALLOWED_TYPES.includes(coverEntry.type)) {
      return { error: "Chỉ nhận ảnh JPG, PNG hoặc WebP." };
    }
    if (coverEntry.size > COVER_MAX_BYTES) {
      return { error: "Ảnh bìa tối đa 5MB." };
    }
    try {
      const { publicUrl } = await uploadTeamCover(coverEntry, teamId);
      coverUrl = publicUrl;
      // Xoá ảnh bìa cũ (nếu có) để tiết kiệm storage. Best-effort.
      if (existing.coverUrl) {
        await deleteTeamCover(existing.coverUrl);
      }
    } catch (err) {
      console.error("uploadTeamCover error:", err);
      return { error: "Không tải được ảnh bìa. Thử lại nhé." };
    }
  }

  try {
    await db.team.update({
      where: { id: teamId },
      data: {
        name,
        skillTier,
        homeArea: homeArea || null,
        ...(coverUrl ? { coverUrl } : {}),
      },
    });
    revalidatePath("/teams");
    // /teams/[id] là segment động, revalidatePath("/teams") không cover -> revalidate riêng.
    revalidatePath(`/teams/${teamId}`);
    return { ok: true };
  } catch (err) {
    console.error("updateTeam error:", err);
    return { error: "Không cập nhật được đội. Thử lại nhé." };
  }
}

// Xóa đội. Chỉ chủ đội mới được xóa. Cascade tự xóa TeamMember (FK onDelete: Cascade).
export async function deleteTeam(teamId: string): Promise<TeamActionState> {
  const user = await requireUser();

  const team = await db.team.findUnique({
    where: { id: teamId },
    select: { ownerId: true },
  });
  if (!team) return { error: "Đội không tồn tại." };
  if (team.ownerId !== user.id) {
    return { error: "Bạn không có quyền xóa đội này." };
  }

  try {
    // TODO: khi match creation cho chọn đội (Match.teamId), thêm guard
    // db.match.count({ where: { teamId } }) > 0 -> chặn xóa (FK Match.team là Restrict).
    await db.team.delete({ where: { id: teamId } });
    revalidatePath("/teams");
    return { ok: true };
  } catch (err) {
    console.error("deleteTeam error:", err);
    return { error: "Không xóa được đội. Thử lại nhé." };
  }
}

// Kiểm tra user hiện tại là chủ của team. Trả team hoặc error (mirror ownership
// check trong updateTeam/deleteTeam). Dùng chung cho add/remove member.
async function getOwnedTeam(
  teamId: string,
  userId: string,
): Promise<{ error: string } | { teamId: string }> {
  const team = await db.team.findUnique({
    where: { id: teamId },
    select: { ownerId: true },
  });
  if (!team) return { error: "Đội không tồn tại." };
  if (team.ownerId !== userId) return { error: "Bạn không có quyền quản lý đội này." };
  return { teamId };
}

// Thêm thành viên: 2 chế độ.
// - mode "name": tạo user guest (isGuest=true, name-only) -> thêm role MEMBER.
// - mode "phone": tìm user đã đăng ký theo SĐT -> thêm role MEMBER (flow cũ).
// useActionState signature. Lỗi validate / user không tồn tại / đã là member -> fieldError.
export async function addTeamMember(
  _prev: AddMemberState,
  formData: FormData,
): Promise<AddMemberState> {
  const user = await requireUser();

  const parsed = addMemberSchema.safeParse({
    teamId: formData.get("teamId"),
    mode: formData.get("mode"),
    name: formData.get("name"),
    phone: formData.get("phone"),
  });
  if (!parsed.success) {
    const fieldErrors: NonNullable<AddMemberState["fieldErrors"]> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0];
      if (key === "name" || key === "phone") {
        if (!fieldErrors[key]) fieldErrors[key] = issue.message;
      }
    }
    return { fieldErrors };
  }

  const { teamId, mode, name, phone } = parsed.data;
  const owned = await getOwnedTeam(teamId, user.id);
  if ("error" in owned) return { error: owned.error };

  try {
    if (mode === "name") {
      // Tạo user guest: chỉ tên, không SĐT/email/password -> không đăng nhập được.
      // Guest có thể upgrade thành user thật sau (khi đăng ký SĐT) — giữ membership.
      const guest = await db.user.create({
        data: { name: name!, isGuest: true },
      });
      await db.teamMember.create({
        data: { teamId, userId: guest.id, role: TeamRole.MEMBER },
      });
      revalidatePath(`/teams/${teamId}`);
      return { ok: true };
    }

    // mode "phone": tìm user theo SĐT (User.phone @unique).
    const target = await db.user.findUnique({ where: { phone: phone! } });
    if (!target) {
      return { fieldErrors: { phone: "Không tìm thấy người dùng với số này." } };
    }

    // Không cho tự thêm chính mình (đã là owner).
    if (target.id === user.id) {
      return { fieldErrors: { phone: "Bạn đã là đội trưởng của đội." } };
    }

    // Đã là thành viên? (@@unique([teamId, userId]) -> findUnique compound).
    const existing = await db.teamMember.findUnique({
      where: { teamId_userId: { teamId, userId: target.id } },
      select: { id: true },
    });
    if (existing) {
      return { fieldErrors: { phone: "Thành viên đã có trong đội." } };
    }

    await db.teamMember.create({
      data: { teamId, userId: target.id, role: TeamRole.MEMBER },
    });
    revalidatePath(`/teams/${teamId}`);
    return { ok: true };
  } catch (err) {
    console.error("addTeamMember error:", err);
    return { error: "Không thêm được thành viên. Thử lại nhé." };
  }
}

// Xóa thành viên (single-arg, useTransition — mirror deleteTeam). Không cho xóa
// owner (chỉ chuyển quyền chủ đội mới xóa được — task sau). Chỉ chủ đội được xóa.
export async function removeTeamMember(args: {
  teamId: string;
  userId: string;
}): Promise<TeamActionState> {
  const user = await requireUser();
  const { teamId, userId } = args;

  const team = await db.team.findUnique({
    where: { id: teamId },
    select: { ownerId: true },
  });
  if (!team) return { error: "Đội không tồn tại." };
  if (team.ownerId !== user.id) {
    return { error: "Bạn không có quyền quản lý đội này." };
  }
  if (userId === team.ownerId) {
    return { error: "Không thể xóa đội trưởng khỏi đội." };
  }

  try {
    await db.teamMember.delete({
      where: { teamId_userId: { teamId, userId } },
    });
    revalidatePath(`/teams/${teamId}`);
    return { ok: true };
  } catch (err) {
    console.error("removeTeamMember error:", err);
    return { error: "Không xóa được thành viên. Thử lại nhé." };
  }
}

// Map lỗi zod -> fieldErrors cho createTeamMatch (first-wins per field).
const TEAM_MATCH_FIELDS = [
  "fieldType",
  "playTime",
  "area",
  "opponentName",
  "sideAName",
  "sideBName",
] as const;

function toTeamMatchFieldErrors(
  issues: { path: PropertyKey[]; message: string }[],
): NonNullable<CreateTeamMatchState["fieldErrors"]> {
  const fieldErrors: NonNullable<CreateTeamMatchState["fieldErrors"]> = {};
  for (const issue of issues) {
    const key = issue.path[0];
    if (
      typeof key === "string" &&
      (TEAM_MATCH_FIELDS as readonly string[]).includes(key)
    ) {
      const fieldKey = key as keyof NonNullable<CreateTeamMatchState["fieldErrors"]>;
      if (!fieldErrors[fieldKey]) fieldErrors[fieldKey] = issue.message;
    }
  }
  return fieldErrors;
}

// Tạo trận cho team (từ team detail). 2 loại:
// - kind "opponent": đá kèo — matchType FIND_OPPONENT, opponentName = tên đối thủ.
// - kind "internal": đá nội bộ — matchType INTERNAL, sideAName/sideBName = 2 bên.
// Trận đều sắp tới (status OPEN, chưa tỷ số), isPrivate=true (không lên /matches).
// Chỉ chủ đội được tạo. skillTiers: mảng rỗng (trận private không lọc trình độ).
export async function createTeamMatch(
  _prev: CreateTeamMatchState,
  formData: FormData,
): Promise<CreateTeamMatchState> {
  const user = await requireUser();

  const parsed = createTeamMatchSchema.safeParse({
    teamId: formData.get("teamId"),
    kind: formData.get("kind"),
    fieldType: formData.get("fieldType"),
    playTime: formData.get("playTime"),
    area: formData.get("area"),
    opponentName: formData.get("opponentName"),
    sideAName: formData.get("sideAName"),
    sideBName: formData.get("sideBName"),
  });
  if (!parsed.success) {
    return { fieldErrors: toTeamMatchFieldErrors(parsed.error.issues) };
  }

  const { teamId, kind, fieldType, playTime, area } = parsed.data;
  const owned = await getOwnedTeam(teamId, user.id);
  if ("error" in owned) return { error: owned.error };

  const isInternal = kind === "internal";
  const matchType = isInternal ? MatchType.INTERNAL : MatchType.FIND_OPPONENT;
  // internal: home=sideA, away=sideB. opponent: home=team (đội nhà), away=đối thủ.
  const sideAName = isInternal ? parsed.data.sideAName! : null;
  const sideBName = isInternal ? parsed.data.sideBName! : null;
  const opponentName = isInternal ? null : parsed.data.opponentName!;

  try {
    await db.match.create({
      data: {
        creatorId: user.id,
        teamId,
        matchType,
        fieldType,
        // Trận private không lọc trình độ (mảng rỗng).
        skillTiers: [],
        area: area || null,
        playTimes: [playTime],
        status: "OPEN",
        isPrivate: true,
        opponentName,
        sideAName,
        sideBName,
      },
    });
    revalidatePath(`/teams/${teamId}`);
    return { ok: true };
  } catch (err) {
    console.error("createTeamMatch error:", err);
    return { error: "Không tạo được trận. Thử lại nhé." };
  }
}
