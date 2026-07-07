"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

// Layout auth dùng chung cho /login và /register.
// Hero: ảnh nền + overlay spotlight xanh, thay đổi theo route (login/signup).
// Panel form bo góc拉升 đè hero.
export default function AuthLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const isRegister = pathname.startsWith("/register");
  const bgImage = isRegister ? "/bg-signup.jpg" : "/bg-login.jpg";
  const tagline = isRegister
    ? "Tạo tài khoản để bắt đầu ráp kèo"
    : "Ráp kèo bóng đá phủi — tìm đối, tìm người, tìm sân";

  return (
    <main className="flex min-h-dvh flex-col bg-surface-muted">
      {/* Hero — ảnh + overlay spotlight, khung nội dung max-w-md căn giữa */}
      <div className="relative w-full">
        <div
          className="relative w-full px-5 py-12 text-center text-white"
          style={{
            backgroundImage: `linear-gradient(180deg, rgba(26,83,26,0.50) 0%, rgba(26,83,26,0.92) 100%), url(${bgImage})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        >
          <div className="mx-auto w-full max-w-md">
            <span className="mb-3 inline-flex items-center gap-1.5 rounded-full border border-white/25 bg-white/10 px-2.5 py-1 text-[11px] font-semibold tracking-wide backdrop-blur">
              ⚽ Ráp Kèo
            </span>
            <h1 className="text-4xl font-extrabold tracking-tight drop-shadow-sm">
              Ráp Kèo
            </h1>
            <p className="mt-1.5 text-sm text-white/85">{tagline}</p>
          </div>
        </div>
      </div>

      {/* Panel form — bo góc trên, kéo lên đè hero, khung max-w-md căn giữa */}
      <section className="relative z-10 mx-auto -mt-6 w-full max-w-md rounded-t-3xl bg-surface-muted px-5 pt-7 pb-10">
        {children}
      </section>
    </main>
  );
}
