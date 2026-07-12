"use client";

import { useEffect, useState } from "react";

type NotificationEvent = {
  id: string;
  payload?: {
    kind?: string;
    phone?: string;
    otp?: string;
  };
  createdAt?: string;
};

type OtpToast = {
  id: string;
  phone: string;
  otp: string;
  createdAt: string;
};

export function AdminForgotPasswordListener() {
  const [toasts, setToasts] = useState<OtpToast[]>([]);

  useEffect(() => {
    const source = new EventSource("/api/notifications/stream");

    source.addEventListener("notification", (event) => {
      const message = event as MessageEvent<string>;
      try {
        const data = JSON.parse(message.data) as NotificationEvent;
        if (data.payload?.kind !== "FORGOT_PASSWORD_OTP") return;

        const nextToast: OtpToast = {
          id: data.id,
          phone: data.payload.phone ?? "Không xác định",
          otp: data.payload.otp ?? "------",
          createdAt: data.createdAt ?? new Date().toISOString(),
        };

        setToasts((prev) => {
          if (prev.some((item) => item.id === nextToast.id)) return prev;
          return [nextToast, ...prev].slice(0, 5);
        });
      } catch {
        // Ignore malformed SSE message.
      }
    });

    return () => {
      source.close();
    };
  }, []);

  if (toasts.length === 0) return null;

  return (
    <div className="pointer-events-none fixed right-3 bottom-3 z-50 flex w-[min(360px,calc(100vw-24px))] flex-col gap-2">
      {toasts.map((item) => (
        <div
          key={item.id}
          className="pointer-events-auto rounded-xl border border-line bg-surface px-3 py-2 shadow-lg"
        >
          <p className="text-xs font-semibold uppercase tracking-wide text-brand">
            Yêu cầu quên mật khẩu
          </p>
          <p className="mt-1 text-sm text-ink">
            SĐT: <span className="font-semibold">{item.phone}</span>
          </p>
          <p className="text-sm text-ink">
            OTP: <span className="font-mono text-base font-bold">{item.otp}</span>
          </p>
          <p className="mt-1 text-xs text-ink-muted">
            {new Date(item.createdAt).toLocaleString("vi-VN")}
          </p>
        </div>
      ))}
    </div>
  );
}
