"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireUser, requireAdmin } from "@/lib/session";
import { MatchType } from "@/generated/prisma/enums";
import type { Match } from "@/generated/prisma/client";
import {
  createTournamentSchema,
  updateTournamentSchema,
  addParticipantSchema,
  addTournamentPlayerSchema,
  updateTournamentMatchSchema,
  updateTournamentParticipantSchema,
  parseTournamentPlayTime,
  type TournamentFormState,
  type AddParticipantState,
  type AddTournamentPlayerState,
  type UpdateTournamentMatchState,
  type UpdateTournamentParticipantState,
} from "./schemas";
import { uploadTournamentBanner, deleteTournamentBanner } from "@/lib/supabase-storage";
import { generateRoundRobinPairs } from "./round-robin";
import { slugify } from "@/lib/slugify";

// Giới hạn upload banner giải: MIME + dung lượng (5MB).
const BANNER_ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const BANNER_MAX_BYTES = 5 * 1024 * 1024;

// State chung cho action đơn (delete/approve/reject/cancel/start).
export type TournamentActionState = { ok?: true; error?: string };

// Map lỗi zod -> fieldErrors (first-wins per field). Mirror toFieldErrors team.
function toFieldErrors(
  issues: { path: PropertyKey[]; message: string }[],
): TournamentFormState["fieldErrors"] {
  const fieldErrors: NonNullable<TournamentFormState["fieldErrors"]> = {};
  for (const issue of issues) {
    const key = issue.path[0];
    if (typeof key === "string") {
      const fieldKey = key as keyof NonNullable<TournamentFormState["fieldErrors"]>;
      if (!fieldErrors[fieldKey]) fieldErrors[fieldKey] = issue.message;
    }
  }
  return fieldErrors;
}

// Tạo giải mới. organizer = user đăng nhập. Status mặc định DRAFT.
// Sinh slug unique từ name (slugify bỏ dấu tiếng Việt) + auto suffix -2, -3...
// Trả { ok, slug } để dialog redirect sang /tournaments/[slug].
export async function createTournament(
  _prev: TournamentFormState,
  formData: FormData,
): Promise<TournamentFormState> {
  const user = await requireUser();

  const parsed = createTournamentSchema.safeParse({
    name: formData.get("name"),
    fieldType: formData.get("fieldType"),
    format: formData.get("format") ?? "LEAGUE",
    skillTier: formData.get("skillTier") || undefined,
    area: formData.get("area"),
    description: formData.get("description"),
  });
  if (!parsed.success) {
    return { fieldErrors: toFieldErrors(parsed.error.issues) };
  }

  const { name, fieldType, format, skillTier, area, description } = parsed.data;

  // Sinh slug unique: thử baseSlug, nếu trùng -> baseSlug-2, -3... đến khi free.
  const baseSlug = slugify(name);
  let slug = baseSlug;
  let suffix = 2;
  while (
    await db.tournament.findUnique({ where: { slug }, select: { id: true } })
  ) {
    slug = `${baseSlug}-${suffix}`;
    suffix += 1;
  }

  try {
    await db.tournament.create({
      data: {
        name,
        slug,
        fieldType,
        format,
        skillTier: skillTier ?? null,
        area: area || null,
        description: description || null,
        organizerId: user.id,
        status: "DRAFT",
      },
      select: { id: true },
    });
    revalidatePath("/tournaments");
    revalidatePath("/my-tournaments");
    // Trả slug qua state để dialog redirect sang /tournaments/[slug].
    return { ok: true, slug };
  } catch (err) {
    // Race condition: 2 user tạo giải cùng tên cùng lúc -> cùng check slug free
    // -> cùng insert -> unique violation. Retry 1 lần với suffix mới.
    const msg = err instanceof Error ? err.message : "";
    if (msg.includes("slug") || msg.includes("Unique")) {
      const retrySlug = `${baseSlug}-${suffix}`;
      try {
        await db.tournament.create({
          data: {
            name,
            slug: retrySlug,
            fieldType,
            format,
            skillTier: skillTier ?? null,
            area: area || null,
            description: description || null,
            organizerId: user.id,
            status: "DRAFT",
          },
          select: { id: true },
        });
        revalidatePath("/tournaments");
        revalidatePath("/my-tournaments");
        return { ok: true, slug: retrySlug };
      } catch (retryErr) {
        console.error("createTournament retry error:", retryErr);
        return { error: "Không tạo được giải. Thử lại nhé." };
      }
    }
    console.error("createTournament error:", err);
    return { error: "Không tạo được giải. Thử lại nhé." };
  }
}

