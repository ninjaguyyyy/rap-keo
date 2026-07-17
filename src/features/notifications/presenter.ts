import type { LucideIcon } from "lucide-react";
import {
  Bell,
  Goal,
  HandHelping,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import type { NotificationRecord } from "./queries";

// Payload helper: forgot-password hiện đang lưu vào notification.type = "MATCH_REQUEST"
// với payload.kind = "FORGOT_PASSWORD_OTP" — tách hẳn logic ở đây.
type ForgotPasswordPayload = {
  kind?: string;
  phone?: string;
  otp?: string;
};

type PresentedNotification = {
  id: string;
  title: string;
  description: string;
  href: string | null;
  icon: LucideIcon;
  unread: boolean;
  createdAt: string;
};

// Map 1 record sang UI model. Trả về description trống nếu payload lạ — an toàn.
export function presentNotification(record: NotificationRecord): PresentedNotification {
  const id = record.id;
  const createdAt = record.createdAt;
  const unread = !record.read;

  // Fallback cho các type chưa presenter xử lý.
  const base = {
    id,
    href: "/notifications",
    icon: Bell as LucideIcon,
    unread,
    createdAt,
  };

  // Forgot-password OTP (admin only) — payload.kind làm phân loại.
  if (
    record.type === "MATCH_REQUEST" &&
    isForgotPasswordPayload(record.payload)
  ) {
    return {
      ...base,
      title: "Yêu cầu quên mật khẩu",
      description: `SĐT ${record.payload.phone ?? "—"} cần hỗ trợ đặt lại mật khẩu.`,
      icon: HandHelping,
    };
  }

  // Các enum NotificationType sau này sẽ tới đây.
  switch (record.type) {
    case "REQUEST_ACCEPTED":
      return {
        ...base,
        title: "Yêu cầu ghép kèo đã được chấp nhận",
        description: "Đối đã nhận lời — chuẩn bị ra sân thôi!",
        icon: CheckCircle2,
      };
    case "REQUEST_REJECTED":
      return {
        ...base,
        title: "Yêu cầu ghép kèo bị từ chối",
        description: "Đối chưa sắp xếp được. Tìm đối khác nhé.",
        icon: XCircle,
      };
    case "MATCH_CONFIRMED":
      return {
        ...base,
        title: "Kèo đã được chốt",
        description: "Trận đấu đã chốt — kiểm tra thông tin sân và giờ.",
        icon: Goal,
      };
    case "MATCH_REQUEST":
    default:
      return {
        ...base,
        title: "Thông báo mới",
        description: "Mở để xem chi tiết.",
      };
  }
}

function isForgotPasswordPayload(payload: unknown): payload is ForgotPasswordPayload {
  if (!payload || typeof payload !== "object") return false;
  const kind = (payload as { kind?: unknown }).kind;
  return typeof kind === "string" && kind.length > 0;
}
