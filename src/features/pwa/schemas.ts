import { z } from "zod";

export const webPushSubscriptionSchema = z.object({
  endpoint: z.url(),
  expirationTime: z.number().nullable().optional(),
  keys: z.object({
    p256dh: z.string().min(1),
    auth: z.string().min(1),
  }),
});

export const deleteWebPushSubscriptionSchema = z.object({
  endpoint: z.url(),
});

export const testPushSchema = z.object({
  title: z.string().trim().min(1).max(120).optional(),
  body: z.string().trim().min(1).max(280).optional(),
  url: z.string().trim().min(1).max(200).optional(),
});
