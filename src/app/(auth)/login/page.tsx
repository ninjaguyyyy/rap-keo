import { LoginForm } from "@/features/auth/components/login-form";

export default function LoginPage() {
  return (
    <div>
      <h2 className="text-[22px] font-bold text-ink">Đăng nhập</h2>
      <p className="mb-6 mt-1 text-[13px] text-ink-muted">
        Đăng nhập bằng số điện thoại và mật khẩu.
      </p>
      <LoginForm />
    </div>
  );
}