// Sửa giải. Chỉ organizer. Sau APPROVED: chỉ cho phép description/area/banner
// (skip name/fieldType/format/skillTier trong parsed data).
export async function updateTournament(
  _prev: TournamentFormState,
  formData: FormData,
): Promise<TournamentFormState> {
  const user = await requireUser();
  const id = String(formData.get("id") ?? "");

  const parsed = updateTournamentSchema.safeParse({
    id,
    name: formData.get("name"),
    fieldType: formData.get("fieldType"),
    format: formData.get("format") ?? "LEAGUE",
    skillTier: formData.get("skillTier") || undefined,
    area: formData.get("area"),
    description: formData.get("description"),
  });
  if (!parsed.success) {
    return { fieldErrors: toFieldErrors(parsed.error.issues) };
  }

  const existing = await db.tournament.findUnique({
    where: { id: parsed.data.id },
    select: { organizerId: true, status: true, bannerUrl: true },
  });
  if (!existing) return { error: "Giải không tồn tại." };
  if (existing.organizerId !== user.id) {
    return { error: "Bạn không có quyền sửa giải này." };
  }

  const locked = existing.status === "COMPLETED";
  // Field cho phép sửa luôn: description, area, banner. Field cấu trúc (name,
  // fieldType, format, skillTier) chỉ sửa khi giải chưa COMPLETED (APPROVED vẫn sửa được).
  const data: Record<string, unknown> = {
    description: parsed.data.description || null,
    area: parsed.data.area || null,
  };
  if (!locked) {
    data.name = parsed.data.name;
    data.fieldType = parsed.data.fieldType;
    data.format = parsed.data.format;
    data.skillTier = parsed.data.skillTier ?? null;
  }

  // Upload banner (tùy chọn).
  const bannerEntry = formData.get("banner");
  if (bannerEntry instanceof File && bannerEntry.size > 0) {
    if (!BANNER_ALLOWED_TYPES.includes(bannerEntry.type)) {
      return { error: "Chỉ nhận ảnh JPG, PNG hoặc WebP." };
    }
    if (bannerEntry.size > BANNER_MAX_BYTES) {
      return { error: "Ảnh bìa tối đa 5MB." };
    }
    try {
      const { publicUrl } = await uploadTournamentBanner(bannerEntry, parsed.data.id);
      data.bannerUrl = publicUrl;
      if (existing.bannerUrl) {
        await deleteTournamentBanner(existing.bannerUrl);
      }
    } catch (err) {
      console.error("uploadTournamentBanner error:", err);
      return { error: "Không tải được ảnh bìa. Thử lại nhé." };
    }
  }

  try {
    await db.tournament.update({ where: { id: parsed.data.id }, data });
    revalidatePath("/tournaments");
    revalidatePath("/tournaments/[slug]", "page");
    revalidatePath("/my-tournaments");
    return { ok: true };
  } catch (err) {
    console.error("updateTournament error:", err);
    return { error: "Không cập nhật được giải. Thử lại nhé." };
  }
}

// Xóa giải. Organizer, chỉ DRAFT/REJECTED. Cascade xóa participants + matches.
export async function deleteTournament(
  tournamentId: string,
): Promise<TournamentActionState> {
  const user = await requireUser();
  const tournament = await db.tournament.findUnique({
    where: { id: tournamentId },
    select: { organizerId: true, status: true },
  });
  if (!tournament) return { error: "Giải không tồn tại." };
  if (tournament.organizerId !== user.id) {
    return { error: "Bạn không có quyền xóa giải này." };
  }
  if (tournament.status !== "DRAFT" && tournament.status !== "REJECTED") {
    return { error: "Chỉ xóa được giải ở trạng thái bản nháp hoặc bị từ chối." };
  }

  try {
    await db.tournament.delete({ where: { id: tournamentId } });
    revalidatePath("/tournaments");
    revalidatePath("/my-tournaments");
    return { ok: true };
  } catch (err) {
    console.error("deleteTournament error:", err);
    return { error: "Không xóa được giải. Thử lại nhé." };
  }
}

// Organizer gửi duyệt: DRAFT/REJECTED -> PENDING. Yêu cầu ≥ 2 participant.
export async function submitTournamentForApproval(
  tournamentId: string,
): Promise<TournamentActionState> {
  const user = await requireUser();
  const tournament = await db.tournament.findUnique({
    where: { id: tournamentId },
    select: { organizerId: true, status: true },
  });
  if (!tournament) return { error: "Giải không tồn tại." };
  if (tournament.organizerId !== user.id) {
    return { error: "Bạn không có quyền thao tác giải này." };
  }
  if (tournament.status !== "DRAFT" && tournament.status !== "REJECTED") {
    return { error: "Chỉ gửi duyệt được giải bản nháp hoặc bị từ chối." };
  }

  const participantCount = await db.tournamentParticipant.count({
    where: { tournamentId },
  });
  if (participantCount < 2) {
    return { error: "Cần ít nhất 2 đội tham gia trước khi gửi duyệt." };
  }

  try {
    await db.tournament.update({
      where: { id: tournamentId },
      data: { status: "PENDING" },
    });
    revalidatePath("/tournaments");
    revalidatePath("/tournaments/[slug]", "page");
    revalidatePath("/my-tournaments");
    return { ok: true };
  } catch (err) {
    console.error("submitTournamentForApproval error:", err);
    return { error: "Không gửi duyệt được. Thử lại nhé." };
  }
}

// ADMIN duyệt: PENDING -> APPROVED.
export async function approveTournament(
  tournamentId: string,
): Promise<TournamentActionState> {
  await requireAdmin();
  const tournament = await db.tournament.findUnique({
    where: { id: tournamentId },
    select: { status: true },
  });
  if (!tournament) return { error: "Giải không tồn tại." };
  if (tournament.status !== "PENDING") {
    return { error: "Chỉ duyệt được giải đang chờ." };
  }

  try {
    await db.tournament.update({
      where: { id: tournamentId },
      data: { status: "APPROVED" },
    });
    revalidatePath("/tournaments");
    revalidatePath("/tournaments/[slug]", "page");
    revalidatePath("/my-tournaments");
    return { ok: true };
  } catch (err) {
    console.error("approveTournament error:", err);
    return { error: "Không duyệt được giải. Thử lại nhé." };
  }
}

