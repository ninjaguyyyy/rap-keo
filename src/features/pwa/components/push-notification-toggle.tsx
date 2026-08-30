"use client";

import { useEffect, useMemo, useState } from "react";
import { BellRing } from "lucide-react";
import { Button } from "@/components/ui/button";

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; i += 1) {
    outputArray[i] = rawData.charCodeAt(i);
  }

  return outputArray;
}

function isIosSafariLike() {
  const ua = window.navigator.userAgent;
  return /iPhone|iPad|iPod/i.test(ua);
}

function isStandaloneMode() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    ("standalone" in window.navigator &&
      (window.navigator as Navigator & { standalone?: boolean }).standalone === true)
  );
}

export function PushNotificationToggle() {
  const [supported] = useState(() => {
    if (typeof window === "undefined") return false;
    return (
      "serviceWorker" in navigator &&
      "PushManager" in window &&
      "Notification" in window
    );
  });
  const [busy, setBusy] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>(() => {
    if (typeof window === "undefined" || !("Notification" in window)) {
      return "denied";
    }

    return Notification.permission;
  });
  const [message, setMessage] = useState<string>("");

  const inStandalone = useMemo(() => {
    if (typeof window === "undefined") return false;
    return isStandaloneMode();
  }, []);

  useEffect(() => {
    if (!supported) return;

    const init = async () => {
      try {
        const registration = await navigator.serviceWorker.register("/sw.js", {
          scope: "/",
        });
        const subscription = await registration.pushManager.getSubscription();
        setEnabled(Boolean(subscription));
      } catch {
        setMessage("Không thể khởi tạo thông báo trên thiết bị này.");
      }
    };

    void init();
  }, [supported]);

  const handleEnable = async () => {
    if (!supported || busy) return;

    if (isIosSafariLike() && !inStandalone) {
      setMessage("Trên iPhone, hãy Thêm vào Màn hình chính rồi mở app từ icon để bật thông báo.");
      return;
    }

    setBusy(true);
    setMessage("");

    try {
      const registration = await navigator.serviceWorker.register("/sw.js", {
        scope: "/",
      });

      const permissionResult = await Notification.requestPermission();
      setPermission(permissionResult);

      if (permissionResult !== "granted") {
        setMessage("Bạn chưa cấp quyền thông báo.");
        return;
      }

      const keyRes = await fetch("/api/pwa/public-key", { cache: "no-store" });
      if (!keyRes.ok) {
        setMessage("Server chưa cấu hình Web Push key.");
        return;
      }

      const { publicKey } = (await keyRes.json()) as { publicKey: string };

      let subscription = await registration.pushManager.getSubscription();
      if (!subscription) {
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(publicKey),
        });
      }

      const saveRes = await fetch("/api/pwa/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(subscription.toJSON()),
      });

      if (!saveRes.ok) {
        setMessage("Không thể lưu đăng ký thông báo.");
        return;
      }

      setEnabled(true);
      setMessage("Đã bật thông báo đẩy.");
    } catch {
      setMessage("Bật thông báo thất bại.");
    } finally {
      setBusy(false);
    }
  };

  const handleDisable = async () => {
    if (!supported || busy) return;

    setBusy(true);
    setMessage("");

    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();

      if (!subscription) {
        setEnabled(false);
        return;
      }

      await fetch("/api/pwa/subscribe", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ endpoint: subscription.endpoint }),
      });

      await subscription.unsubscribe();
      setEnabled(false);
      setMessage("Đã tắt thông báo đẩy.");
    } catch {
      setMessage("Tắt thông báo thất bại.");
    } finally {
      setBusy(false);
    }
  };

  const handleTest = async () => {
    if (!enabled || busy) return;
    setBusy(true);
    setMessage("");

    try {
      const res = await fetch("/api/pwa/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: "Ráp Kèo",
          body: "Thông báo test đã tới thiết bị của bạn.",
          url: "/notifications",
        }),
      });

      if (!res.ok) {
        setMessage("Gửi thông báo test thất bại.");
        return;
      }

      setMessage("Đã gửi thông báo test.");
    } catch {
      setMessage("Gửi thông báo test thất bại.");
    } finally {
      setBusy(false);
    }
  };

  if (!supported) return null;

  return (
    <div className="flex items-center gap-1.5">
      {enabled ? (
        <>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleTest}
            disabled={busy}
            className="text-white/85 hover:text-white"
            title="Gửi thông báo test"
          >
            <BellRing className="size-4" />
            Test noti
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDisable}
            disabled={busy}
            className="text-white/70 hover:text-white"
          >
            Tắt noti
          </Button>
        </>
      ) : (
        <Button
          variant="ghost"
          size="sm"
          onClick={handleEnable}
          disabled={busy || permission === "denied"}
          className="text-white/80 hover:text-white"
          title={permission === "denied" ? "Bạn đã chặn thông báo trong trình duyệt" : undefined}
        >
          Bật noti
        </Button>
      )}
      {message ? (
        <span className="hidden text-xs text-white/75 md:inline">{message}</span>
      ) : null}
    </div>
  );
}
