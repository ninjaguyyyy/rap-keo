"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { signIn } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  forgotPasswordSchema,
  passwordSchema,
  type ForgotPasswordInput,
} from "../schemas";

// Form quên mật khẩu 2 step:
//   Step "phone": nhập SĐT → POST /api/auth/forgot-password (sinh OTP + email admin).
//   Step "otp":   nhập OTP + mk mới + confirm → POST /api/auth/reset-password
//                 (verify OTP + set mk mới) → signIn client → redirect.
// State phone giữ qua 2 step (không truyền qua URL để tránh leak SĐT trong history).
// Phone không nằm trong RHF form ở step "otp" — đã validate ở step 1 và server
// re-validate đầy đủ qua resetPasswordSchema. Tránh hidden input không sync giá
// trị vào RHF internal state → handleSubmit bị chặn validate ngầm.
type ApiResponse = {
  ok?: boolean;
  message?: string;
  error?: string;
  retryAfterSeconds?: number;
  fieldErrors?: Partial<Record<string, string>>;
};

type OtpFormValues = {
  otp: string;
  newPassword: string;
  confirmNewPassword: string;
};

const otpFormSchema = z.object({
  otp: z.string().trim().regex(/^\d{6}$/, "OTP gồm 6 chữ số"),
  newPassword: passwordSchema,
  confirmNewPassword: z.string().min(1, "Vui lòng xác nhận mật khẩu"),
});

