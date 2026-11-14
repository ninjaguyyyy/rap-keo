import type { ReactNode } from "react";

export default function MainLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div className="min-h-dvh bg-surface-muted">
      <main className="px-2">
        {children}
      </main>
    </div>
  );
}
