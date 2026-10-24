"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@/generated/prisma/client";
import { getCurrentUser, requireUser } from "@/lib/session";
import {
  closeMvpVoteSchema,
  submitMvpVoteSchema,
  type CloseMvpVoteState,
  type SubmitMvpVoteState,
} from "./mvp-vote-schemas";
import {
  closeMvpVoteSession,
  submitVote,
} from "./mvp-vote";

function mapVoteError(error: unknown): string {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    switch (error.code) {
      case "ECONNREFUSED":
      case "P1001":
        return "Không kết nối được cơ sở dữ liệu. Bạn thử lại sau ít phút nhé.";
      case "P2021":
      case "P2022":
        return "Cơ sở dữ liệu chưa cập nhật đủ bảng vote MVP. Vui lòng báo admin chạy migrate.";
      case "P2002":
        return "Vote đã được ghi nhận. Bạn tải lại trang để xem cập nhật mới nhất.";
      case "P2025":
        return "Dữ liệu vote không còn hợp lệ. Bạn tải lại trang rồi thử lại.";
      default:
        return "Không xử lý được yêu cầu vote MVP. Thử lại nhé.";
    }
  }
  if (error instanceof Prisma.PrismaClientInitializationError) {
    return "Không khởi tạo được kết nối cơ sở dữ liệu. Bạn thử lại sau ít phút nhé.";
  }
  if (!(error instanceof Error)) {
    return "Không xử lý được yêu cầu vote MVP. Thử lại nhé.";
  }
  switch (error.message) {
    case "UNAUTHENTICATED":
      return "Bạn cần đăng nhập để vote MVP.";
    case "VOTER_REQUIRED":
      return "Bạn cần chọn tên của mình trong danh sách cầu thủ tham gia trận.";
    case "VOTER_NOT_MEMBER":
      return "Người vote không nằm trong danh sách cầu thủ tham gia trận.";
    case "MATCH_SQUAD_EMPTY":
      return "Trận này chưa có danh sách cầu thủ tham gia để mở vote MVP.";
    case "MATCH_NOT_FOUND":
      return "Trận không tồn tại.";
    case "MATCH_NOT_COMPLETED":
      return "Chỉ vote MVP cho trận đã hoàn thành.";
    case "MATCH_TEAM_REQUIRED":
      return "Trận này chưa gắn đội để vote MVP.";
    case "FORBIDDEN_MEMBER":
      return "Bạn không thuộc đội trong trận này.";
    case "FORBIDDEN_OWNER_ONLY":
      return "Chỉ đội trưởng mới được đóng vote.";
    case "INVALID_TOKEN":
      return "Link vote không hợp lệ hoặc đã bị thay mới.";
    case "SESSION_CLOSED":
      return "Phiên vote đã đóng.";
    case "SESSION_NOT_FOUND":
      return "Phiên vote chưa được tạo.";
    case "CANDIDATE_NOT_MEMBER":
      return "Ứng viên không nằm trong danh sách cầu thủ tham gia trận.";
    default:
      return "Không xử lý được yêu cầu vote MVP. Thử lại nhé.";
  }
}

export async function submitMvpVote(
  _prev: SubmitMvpVoteState,
  formData: FormData,
): Promise<SubmitMvpVoteState> {
  const viewer = await getCurrentUser();

  const parsed = submitMvpVoteSchema.safeParse({
    matchId: formData.get("matchId"),
    token: formData.get("token") || undefined,
    voterUserId: formData.get("voterUserId") || undefined,
    candidateUserId: formData.get("candidateUserId"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dữ liệu vote không hợp lệ." };
  }

  try {
    await submitVote({
      ...parsed.data,
      token: parsed.data.token ?? null,
      voterUserId: parsed.data.voterUserId ?? null,
      authenticatedUserId: viewer?.id ?? null,
    });
    revalidatePath(`/matches/${parsed.data.matchId}/mvp-vote`);
    revalidatePath(`/matches/${parsed.data.matchId}`);
    return { ok: true };
  } catch (error) {
    console.error("submitMvpVote error:", error);
    return { error: mapVoteError(error) };
  }
}

export async function closeMvpVote(
  _prev: CloseMvpVoteState,
  formData: FormData,
): Promise<CloseMvpVoteState> {
  const user = await requireUser();

  const parsed = closeMvpVoteSchema.safeParse({
    matchId: formData.get("matchId"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Trận không hợp lệ." };
  }

  try {
    await closeMvpVoteSession(parsed.data.matchId, user.id);
    revalidatePath(`/matches/${parsed.data.matchId}`);
    revalidatePath(`/matches/${parsed.data.matchId}/mvp-vote`);
    return { ok: true };
  } catch (error) {
    console.error("closeMvpVote error:", error);
    return { error: mapVoteError(error) };
  }
}
