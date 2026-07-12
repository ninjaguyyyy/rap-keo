"use client";

import Image from "next/image";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

// Layout auth dùng chung cho /login và /register.
// Hero: ảnh nền + overlay spotlight xanh, thay đổi theo route (login/signup).
// Panel form bo góc拉升 đè hero.
export default function AuthLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const isRegister = pathname.startsWith("/register");
  const bgImage = isRegister ? "/register_bg.jpg" : "/login_bg.jpg";
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
            <Image
              src="/logo.png"
              alt="Ráp Kèo"
              width={64}
              height={64}
              priority
              className="mx-auto mb-3 h-16 w-16 rounded-full bg-white object-cover"
            />
            <h1 className="text-5xl font-extrabold tracking-tight leading-tight drop-shadow-[0_2px_8px_rgba(0,0,0,0.45)]">
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