// ADMIN từ chối: PENDING -> REJECTED. Organizer sửa + gửi lại được.
export async function rejectTournament(
  tournamentId: string,
): Promise<TournamentActionState> {
  await requireAdmin();
  const tournament = await db.tournament.findUnique({
    where: { id: tournamentId },
    select: { status: true },
  });
  if (!tournament) return { error: "Giải không tồn tại." };
  if (tournament.status !== "PENDING") {
    return { error: "Chỉ từ chối được giải đang chờ." };
  }

  try {
    await db.tournament.update({
      where: { id: tournamentId },
      data: { status: "REJECTED" },
    });
    revalidatePath("/tournaments");
    revalidatePath("/tournaments/[slug]", "page");
    revalidatePath("/my-tournaments");
    return { ok: true };
  } catch (err) {
    console.error("rejectTournament error:", err);
    return { error: "Không từ chối được giải. Thử lại nhé." };
  }
}

// Thêm participant. Organizer, chỉ DRAFT/REJECTED. 2 mode:
// - "team": chọn team hệ thống -> copy Team.name sang displayName.
// - "name": nhập tên team lẻ. Unique trong giải (catch Prisma unique violation).
export async function addTournamentParticipant(
  _prev: AddParticipantState,
  formData: FormData,
): Promise<AddParticipantState> {
  const user = await requireUser();

  const parsed = addParticipantSchema.safeParse({
    tournamentId: formData.get("tournamentId"),
    mode: formData.get("mode"),
    teamId: formData.get("teamId") || undefined,
    displayName: formData.get("displayName") || undefined,
  });
  if (!parsed.success) {
    const fieldErrors: NonNullable<AddParticipantState["fieldErrors"]> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0];
      if (key === "teamId" || key === "displayName") {
        if (!fieldErrors[key]) fieldErrors[key] = issue.message;
      }
    }
    return { fieldErrors };
  }

  const { tournamentId, mode, teamId, displayName } = parsed.data;

  const tournament = await db.tournament.findUnique({
    where: { id: tournamentId },
    select: { organizerId: true, status: true },
  });
  if (!tournament) return { error: "Giải không tồn tại." };
  if (tournament.organizerId !== user.id) {
    return { error: "Bạn không có quyền quản lý giải này." };
  }
  if (tournament.status !== "DRAFT" && tournament.status !== "REJECTED") {
    return { error: "Không thêm được đội khi giải đã duyệt hoặc đang chờ." };
  }

  try {
    if (mode === "team") {
      // Load team -> copy name sang displayName (đảm bảo tên đồng bộ với Team).
      const team = await db.team.findUnique({
        where: { id: teamId! },
        select: { name: true },
      });
      if (!team) {
        return { fieldErrors: { teamId: "Đội không tồn tại." } };
      }
      await db.tournamentParticipant.create({
        data: {
          tournamentId,
          teamId: teamId!,
          displayName: team.name,
          status: "ACCEPTED",
        },
      });
    } else {
      await db.tournamentParticipant.create({
        data: {
          tournamentId,
          teamId: null,
          displayName: displayName!,
          status: "ACCEPTED",
        },
      });
    }
    revalidatePath("/tournaments/[slug]", "page");
    return { ok: true };
  } catch (err) {
    // Prisma unique violation: trùng displayName trong giải.
    const msg = err instanceof Error ? err.message : "";
    if (msg.includes("display_name") || msg.includes("Unique")) {
      return {
        fieldErrors: {
          [mode === "team" ? "teamId" : "displayName"]: "Đội đã có trong giải.",
        },
      };
    }
    console.error("addTournamentParticipant error:", err);
    return { error: "Không thêm được đội. Thử lại nhé." };
  }
}

// Xóa participant. Organizer, chỉ DRAFT/REJECTED. Sau khi sinh fixture vẫn xóa được
// (lịch cũ không tự cập nhật — organizer "Sinh lại lịch" để áp dụng đội mới).
export async function removeTournamentParticipant(args: {
  tournamentId: string;
  participantId: string;
}): Promise<TournamentActionState> {
  const user = await requireUser();
  const { tournamentId, participantId } = args;

  const tournament = await db.tournament.findUnique({
    where: { id: tournamentId },
    select: { organizerId: true, status: true },
  });
  if (!tournament) return { error: "Giải không tồn tại." };
  if (tournament.organizerId !== user.id) {
    return { error: "Bạn không có quyền quản lý giải này." };
  }
  if (tournament.status !== "DRAFT" && tournament.status !== "REJECTED") {
    return { error: "Không xóa được đội khi giải đã duyệt." };
  }

  try {
    await db.tournamentParticipant.delete({ where: { id: participantId } });
    revalidatePath("/tournaments/[slug]", "page");
    return { ok: true };
  } catch (err) {
    console.error("removeTournamentParticipant error:", err);
    return { error: "Không xóa được đội. Thử lại nhé." };
  }
}

