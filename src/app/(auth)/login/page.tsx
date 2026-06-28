import { EmailLoginForm } from "@/features/auth/components/email-login-form";

export default function LoginPage() {
  return (
    <div>
      <h2 className="mb-1 text-xl font-bold text-gray-900">Đăng nhập</h2>
      <p className="mb-6 text-sm text-gray-500">
        Nhập email để nhận mã đăng nhập.
      </p>
      <EmailLoginForm />
    </div>
  );
}
