import type { ReactNode } from "react";

// Layout auth dùng chung cho /login, /register, /forgot-password.
// Dùng card sáng + bo lớn để khớp sticky header global.
export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <main className="flex min-h-dvh flex-col bg-surface-muted px-4 py-6">
      <section className="mx-auto w-full max-w-md rounded-3xl border border-line/80 bg-surface px-5 pb-10 pt-7 shadow-sm">
        {children}
      </section>
    </main>
  );
}