// Sửa tên đội (displayName) của 1 participant. Organizer, chỉ DRAFT/REJECTED.
// Đổi tên trong giải (displayName), không động Team.name gốc. Nếu đã sinh fixture
// -> match.sideAName/sideBName cũ không tự đổi; organizer "Sinh lại lịch" để áp dụng.
export async function updateTournamentParticipant(
  _prev: UpdateTournamentParticipantState,
  formData: FormData,
): Promise<UpdateTournamentParticipantState> {
  const user = await requireUser();

  const parsed = updateTournamentParticipantSchema.safeParse({
    participantId: formData.get("participantId"),
    displayName: formData.get("displayName"),
  });
  if (!parsed.success) {
    const fieldErrors: NonNullable<
      UpdateTournamentParticipantState["fieldErrors"]
    > = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0];
      if (key === "displayName") {
        if (!fieldErrors[key]) fieldErrors[key] = issue.message;
      }
    }
    return { fieldErrors };
  }

  const { participantId, displayName } = parsed.data;

  const participant = await db.tournamentParticipant.findUnique({
    where: { id: participantId },
    select: {
      tournamentId: true,
      tournament: { select: { organizerId: true, status: true } },
    },
  });
  if (!participant) return { error: "Đội không tồn tại trong giải." };
  if (participant.tournament.organizerId !== user.id) {
    return { error: "Bạn không có quyền quản lý giải này." };
  }
  if (
    participant.tournament.status !== "DRAFT" &&
    participant.tournament.status !== "REJECTED"
  ) {
    return { error: "Không sửa được đội khi giải đã duyệt." };
  }

  try {
    await db.tournamentParticipant.update({
      where: { id: participantId },
      data: { displayName },
    });
    revalidatePath("/tournaments/[slug]", "page");
    return { ok: true };
  } catch (err) {
    // Prisma unique violation: trùng displayName trong giải.
    const msg = err instanceof Error ? err.message : "";
    if (msg.includes("display_name") || msg.includes("Unique")) {
      return {
        fieldErrors: { displayName: "Tên đội đã có trong giải." },
      };
    }
    console.error("updateTournamentParticipant error:", err);
    return { error: "Không sửa được đội. Thử lại nhé." };
  }
}

// Tạo Match INTERNAL cho mỗi cặp round-robin. Helper dùng chung bởi
// startTournament (backward-compat) + generateTournamentFixtures +
// regenerateTournamentFixtures. Match rỗng: playTimes [], fieldId null, status OPEN.
async function createFixtureMatches(
  tx: Parameters<Parameters<typeof db.$transaction>[0]>[0],
  tournamentId: string,
  pairs: ReturnType<typeof generateRoundRobinPairs>,
  fieldType: string,
  creatorId: string,
) {
  await tx.match.createMany({
    data: pairs.map((p) => ({
      creatorId,
      teamId: p.home.teamId ?? null,
      matchType: MatchType.INTERNAL,
      fieldType: fieldType as Match["fieldType"],
      skillTiers: [],
      playTimes: [],
      status: "OPEN",
      isPrivate: true,
      sideAName: p.home.displayName,
      sideBName: p.away.displayName,
      tournamentId,
      round: p.round,
    })),
  });
}

// Load participants ACCEPTED + sinh cặp round-robin. Trả pairs hoặc throw Error
// (caller catch + return error state). Dùng chung bởi 3 action fixture.
async function loadParticipantPairs(tournamentId: string) {
  const participants = await db.tournamentParticipant.findMany({
    where: { tournamentId, status: "ACCEPTED" },
    select: { id: true, displayName: true, teamId: true },
  });
  if (participants.length < 2) {
    throw new Error("Cần ít nhất 2 đội để sinh lịch đấu.");
  }
  return generateRoundRobinPairs(participants);
}

// Organizer "Tạo lịch đấu": sinh fixture (League round-robin) sớm — không cần chờ
// ADMIN duyệt. Mọi status trừ COMPLETED/CANCELLED. Chạy được khi chưa có fixture;
// nếu đã có -> lỗi (dùng regenerateTournamentFixtures để làm mới).
export async function generateTournamentFixtures(
  tournamentId: string,
): Promise<TournamentActionState & { matchCount?: number }> {
  const user = await requireUser();
  const tournament = await db.tournament.findUnique({
    where: { id: tournamentId },
    select: { organizerId: true, status: true, fieldType: true },
  });
  if (!tournament) return { error: "Giải không tồn tại." };
  if (tournament.organizerId !== user.id) {
    return { error: "Bạn không có quyền thao tác giải này." };
  }
  if (tournament.status === "COMPLETED" || tournament.status === "CANCELLED") {
    return { error: "Giải đã kết thúc hoặc bị hủy — không tạo được lịch." };
  }

  const existingCount = await db.match.count({ where: { tournamentId } });
  if (existingCount > 0) {
    return { error: "Giải đã có lịch đấu. Bấm \"Sinh lại lịch\" để làm mới." };
  }

  let pairs: ReturnType<typeof generateRoundRobinPairs>;
  try {
    pairs = await loadParticipantPairs(tournamentId);
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Không sinh được lịch." };
  }

  try {
    await db.$transaction(async (tx) => {
      await createFixtureMatches(
        tx,
        tournamentId,
        pairs,
        tournament.fieldType,
        user.id,
      );
    });
    revalidatePath("/tournaments/[slug]", "page");
    return { ok: true, matchCount: pairs.length };
  } catch (err) {
    console.error("generateTournamentFixtures error:", err);
    return { error: "Không sinh được lịch đấu. Thử lại nhé." };
  }
}