export function ForgotPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") ?? "/";
  const [step, setStep] = useState<"phone" | "otp">("phone");
  const [phone, setPhone] = useState<string>("");

  // Form step "phone".
  const phoneForm = useForm<ForgotPasswordInput>({
    resolver: zodResolver(forgotPasswordSchema),
    mode: "onTouched",
  });
  // Form step "otp". Phone không nằm trong form (giữ ở React state) — xem ghi chú
  // ở đầu file.
  const otpForm = useForm<OtpFormValues>({
    resolver: zodResolver(otpFormSchema),
    mode: "onTouched",
    defaultValues: { otp: "", newPassword: "", confirmNewPassword: "" },
  });

  // --- Step "phone": submit SĐT → gửi OTP email admin → setStep("otp").
  const onPhoneSubmit = async (values: ForgotPasswordInput) => {
    let res: Response;
    try {
      res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
    } catch {
      phoneForm.setError("root.serverError", {
        message: "Không thể kết nối tới máy chủ. Vui lòng thử lại.",
      });
      return;
    }

    const data = (await res.json().catch(() => ({}))) as ApiResponse;
    if (!res.ok) {
      phoneForm.setError("root.serverError", {
        message: data.error ?? "Không thể gửi yêu cầu. Vui lòng thử lại.",
      });
      return;
    }

    setPhone(values.phone);
    setStep("otp");
    phoneForm.clearErrors("root.serverError");
  };

  // --- Step "otp": submit OTP + mk mới → verify → set mk → signIn → redirect.
  const onOtpSubmit = async (values: OtpFormValues) => {
    if (values.confirmNewPassword !== values.newPassword) {
      otpForm.setError("confirmNewPassword", {
        message: "Mật khẩu xác nhận không khớp.",
      });
      return;
    }

    let res: Response;
    try {
      res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone,
          otp: values.otp,
          newPassword: values.newPassword,
        }),
      });
    } catch {
      otpForm.setError("root.serverError", {
        message: "Không thể kết nối tới máy chủ. Vui lòng thử lại.",
      });
      return;
    }

    const data = (await res.json().catch(() => ({}))) as ApiResponse;
    if (!res.ok) {
      if (data.fieldErrors) {
        for (const [key, message] of Object.entries(data.fieldErrors)) {
          if (message) {
            otpForm.setError(key as keyof OtpFormValues, { message });
          }
        }
      }
      otpForm.setError("root.serverError", {
        message: data.error ?? "Không đặt lại được mật khẩu.",
      });
      return;
    }

    // Reset thành công → signIn client (Credentials) → redirect về callbackUrl.
    try {
      await signIn("credentials", {
        phone,
        password: values.newPassword,
        redirect: false,
        callbackUrl,
      });
      router.push(callbackUrl);
      router.refresh();
    } catch {
      otpForm.setError("root.serverError", {
        message:
          "Đặt mật khẩu thành công nhưng đăng nhập thất bại. Vui lòng đăng nhập thủ công.",
      });
    }
  };

  // --- Gửi lại OTP (nút ở step "otp") — gọi lại route forgot-password.
  const [resending, setResending] = useState(false);
  const [resendMsg, setResendMsg] = useState<string | null>(null);
  const handleResend = async () => {
    setResending(true);
    setResendMsg(null);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone }),
      });
      const data = (await res.json().catch(() => ({}))) as ApiResponse;
      if (res.ok) {
        setResendMsg("Đã gửi OTP mới. Kiểm tra email admin.");
      } else {
        setResendMsg(data.error ?? "Không gửi lại được OTP.");
      }
    } catch {
      setResendMsg("Không thể kết nối tới máy chủ.");
    } finally {
      setResending(false);
    }
  };

  // --- Render theo step.
  if (step === "phone") {
    return (
      <div className="flex flex-col gap-4">
        <form
          onSubmit={phoneForm.handleSubmit(onPhoneSubmit)}
          className="flex flex-col gap-3.5"
          noValidate
        >
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="phone" className="text-[13px]">
              Số điện thoại
            </Label>
            <Input
              id="phone"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              placeholder="0912345678"
              aria-invalid={!!phoneForm.formState.errors.phone}
              {...phoneForm.register("phone")}
            />
            {phoneForm.formState.errors.phone ? (
              <p className="text-sm text-destructive">
                {phoneForm.formState.errors.phone.message}
              </p>
            ) : null}
          </div>

          {phoneForm.formState.errors.root?.serverError ? (
            <p className="text-sm text-destructive">
              {phoneForm.formState.errors.root.serverError.message}
            </p>
          ) : null}

          <Button
            type="submit"
            disabled={phoneForm.formState.isSubmitting}
            className="mt-1 h-11 w-full text-base"
          >
            {phoneForm.formState.isSubmitting ? "Đang gửi..." : "Gửi yêu cầu"}
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-ink-muted">
          Đã nhớ mật khẩu?{" "}
          <Link
            href="/login"
            className="font-semibold text-brand hover:underline"
          >
            Đăng nhập
          </Link>
        </p>
      </div>
    );
  }

  // Step "otp":
  const otpSubmitting = otpForm.formState.isSubmitting;
  return (
    <div className="flex flex-col gap-4">
      <p className="text-[13px] text-ink-muted">
        Nhập OTP đã gửi tới admin (kèm SĐT{" "}
        <span className="font-semibold text-ink">{phone}</span>) và mật khẩu mới.
      </p>

      <form
        onSubmit={otpForm.handleSubmit(onOtpSubmit)}
        className="flex flex-col gap-3.5"
        noValidate
      >
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="otp" className="text-[13px]">
            Mã OTP (6 chữ số)
          </Label>
          <Input
            id="otp"
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            placeholder="000000"
            maxLength={6}
            aria-invalid={!!otpForm.formState.errors.otp}
            className="text-center text-xl font-bold tracking-[0.3em] font-mono"
            {...otpForm.register("otp")}
          />
          {otpForm.formState.errors.otp ? (
            <p className="text-sm text-destructive">
              {otpForm.formState.errors.otp.message}
            </p>
          ) : null}
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="newPassword" className="text-[13px]">
            Mật khẩu mới
          </Label>
          <Input
            id="newPassword"
            type="password"
            autoComplete="new-password"
            placeholder="••••••••"
            aria-invalid={!!otpForm.formState.errors.newPassword}
            {...otpForm.register("newPassword")}
          />
          {otpForm.formState.errors.newPassword ? (
            <p className="text-sm text-destructive">
              {otpForm.formState.errors.newPassword.message}
            </p>
          ) : null}
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="confirmNewPassword" className="text-[13px]">
            Xác nhận mật khẩu mới
          </Label>
          <Input
            id="confirmNewPassword"
            type="password"
            autoComplete="new-password"
            placeholder="••••••••"
            aria-invalid={!!otpForm.formState.errors.confirmNewPassword}
            {...otpForm.register("confirmNewPassword")}
          />
          {otpForm.formState.errors.confirmNewPassword ? (
            <p className="text-sm text-destructive">
              {otpForm.formState.errors.confirmNewPassword.message}
            </p>
          ) : null}
        </div>

        {otpForm.formState.errors.root?.serverError ? (
          <p className="text-sm text-destructive">
            {otpForm.formState.errors.root.serverError.message}
          </p>
        ) : null}

        <Button
          type="submit"
          disabled={otpSubmitting}
          className="mt-1 h-11 w-full text-base"
        >
          {otpSubmitting ? "Đang đặt lại..." : "Đặt mật khẩu mới"}
        </Button>
      </form>

      <div className="flex flex-col items-center gap-2">
        <button
          type="button"
          onClick={handleResend}
          disabled={resending}
          className="text-xs font-semibold text-brand hover:underline disabled:text-ink-subtle"
        >
          {resending ? "Đang gửi lại..." : "Gửi lại OTP"}
        </button>
        {resendMsg ? (
          <p className="text-xs text-ink-muted">{resendMsg}</p>
        ) : null}
        <button
          type="button"
          onClick={() => {
            setStep("phone");
            otpForm.clearErrors();
          }}
          className="text-xs text-ink-muted hover:text-ink"
        >
          ← Đổi số điện thoại
        </button>
      </div>
    </div>
  );
}
