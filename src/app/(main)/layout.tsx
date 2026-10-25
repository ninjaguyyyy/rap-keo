import type { ReactNode } from "react";

export default function MainLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div className="min-h-dvh bg-surface-muted">
      <main className="px-4 py-4">
        <div className="mx-auto max-w-md">{children}</div>
      </main>
    </div>
  );
}
