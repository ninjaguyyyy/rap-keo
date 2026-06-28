import type { ReactNode } from "react";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <main className="flex min-h-dvh flex-col justify-center bg-gray-50 px-5 py-10">
      <div className="mx-auto w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-extrabold text-green-700">Ráp Kèo</h1>
          <p className="mt-1 text-sm text-gray-500">Ráp kèo bóng đá phủi</p>
        </div>
        <div className="rounded-2xl bg-white p-6 shadow-sm">{children}</div>
      </div>
    </main>
  );
}
