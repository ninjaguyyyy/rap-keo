import { Suspense } from "react";
import { LoginForm } from "@/features/auth/components/login-form";

// Bọc LoginForm trong <Suspense> vì component dùng useSearchParams() — Next.js
// yêu cầu để tránh opt page khỏi static prerendering. Fallback giữ layout.
export default function LoginPage() {
  return (
    <div>
      <h2 className="text-3xl font-extrabold tracking-tight text-ink">Đăng nhập</h2>
      <p className="mb-6 mt-1 text-sm text-ink-muted">
        Đăng nhập bằng số điện thoại và mật khẩu.
      </p>
      <Suspense fallback={null}>
        <LoginForm />
      </Suspense>
    </div>
  );
}
