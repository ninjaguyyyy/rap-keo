import { RegisterForm } from "@/features/auth/components/register-form";

export default function RegisterPage() {
  return (
    <div>
      <h2 className="text-[22px] font-bold text-ink">Tạo tài khoản</h2>
      <p className="mb-6 mt-1 text-[13px] text-ink-muted">
        Đăng ký bằng số điện thoại, mật khẩu và tên hiển thị.
      </p>
      <RegisterForm />
    </div>
  );
}
