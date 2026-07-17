"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { createTeamSchema, type TeamFormState } from "./schemas";
import { TeamRole } from "@/generated/prisma/enums";

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

  // Ownership check: đội tồn tại + user là chủ.
  const existing = await db.team.findUnique({
    where: { id: teamId },
    select: { ownerId: true },
  });
  if (!existing) return { error: "Đội không tồn tại." };
  if (existing.ownerId !== user.id) {
    return { error: "Bạn không có quyền sửa đội này." };
  }

  const { name, skillTier, homeArea } = parsed.data;

  try {
    await db.team.update({
      where: { id: teamId },
      data: { name, skillTier, homeArea: homeArea || null },
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
