// Email service — wrapper quanh Resend SDK. Server-only (KHÔNG import client-side).
// Resend docs: https://resend.com/docs
//
// Setup:
// 1. Tạo account tại https://resend.com
// 2. Tạo API key tại Dashboard > API Keys > Create API Key (copy ngay, chỉ hiện 1 lần).
// 3. (Tùy chọn) Verify domain tại Dashboard > Domains để gửi từ địa chỉ riêng (vd
//    noreply@rapkeo.vn). Giai đoạn dev/test có thể dùng `onboarding@resend.dev`
//    (Resend cấp sẵn, gửi được ngay không cần setup DNS) — nhưng chỉ gửi tới email
//    của chính account Resend đó.
// 4. Set env vars (xem .env.example):
//    RESEND_API_KEY="re_xxx"
//    RESEND_FROM_EMAIL="onboarding@resend.dev"  (dev) hoặc "Phủi League <noreply@rapkeo.vn>" (prod)
//
// Cách dùng:
//   import { sendEmail } from "@/lib/email";
//   await sendEmail({ to: "user@example.com", subject: "...", html: "..." });
//
// Dev mode (RESEND_DEV_MODE="true"): log email ra console thay vì gửi thật — tránh
// tiêu quota khi test local. Mirror pattern OTP_DEV_MODE ở auth feature.
import "server-only";
import { Resend } from "resend";

const DEV_MODE = process.env.RESEND_DEV_MODE === "true";
const API_KEY = process.env.RESEND_API_KEY;
const FROM_EMAIL =
  process.env.RESEND_FROM_EMAIL ?? "Phủi League <onboarding@resend.dev>";

// Lazy init — chỉ tạo client khi gọi hàm (tránh crash startup nếu chưa set key
// ở dev mode log-only). Singleton ở module scope để reuse.
let client: Resend | null = null;
function getClient(): Resend | null {
  if (DEV_MODE) return null;
  if (!API_KEY) {
    console.warn(
      "[email] RESEND_API_KEY chưa set. Set RESEND_DEV_MODE=true để log ra console.",
    );
    return null;
  }
  if (!client) client = new Resend(API_KEY);
  return client;
}

export type SendEmailInput = {
  to: string | string[];
  subject: string;
  html: string;
  // Optional: text fallback cho email client không render HTML.
  text?: string;
  // Optional: reply-to address (vd email support).
  replyTo?: string;
};

export type SendEmailResult = {
  ok: boolean;
  // Resend message id (khi gửi thật). Dev mode: "dev-<timestamp>".
  id?: string;
  error?: string;
};

// Gửi email qua Resend. Dev mode: log ra console + trả ok (không gửi thật).
// Lỗi Resend (4xx/5xx) catch + trả { ok: false, error } — không throw để caller
// xử lý graceful (vd email OTP fail vẫn cho user retry, không crash flow).
export async function sendEmail(
  input: SendEmailInput,
): Promise<SendEmailResult> {
  if (DEV_MODE) {
    console.log("\n========== EMAIL (dev mode) ==========");
    console.log("From:", FROM_EMAIL);
    console.log("To:", Array.isArray(input.to) ? input.to.join(", ") : input.to);
    if (input.replyTo) console.log("Reply-To:", input.replyTo);
    console.log("Subject:", input.subject);
    console.log("HTML:\n", input.html);
    if (input.text) console.log("Text:\n", input.text);
    console.log("======================================\n");
    return { ok: true, id: `dev-${Date.now()}` };
  }

  const client = getClient();
  if (!client) {
    return {
      ok: false,
      error: "Email service chưa cấu hình (thiếu RESEND_API_KEY).",
    };
  }

  try {
    const { data, error } = await client.emails.send({
      from: FROM_EMAIL,
      to: input.to,
      subject: input.subject,
      html: input.html,
      text: input.text,
      replyTo: input.replyTo,
    });
    if (error) {
      console.error("[email] Resend error:", error);
      return { ok: false, error: error.message };
    }
    return { ok: true, id: data?.id };
  } catch (err) {
    console.error("[email] sendEmail exception:", err);
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Không gửi được email.",
    };
  }
}
