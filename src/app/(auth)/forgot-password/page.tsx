import { ForgotPasswordForm } from "@/features/auth/components/forgot-password-form";

export default function ForgotPasswordPage() {
  return (
    <div>
      <h2 className="text-[22px] font-bold text-ink">Quên mật khẩu</h2>
      <p className="mb-6 mt-1 text-[13px] text-ink-muted">
        Nhập số điện thoại đã đăng ký để nhận hướng dẫn đặt lại mật khẩu.
      </p>
      <ForgotPasswordForm />
    </div>
  );
}