// Organizer "Sinh lại lịch": xóa fixture cũ + sinh lại mới. Không set startedAt.
// Block khi có match COMPLETED (tránh mất kết quả đã ghi). Mọi status trừ
// COMPLETED/CANCELLED.
export async function regenerateTournamentFixtures(
  tournamentId: string,
): Promise<TournamentActionState & { matchCount?: number }> {
  const user = await requireUser();
  const tournament = await db.tournament.findUnique({
    where: { id: tournamentId },
    select: { organizerId: true, status: true, fieldType: true },
  });
  if (!tournament) return { error: "Giải không tồn tại." };
  if (tournament.organizerId !== user.id) {
    return { error: "Bạn không có quyền thao tác giải này." };
  }
  if (tournament.status === "COMPLETED" || tournament.status === "CANCELLED") {
    return { error: "Giải đã kết thúc hoặc bị hủy — không sinh lại được." };
  }

  const completedCount = await db.match.count({
    where: { tournamentId, status: "COMPLETED" },
  });
  if (completedCount > 0) {
    return { error: "Không sinh lại được khi đã có trận đá xong." };
  }

  let pairs: ReturnType<typeof generateRoundRobinPairs>;
  try {
    pairs = await loadParticipantPairs(tournamentId);
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Không sinh được lịch." };
  }

  try {
    await db.$transaction(async (tx) => {
      // Xóa hết match thuộc giải (PlayerStat cascade theo match).
      await tx.match.deleteMany({ where: { tournamentId } });
      await createFixtureMatches(
        tx,
        tournamentId,
        pairs,
        tournament.fieldType,
        user.id,
      );
    });
    revalidatePath("/tournaments/[slug]", "page");
    return { ok: true, matchCount: pairs.length };
  } catch (err) {
    console.error("regenerateTournamentFixtures error:", err);
    return { error: "Không sinh lại được lịch. Thử lại nhé." };
  }
}

// Organizer "Bắt đầu giải": APPROVED -> set startedAt (lock participants). Không
// sinh fixture nữa (tách ra generateTournamentFixtures). Backward-compat: nếu
// chưa có fixture thì tự sinh trong cùng transaction.
export async function startTournament(
  tournamentId: string,
): Promise<TournamentActionState> {
  const user = await requireUser();
  const tournament = await db.tournament.findUnique({
    where: { id: tournamentId },
    select: { organizerId: true, status: true, startedAt: true, fieldType: true },
  });
  if (!tournament) return { error: "Giải không tồn tại." };
  if (tournament.organizerId !== user.id) {
    return { error: "Bạn không có quyền thao tác giải này." };
  }
  if (tournament.status !== "APPROVED") {
    return { error: "Chỉ bắt đầu được giải đã duyệt." };
  }
  if (tournament.startedAt) {
    return { error: "Giải đã bắt đầu." };
  }

  const existingCount = await db.match.count({ where: { tournamentId } });
  let pairs: ReturnType<typeof generateRoundRobinPairs> | null = null;
  if (existingCount === 0) {
    try {
      pairs = await loadParticipantPairs(tournamentId);
    } catch (err) {
      return { error: err instanceof Error ? err.message : "Không bắt đầu được giải." };
    }
  }

  try {
    await db.$transaction(async (tx) => {
      if (pairs) {
        await createFixtureMatches(
          tx,
          tournamentId,
          pairs,
          tournament.fieldType,
          user.id,
        );
      }
      await tx.tournament.update({
        where: { id: tournamentId },
        data: { startedAt: new Date() },
      });
    });
    revalidatePath("/tournaments/[slug]", "page");
    revalidatePath("/tournaments");
    return { ok: true };
  } catch (err) {
    console.error("startTournament error:", err);
    return { error: "Không bắt đầu được giải. Thử lại nhé." };
  }
}

// Hủy giải. Organizer hoặc ADMIN. Mọi status (trừ COMPLETED) -> CANCELLED.
// Match chưa COMPLETED -> CANCELLED (transaction).
export async function cancelTournament(
  tournamentId: string,
): Promise<TournamentActionState> {
  const user = await requireUser();
  const tournament = await db.tournament.findUnique({
    where: { id: tournamentId },
    select: { organizerId: true, status: true },
  });
  if (!tournament) return { error: "Giải không tồn tại." };
  const isOrganizer = tournament.organizerId === user.id;
  const isAdmin = user.role === "ADMIN";
  if (!isOrganizer && !isAdmin) {
    return { error: "Bạn không có quyền hủy giải này." };
  }
  if (tournament.status === "COMPLETED") {
    return { error: "Giải đã kết thúc — không hủy được." };
  }
  if (tournament.status === "CANCELLED") return { ok: true };

  try {
    await db.$transaction([
      db.tournament.update({
        where: { id: tournamentId },
        data: { status: "CANCELLED" },
      }),
      db.match.updateMany({
        where: {
          tournamentId,
          status: { in: ["OPEN", "MATCHED", "CONFIRMED"] },
        },
        data: { status: "CANCELLED" },
      }),
    ]);
    revalidatePath("/tournaments");
    revalidatePath("/tournaments/[slug]", "page");
    revalidatePath("/my-tournaments");
    return { ok: true };
  } catch (err) {
    console.error("cancelTournament error:", err);
    return { error: "Không hủy được giải. Thử lại nhé." };
  }
}

