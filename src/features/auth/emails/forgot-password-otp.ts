// Email template HTML cho yêu cầu quên mật khẩu (gửi tới admin).
// Inline CSS (email client không load external CSS), mobile-first, tông brand
// xanh cỏ (mirror DESIGN.md). Pure function trả HTML string — không dùng React
// Email component để giữ dependency nhẹ (MVP). Sau này muốn React Email thì
// chuyển sang @react-email/components.

export function forgotPasswordOtpHtml(args: {
  phone: string;
  otp: string;
  requestedAt: Date;
  appName?: string;
}): string {
  const { phone, otp, requestedAt, appName = "Ráp Kèo" } = args;
  const time = requestedAt.toLocaleString("vi-VN", {
    timeZone: "Asia/Ho_Chi_Minh",
  });

  return `<!DOCTYPE html>
<html lang="vi">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Yêu cầu quên mật khẩu - ${appName}</title>
</head>
<body style="margin:0;padding:0;background:#f0fdf4;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#0f172a;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f0fdf4;padding:16px 0;">
    <tr>
      <td align="center">
        <table role="presentation" width="min(520px,100%)" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.05);">
          <!-- Header brand -->
          <tr>
            <td style="background:#16a34a;padding:20px 24px;text-align:center;">
              <p style="margin:0;font-size:18px;font-weight:800;color:#ffffff;letter-spacing:-0.01em;">
                ${appName}
              </p>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:24px;">
              <h1 style="margin:0 0 12px;font-size:18px;font-weight:700;color:#0f172a;">
                Yêu cầu quên mật khẩu
              </h1>
              <p style="margin:0 0 16px;font-size:14px;line-height:1.5;color:#475569;">
                Một người dùng vừa yêu cầu đặt lại mật khẩu. Chi tiết bên dưới —
                bạn (admin) liên hệ lại user để gửi OTP thủ công nếu cần.
              </p>

              <!-- OTP box -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:16px 0;">
                <tr>
                  <td style="background:#f0fdf4;border:1px dashed #86efac;border-radius:12px;padding:16px;text-align:center;">
                    <p style="margin:0 0 6px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.05em;color:#15803d;">
                      Mã OTP
                    </p>
                    <p style="margin:0;font-size:32px;font-weight:800;letter-spacing:0.3em;color:#16a34a;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;">
                      ${escapeHtml(otp)}
                    </p>
                  </td>
                </tr>
              </table>

              <!-- Info table -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-size:14px;color:#0f172a;">
                <tr>
                  <td style="padding:8px 0;border-bottom:1px solid #e2e8f0;width:40%;color:#64748b;">Số điện thoại</td>
                  <td style="padding:8px 0;border-bottom:1px solid #e2e8f0;font-weight:600;">${escapeHtml(phone)}</td>
                </tr>
                <tr>
                  <td style="padding:8px 0;color:#64748b;">Thời gian</td>
                  <td style="padding:8px 0;font-weight:600;">${escapeHtml(time)}</td>
                </tr>
              </table>

              <p style="margin:20px 0 0;font-size:12px;line-height:1.5;color:#94a3b8;">
                Email này gửi tự động từ hệ thống ${appName}. Nếu bạn không expecting
                yêu cầu này, có thể bỏ qua.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

// Escape HTML để tránh injection qua phone/otp (dù otp là số, phòng trường hợp
// user nhập phone chứa ký tự đặc biệt qua form — server validate nhưng double-check).
function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
