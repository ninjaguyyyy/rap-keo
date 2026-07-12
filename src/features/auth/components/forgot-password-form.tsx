"use client";

import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  forgotPasswordSchema,
  type ForgotPasswordInput,
} from "../schemas";

type ForgotPasswordApiResponse = {
  ok?: boolean;
  message?: string;
  error?: string;
};

export function ForgotPasswordForm() {
  const {
    register,
    handleSubmit,
    setError,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordInput>({
    resolver: zodResolver(forgotPasswordSchema),
    mode: "onTouched",
  });

  const onSubmit = async (values: ForgotPasswordInput) => {
    let res: Response;
    try {
      res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
    } catch {
      setError("root.serverError", {
        message: "Không thể kết nối tới máy chủ. Vui lòng thử lại.",
      });
      return;
    }

    const data = (await res.json().catch(() => ({}))) as ForgotPasswordApiResponse;
    if (!res.ok) {
      setError("root.serverError", {
        message: data.error ?? "Không thể gửi yêu cầu. Vui lòng thử lại.",
      });
      return;
    }

    reset();
    setError("root.success", {
      type: "manual",
      message:
        data.message ??
        "Nếu số điện thoại tồn tại, chúng tôi sẽ gửi hướng dẫn đặt lại mật khẩu.",
    });
  };

  return (
    <div className="flex flex-col gap-4">
      <form
        onSubmit={handleSubmit(onSubmit)}
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
            aria-invalid={!!errors.phone}
            className="h-12 rounded-xl text-base"
            {...register("phone")}
          />
          {errors.phone ? (
            <p className="text-sm text-destructive">{errors.phone.message}</p>
          ) : null}
        </div>

        {errors.root?.serverError ? (
          <p className="text-sm text-destructive">
            {errors.root.serverError.message}
          </p>
        ) : null}

        {errors.root?.success ? (
          <p className="text-sm text-brand">{errors.root.success.message}</p>
        ) : null}

        <Button
          type="submit"
          disabled={isSubmitting}
          className="mt-1 h-12 w-full rounded-xl text-base"
        >
          {isSubmitting ? "Đang gửi..." : "Gửi yêu cầu"}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-ink-muted">
        Đã nhớ mật khẩu?{" "}
        <Link href="/login" className="font-semibold text-brand hover:underline">
          Đăng nhập
        </Link>
      </p>
    </div>
  );
}