// Thêm cầu thủ vào 1 participant. Organizer, chỉ khi giải DRAFT/REJECTED (chưa
// gửi duyệt — chốt đội hình trước). 2 mode:
// - "member": chọn TeamMember (participant phải có teamId) -> copy user.name/phone
//   sang displayName, gắn userId.
// - "name": nhập tay cầu thủ ngoài -> userId null, chỉ displayName.
// jerseyNumber tùy chọn. Catch unique violation: trùng userId hoặc trùng số áo.
export async function addTournamentPlayer(
  _prev: AddTournamentPlayerState,
  formData: FormData,
): Promise<AddTournamentPlayerState> {
  const user = await requireUser();

  const parsed = addTournamentPlayerSchema.safeParse({
    participantId: formData.get("participantId"),
    mode: formData.get("mode"),
    userId: formData.get("userId") || undefined,
    displayName: formData.get("displayName") || undefined,
    // FormData.get trả string -> coerce sang number (coerce.skipNaN không dùng
    // ở schema, parse ở đây: empty string -> undefined, còn lại Number()).
    jerseyNumber: (() => {
      const raw = formData.get("jerseyNumber");
      if (raw === null || raw === "") return undefined;
      const n = Number(raw);
      return Number.isNaN(n) ? undefined : n;
    })(),
  });
  if (!parsed.success) {
    const fieldErrors: NonNullable<AddTournamentPlayerState["fieldErrors"]> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0];
      if (key === "userId" || key === "displayName" || key === "jerseyNumber") {
        if (!fieldErrors[key]) fieldErrors[key] = issue.message;
      }
    }
    return { fieldErrors };
  }

  const { participantId, mode, userId, displayName, jerseyNumber } = parsed.data;

  // Load participant + tournament để check organizer + status + teamId.
  const participant = await db.tournamentParticipant.findUnique({
    where: { id: participantId },
    select: {
      tournamentId: true,
      teamId: true,
      tournament: { select: { organizerId: true, status: true } },
    },
  });
  if (!participant) return { error: "Đội không tồn tại trong giải." };
  if (participant.tournament.organizerId !== user.id) {
    return { error: "Bạn không có quyền quản lý giải này." };
  }
  const status = participant.tournament.status;
  if (status !== "DRAFT" && status !== "REJECTED") {
    return { error: "Không thêm được cầu thủ khi giải đã duyệt hoặc đang chờ." };
  }

  // Mode "member": participant phải có teamId + TeamMember phải thuộc team đó.
  let resolvedDisplayName = displayName;
  let resolvedUserId = userId;
  if (mode === "member") {
    if (!participant.teamId) {
      return { fieldErrors: { userId: "Đội lẻ không chọn được thành viên." } };
    }
    const member = await db.teamMember.findUnique({
      where: { teamId_userId: { teamId: participant.teamId, userId: userId! } },
      include: { user: { select: { name: true, phone: true } } },
    });
    if (!member) {
      return { fieldErrors: { userId: "Cầu thủ không thuộc đội này." } };
    }
    resolvedDisplayName = member.user.name ?? member.user.phone ?? "—";
    // resolvedUserId giữ nguyên = userId (chọn từ TeamMember).
  } else {
    // Mode "name": cầu thủ ngoài, userId null.
    resolvedUserId = null;
  }

  try {
    await db.tournamentPlayer.create({
      data: {
        participantId,
        userId: resolvedUserId,
        displayName: resolvedDisplayName!,
        jerseyNumber: jerseyNumber ?? null,
      },
    });
    revalidatePath("/tournaments/[slug]", "page");
    return { ok: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "";
    // Prisma unique violation cho (participantId, userId) hoặc (participantId, jerseyNumber).
    if (msg.includes("user_id") || msg.includes("participant_id_user_id")) {
      return { fieldErrors: { userId: "Cầu thủ đã có trong đội." } };
    }
    if (
      msg.includes("jersey_number") ||
      msg.includes("participant_id_jersey_number")
    ) {
      return { fieldErrors: { jerseyNumber: "Số áo đã có trong đội." } };
    }
    console.error("addTournamentPlayer error:", err);
    return { error: "Không thêm được cầu thủ. Thử lại nhé." };
  }
}

// Xóa cầu thủ khỏi participant. Organizer, chỉ khi giải DRAFT/REJECTED.
// Mirror removeTournamentParticipant (single-arg, useTransition).
export async function removeTournamentPlayer(args: {
  playerId: string;
  participantId: string;
}): Promise<TournamentActionState> {
  const user = await requireUser();
  const { playerId, participantId } = args;

  const player = await db.tournamentPlayer.findUnique({
    where: { id: playerId },
    select: {
      participantId: true,
      participant: {
        select: {
          tournamentId: true,
          tournament: { select: { organizerId: true, status: true } },
        },
      },
    },
  });
  if (!player) return { error: "Cầu thủ không tồn tại." };
  if (player.participantId !== participantId) {
    return { error: "Cầu thủ không thuộc đội này." };
  }
  if (player.participant.tournament.organizerId !== user.id) {
    return { error: "Bạn không có quyền quản lý giải này." };
  }
  const status = player.participant.tournament.status;
  if (status !== "DRAFT" && status !== "REJECTED") {
    return { error: "Không xóa được cầu thủ khi giải đã duyệt." };
  }

  try {
    await db.tournamentPlayer.delete({ where: { id: playerId } });
    revalidatePath("/tournaments/[slug]", "page");
    return { ok: true };
  } catch (err) {
    console.error("removeTournamentPlayer error:", err);
    return { error: "Không xóa được cầu thủ. Thử lại nhé." };
  }
}

