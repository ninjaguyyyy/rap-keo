// Nhãn tiếng Việt cho enum của Tournament (hiển thị cho người dùng).
import type {
  TournamentFormat,
  TournamentStatus,
  TournamentParticipantStatus,
} from "@/generated/prisma/enums";
import { fieldTypeLabels } from "@/features/matches/labels";

export const tournamentStatusLabels: Record<TournamentStatus, string> = {
  DRAFT: "Bản nháp",
  PENDING: "Chờ duyệt",
  APPROVED: "Đã duyệt",
  REJECTED: "Bị từ chối",
  COMPLETED: "Đã kết thúc",
  CANCELLED: "Đã hủy",
};

export const tournamentFormatLabels: Record<TournamentFormat, string> = {
  LEAGUE: "Đãi vòng tròn",
};

export const participantStatusLabels: Record<
  TournamentParticipantStatus,
  string
> = {
  ACCEPTED: "Đã tham gia",
  PENDING: "Chờ xác nhận",
  REJECTED: "Bị từ chối",
};

// Tái dùng fieldTypeLabels từ matches (Sân 5/7/11) — không định nghĩa lại.
export { fieldTypeLabels };

// Badge color theo status (token DESIGN.md, dùng chung pattern với matchTypeBadge).
export const tournamentStatusBadge: Record<TournamentStatus, string> = {
  DRAFT: "bg-surface text-ink-muted border border-line",
  PENDING: "bg-accent-yellow/20 text-ink",
  APPROVED: "bg-brand-soft text-brand",
  REJECTED: "bg-danger-soft text-danger",
  COMPLETED: "bg-brand text-white",
  CANCELLED: "bg-surface text-ink-muted border border-line",
};
