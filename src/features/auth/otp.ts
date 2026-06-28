// OTP core: sinh / hash / lưu / verify mã. Server-only (đụng DB + crypto + secret).
import "server-only";
import { createHmac, randomInt, timingSafeEqual } from "node:crypto";
import { db } from "@/lib/db";
import type { OtpChannel } from "@/generated/prisma/enums";

// ----- Cấu hình -----
const OTP_LENGTH = 6;
const OTP_TTL_MS = 5 * 60 * 1000; // hết hạn 5 phút
const MAX_ATTEMPTS = 5; // số lần nhập sai tối đa cho 1 mã
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000; // cửa sổ rate-limit
const RATE_LIMIT_MAX_CODES = 3; // tối đa số mã xin được trong cửa sổ

function getSecret(): string {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error("AUTH_SECRET chưa được cấu hình");
  return secret;
}

// Hash OTP bằng HMAC-SHA256, ràng buộc theo destination để mã không dùng chéo.
function hashOtp(code: string, destination: string): string {
  return createHmac("sha256", getSecret())
    .update(`${destination}:${code}`)
    .digest("hex");
}

function generateOtp(): string {
  // crypto.randomInt: an toàn hơn Math.random.
  const max = 10 ** OTP_LENGTH;
  return randomInt(0, max).toString().padStart(OTP_LENGTH, "0");
}

export type RequestOtpResult =
  | { ok: true; code: string; expiresAt: Date }
  | { ok: false; reason: "RATE_LIMITED" };

/**
 * Sinh + lưu một mã OTP cho (destination, channel). Trả về `code` plaintext để
 * caller gửi đi (qua email/SMS); DB chỉ lưu bản hash.
 */
export async function createOtp(
  destination: string,
  channel: OtpChannel,
): Promise<RequestOtpResult> {
  // Rate-limit: đếm số mã đã tạo trong cửa sổ gần đây.
  const since = new Date(Date.now() - RATE_LIMIT_WINDOW_MS);
  const recentCount = await db.otpCode.count({
    where: { destination, channel, createdAt: { gte: since } },
  });
  if (recentCount >= RATE_LIMIT_MAX_CODES) {
    return { ok: false, reason: "RATE_LIMITED" };
  }

  const code = generateOtp();
  const expiresAt = new Date(Date.now() + OTP_TTL_MS);
  await db.otpCode.create({
    data: {
      destination,
      channel,
      codeHash: hashOtp(code, destination),
      expiresAt,
    },
  });

  return { ok: true, code, expiresAt };
}

export type VerifyOtpResult =
  | { ok: true }
  | { ok: false; reason: "NO_CODE" | "EXPIRED" | "LOCKED" | "MISMATCH" };

/**
 * Verify mã OTP mới nhất chưa dùng cho (destination, channel).
 * Đúng -> đánh dấu consumed. Sai -> tăng attempts.
 */
export async function verifyOtp(
  destination: string,
  channel: OtpChannel,
  code: string,
): Promise<VerifyOtpResult> {
  const record = await db.otpCode.findFirst({
    where: { destination, channel, consumedAt: null },
    orderBy: { createdAt: "desc" },
  });

  if (!record) return { ok: false, reason: "NO_CODE" };
  if (record.expiresAt.getTime() < Date.now()) {
    return { ok: false, reason: "EXPIRED" };
  }
  if (record.attempts >= MAX_ATTEMPTS) {
    return { ok: false, reason: "LOCKED" };
  }

  const expected = Buffer.from(record.codeHash, "hex");
  const actual = Buffer.from(hashOtp(code, destination), "hex");
  const matched =
    expected.length === actual.length && timingSafeEqual(expected, actual);

  if (!matched) {
    await db.otpCode.update({
      where: { id: record.id },
      data: { attempts: { increment: 1 } },
    });
    return { ok: false, reason: "MISMATCH" };
  }

  await db.otpCode.update({
    where: { id: record.id },
    data: { consumedAt: new Date() },
  });
  return { ok: true };
}