// Sửa 1 trận trong giải (organizer, dialog "Sửa trận"). Cập nhật playTime, area,
// tỷ số, 2 đội (home/away participant), và danh sách bàn (scorer + assist).
// homeScore/awayScore: cả 2 null -> status OPEN lại; cả 2 number -> COMPLETED.
// Đổi đội -> cập nhật sideAName/sideBName (snapshot tên participant) + teamId (home).
// Bàn -> ghi PlayerStat (aggregate per player). Hỗ trợ cả user hệ thống (userId)
// và cầu thủ ngoài (participantPlayerId). Mirror updateMatchResult (matches feature).
export async function updateTournamentMatch(
  _prev: UpdateTournamentMatchState,
  formData: FormData,
): Promise<UpdateTournamentMatchState> {
  const user = await requireUser();

  const homeScoreRaw = formData.get("homeScore");
  const awayScoreRaw = formData.get("awayScore");
  const toScore = (raw: FormDataEntryValue | null) => {
    if (raw === null || raw === "") return undefined;
    const n = Number(raw);
    return Number.isNaN(n) ? undefined : n;
  };
  const toUuid = (raw: FormDataEntryValue | null) => {
    if (raw === null || raw === "") return undefined;
    return String(raw);
  };

  // Parse scorers từ FormData: hidden inputs scorers[i].scorerKey/assistKey/side.
  // FormData.getAll trả mảng value theo thứ tự append — ghép 3 mảng song song.
  const scorerKeys = formData.getAll("scorerKey");
  const assistKeys = formData.getAll("assistKey");
  const sides = formData.getAll("side");
  const scorers = scorerKeys.map((sk, i) => ({
    scorerKey: String(sk),
    assistKey: assistKeys[i] ? String(assistKeys[i]) : null,
    side: String(sides[i] ?? "home") as "home" | "away",
  }));

  const parsed = updateTournamentMatchSchema.safeParse({
    matchId: formData.get("matchId"),
    playTime: formData.get("playTime") || undefined,
    area: formData.get("area") || undefined,
    homeScore: toScore(homeScoreRaw),
    awayScore: toScore(awayScoreRaw),
    homeParticipantId: toUuid(formData.get("homeParticipantId")),
    awayParticipantId: toUuid(formData.get("awayParticipantId")),
    scorers,
  });
  if (!parsed.success) {
    const fieldErrors: NonNullable<UpdateTournamentMatchState["fieldErrors"]> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0];
      if (
        key === "playTime" ||
        key === "area" ||
        key === "homeScore" ||
        key === "awayScore" ||
        key === "homeParticipantId" ||
        key === "awayParticipantId" ||
        key === "scorers"
      ) {
        if (!fieldErrors[key]) fieldErrors[key] = issue.message;
      }
    }
    return { fieldErrors };
  }

  const { matchId, playTime, area, homeScore, awayScore, homeParticipantId, awayParticipantId, scorers: parsedScorers } =
    parsed.data;

  const match = await db.match.findUnique({
    where: { id: matchId },
    select: {
      status: true,
      tournamentId: true,
      tournament: { select: { organizerId: true } },
    },
  });
  if (!match) return { error: "Trận không tồn tại." };
  if (!match.tournament) return { error: "Trận không thuộc giải nào." };
  if (match.tournament.organizerId !== user.id) {
    return { error: "Bạn không có quyền cập nhật trận này." };
  }
  if (match.status === "CANCELLED") {
    return { error: "Không sửa được trận đã hủy." };
  }

  // Tỷ số: cả 2 number -> COMPLETED; cả 2 null -> OPEN (unset kết quả).
  const hasScore = homeScore != null && awayScore != null;
  const clearedScore = homeScore == null && awayScore == null;
  // Không cho về OPEN nếu đã COMPLETED mà chỉ set 1 bên (refine đã chặn, double-check).
  if (!hasScore && !clearedScore) {
    return { fieldErrors: { awayScore: "Nhập đủ tỷ số 2 bên hoặc để trống cả 2." } };
  }
  // Bàn chỉ cho khi có tỷ số (trận đã đá). Không cho ghi bàn khi chưa set tỷ số.
  if (parsedScorers.length > 0 && !hasScore) {
    return { fieldErrors: { scorers: "Nhập tỷ số trước khi ghi bàn thắng." } };
  }

  // Load participant nếu có chọn đội mới (verify thuộc giải + lấy displayName/teamId/players).
  const tournamentId = match.tournamentId;
  const [homeParticipant, awayParticipant] = await Promise.all([
    homeParticipantId
      ? db.tournamentParticipant.findUnique({
          where: { id: homeParticipantId },
          select: {
            id: true,
            tournamentId: true,
            displayName: true,
            teamId: true,
            players: { select: { id: true, userId: true, displayName: true } },
          },
        })
      : Promise.resolve(null),
    awayParticipantId
      ? db.tournamentParticipant.findUnique({
          where: { id: awayParticipantId },
          select: {
            id: true,
            tournamentId: true,
            displayName: true,
            teamId: true,
            players: { select: { id: true, userId: true, displayName: true } },
          },
        })
      : Promise.resolve(null),
  ]);
  if (homeParticipantId && !homeParticipant) {
    return { fieldErrors: { homeParticipantId: "Đội nhà không thuộc giải." } };
  }
  if (awayParticipantId && !awayParticipant) {
    return { fieldErrors: { awayParticipantId: "Đội khách không thuộc giải." } };
  }
  if (
    homeParticipant &&
    tournamentId &&
    homeParticipant.tournamentId !== tournamentId
  ) {
    return { fieldErrors: { homeParticipantId: "Đội nhà không thuộc giải." } };
  }
  if (
    awayParticipant &&
    tournamentId &&
    awayParticipant.tournamentId !== tournamentId
  ) {
    return { fieldErrors: { awayParticipantId: "Đội khách không thuộc giải." } };
  }

  // Load match hiện tại để resolve participant hiện tại (nếu user không đổi đội).
  // Cần sideAName/sideBName + tournamentId + teamId cho participant hiện tại.
  const currentMatch = await db.match.findUnique({
    where: { id: matchId },
    select: { sideAName: true, sideBName: true, teamId: true },
  });
  // Resolve participant cho home/away: nếu user chọn mới thì dùng mới, ngược lại
  // tìm participant theo sideAName/sideBName snapshot.
  const allParticipants = tournamentId
    ? await db.tournamentParticipant.findMany({
        where: { tournamentId },
        select: { id: true, displayName: true, teamId: true, players: { select: { id: true, userId: true, displayName: true } } },
      })
    : [];
  const byName = new Map(allParticipants.map((p) => [p.displayName, p]));
  const homeP = homeParticipant ?? (currentMatch ? byName.get(currentMatch.sideAName ?? "") ?? null : null);
  const awayP = awayParticipant ?? (currentMatch ? byName.get(currentMatch.sideBName ?? "") ?? null : null);

  // Validate scorers: mỗi scorerKey phải thuộc participant của side (home/away).
  // Key composite: "u:<userId>" hoặc "p:<participantPlayerId>".
  type PlayerRef = { key: string; userId: string | null; participantPlayerId: string | null; displayName: string };
  const resolvePlayer = (key: string, side: "home" | "away"): PlayerRef | null => {
    const participant = side === "home" ? homeP : awayP;
    if (!participant) return null;
    if (key.startsWith("u:")) {
      const userId = key.slice(2);
      const player = participant.players.find((pl) => pl.userId === userId);
      if (!player) return null;
      return { key, userId, participantPlayerId: null, displayName: player.displayName };
    }
    if (key.startsWith("p:")) {
      const playerId = key.slice(2);
      const player = participant.players.find((pl) => pl.id === playerId);
      if (!player) return null;
      return { key, userId: null, participantPlayerId: playerId, displayName: player.displayName };
    }
    return null;
  };
  for (const s of parsedScorers) {
    const scorer = resolvePlayer(s.scorerKey, s.side);
    if (!scorer) {
      return { fieldErrors: { scorers: `Người ghi bàn không thuộc đội ${s.side === "home" ? "nhà" : "khách"}.` } };
    }
    if (s.assistKey) {
      const assist = resolvePlayer(s.assistKey, s.side);
      if (!assist) {
        return { fieldErrors: { scorers: `Người kiến tạo không thuộc đội ${s.side === "home" ? "nhà" : "khách"}.` } };
      }
    }
  }

  // Aggregate PlayerStat: mỗi player 1 row, goals = count làm scorer, assists = count assist.
  // Key = userId ?? participantPlayerId. teamId/participantId theo side.
  const statsByKey = new Map<
    string,
    {
      userId: string | null;
      participantPlayerId: string | null;
      displayName: string;
      teamId: string | null;
      participantId: string | null;
      goals: number;
      assists: number;
    }
  >();
  const upsertStat = (ref: PlayerRef, side: "home" | "away", field: "goals" | "assists") => {
    const participant = side === "home" ? homeP : awayP;
    const statKey = ref.userId ?? ref.participantPlayerId ?? ref.key;
    const existing = statsByKey.get(statKey) ?? {
      userId: ref.userId,
      participantPlayerId: ref.participantPlayerId,
      displayName: ref.displayName,
      teamId: participant?.teamId ?? null,
      participantId: participant?.id ?? null,
      goals: 0,
      assists: 0,
    };
    existing[field] += 1;
    statsByKey.set(statKey, existing);
  };
  for (const s of parsedScorers) {
    const scorer = resolvePlayer(s.scorerKey, s.side)!;
    upsertStat(scorer, s.side, "goals");
    if (s.assistKey) {
      const assist = resolvePlayer(s.assistKey, s.side)!;
      upsertStat(assist, s.side, "assists");
    }
  }

  const playDate = parseTournamentPlayTime(playTime);
  const data: Record<string, unknown> = {
    area: area || null,
    homeScore: hasScore ? homeScore : null,
    awayScore: hasScore ? awayScore : null,
    status: hasScore ? "COMPLETED" : "OPEN",
  };
  // playTime rỗng -> xóa giờ đá (mảng rỗng). Có -> set [playDate].
  data.playTimes = playDate ? [playDate] : [];
  // Đổi đội nhà -> cập nhật sideAName + teamId (Match.teamId = home team).
  if (homeParticipant) {
    data.sideAName = homeParticipant.displayName;
    data.teamId = homeParticipant.teamId ?? null;
  }
  // Đổi đội khách -> cập nhật sideBName (teamId không đổi — Match.teamId là home).
  if (awayParticipant) {
    data.sideBName = awayParticipant.displayName;
  }

  try {
    await db.$transaction(async (tx) => {
      // 1. Cập nhật match (tỷ số + status + đội + lịch).
      await tx.match.update({ where: { id: matchId }, data });
      // 2. Xóa PlayerStat cũ của match (replace toàn bộ — bao gồm cả stat user + player ngoài).
      await tx.playerStat.deleteMany({ where: { matchId } });
      // 3. Tạo PlayerStat mới từ aggregate (chỉ khi có bàn).
      if (statsByKey.size > 0) {
        await tx.playerStat.createMany({
          data: [...statsByKey.values()].map((s) => ({
            matchId,
            teamId: s.teamId,
            userId: s.userId,
            participantPlayerId: s.participantPlayerId,
            participantId: s.participantId,
            displayName: s.displayName,
            goals: s.goals,
            assists: s.assists,
          })),
        });
      }
    });
    if (match.tournamentId) {
      revalidatePath("/tournaments/[slug]", "page");
    }
    revalidatePath(`/matches/${matchId}`);
    return { ok: true };
  } catch (err) {
    console.error("updateTournamentMatch error:", err);
    return { error: "Không cập nhật được trận. Thử lại nhé." };
  }
}
