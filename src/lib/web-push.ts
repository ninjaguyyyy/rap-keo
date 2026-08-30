import "server-only";
import webPush from "web-push";

type PushPayload = {
  title: string;
  body: string;
  url?: string;
};

type PushSubscriptionInput = {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
};

let detailsConfigured = false;

function getVapidConfig() {
  const subject = process.env.WEB_PUSH_VAPID_SUBJECT;
  const publicKey = process.env.NEXT_PUBLIC_WEB_PUSH_VAPID_PUBLIC_KEY;
  const privateKey = process.env.WEB_PUSH_VAPID_PRIVATE_KEY;

  if (!subject || !publicKey || !privateKey) return null;

  return { subject, publicKey, privateKey };
}

function ensureWebPushConfigured() {
  if (detailsConfigured) return;

  const vapid = getVapidConfig();
  if (!vapid) {
    throw new Error("WEB_PUSH_NOT_CONFIGURED");
  }

  webPush.setVapidDetails(vapid.subject, vapid.publicKey, vapid.privateKey);
  detailsConfigured = true;
}

export function getPublicVapidKey() {
  return process.env.NEXT_PUBLIC_WEB_PUSH_VAPID_PUBLIC_KEY ?? "";
}

export async function sendWebPushNotification(
  subscription: PushSubscriptionInput,
  payload: PushPayload,
) {
  ensureWebPushConfigured();

  return webPush.sendNotification(
    subscription,
    JSON.stringify({
      title: payload.title,
      body: payload.body,
      url: payload.url ?? "/notifications",
      icon: "/android-chrome-192x192.png",
      badge: "/formation.png",
    }),
  );
}
