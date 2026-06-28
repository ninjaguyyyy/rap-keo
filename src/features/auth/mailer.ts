// Gửi email. DEV: log ra console (chưa tích hợp provider thật).
// Khi lên prod: thay sendEmail bằng provider (Resend/SES/SMTP...).
import "server-only";

type SendEmailArgs = {
  to: string;
  subject: string;
  text: string;
};

const isDevMode = process.env.OTP_DEV_MODE !== "false";

export async function sendEmail({ to, subject, text }: SendEmailArgs): Promise<void> {
  if (isDevMode) {
    console.log(
      `\n📧 [DEV EMAIL]\n  To: ${to}\n  Subject: ${subject}\n  ${text}\n`,
    );
    return;
  }

  // TODO(prod): tích hợp provider email thật ở đây.
  throw new Error("Email provider chưa được cấu hình (OTP_DEV_MODE=false)");
}

export async function sendOtpEmail(to: string, code: string): Promise<void> {
  await sendEmail({
    to,
    subject: "Mã đăng nhập Ráp Kèo",
    text: `Mã OTP của bạn là: ${code} (hết hạn sau 5 phút). Không chia sẻ mã này cho người khác.`,
  });
}
