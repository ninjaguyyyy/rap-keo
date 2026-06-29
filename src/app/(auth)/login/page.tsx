import { EmailLoginForm } from "@/features/auth/components/email-login-form";

export default function LoginPage() {
  return (
    <div>
      <h2 className="mb-1 text-xl font-bold text-ink">Đăng nhập</h2>
      <p className="mb-6 text-sm text-ink-muted">
        Nhập email để nhận mã đăng nhập.
      </p>
      <EmailLoginForm />
    </div>
  );
}
