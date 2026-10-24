import { z } from "zod";

export const submitMvpVoteSchema = z.object({
  matchId: z.string().uuid("Trận không hợp lệ."),
  token: z.string().trim().optional(),
  voterUserId: z.string().uuid("Chọn tên của bạn trong danh sách cầu thủ đội.").optional(),
  candidateUserId: z.string().uuid("Chọn 1 ứng viên để vote."),
});

export const closeMvpVoteSchema = z.object({
  matchId: z.string().uuid("Trận không hợp lệ."),
});

export type SubmitMvpVoteState = {
  ok?: boolean;
  error?: string;
};

export type CloseMvpVoteState = {
  ok?: boolean;
  error?: string;
};
