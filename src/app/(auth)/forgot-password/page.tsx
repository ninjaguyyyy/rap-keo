import { Suspense } from "react";
import { ForgotPasswordForm } from "@/features/auth/components/forgot-password-form";

// Bọc ForgotPasswordForm trong <Suspense> vì component dùng useSearchParams() —
// Next.js yêu cầu để tránh opt page khỏi static prerendering (build fail). Mirror
// pattern login/page.tsx.
export default function ForgotPasswordPage() {
  return (
    <div>
      <h2 className="text-3xl font-extrabold tracking-tight text-ink">Quên mật khẩu</h2>
      <p className="mb-6 mt-1 text-sm text-ink-muted">
        Nhập số điện thoại đã đăng ký để nhận hướng dẫn đặt lại mật khẩu.
      </p>
      <Suspense fallback={null}>
        <ForgotPasswordForm />
      </Suspense>
    </div>
  );
}