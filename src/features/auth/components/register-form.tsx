"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { signIn } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  registerSchema,
  type RegisterInput,
} from "../schemas";
import { GoogleButton } from "./google-button";

// Register dùng React Hook Form + zodResolver (per-field error, không reset form).
// Submit -> POST /api/auth/register -> nếu OK -> signIn client-side (giống login-form)
// -> redirect về home. Lỗi validate/unique -> setError theo field, giữ nguyên value.
export function RegisterForm() {
  const router = useRouter();
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
    mode: "onTouched",
  });

  const onSubmit = async (values: RegisterInput) => {
    let res: Response;
    try {
      res = await fetch("/api/auth/register", {
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

    const data = (await res.json().catch(() => ({}))) as {
      error?: string;
      fieldErrors?: Partial<Record<keyof RegisterInput, string>>;
    };

    if (!res.ok) {
      if (data.fieldErrors) {
        for (const [key, message] of Object.entries(data.fieldErrors)) {
          if (message) {
            setError(key as keyof RegisterInput, { message });
          }
        }
      }
      setError("root.serverError", {
        message: data.error ?? "Đăng ký không thành công.",
      });
      return;
    }

    // Tạo user OK -> đăng nhập luôn ở client (Credentials provider).
    try {
      await signIn("credentials", {
        phone: values.phone,
        password: values.password,
        redirect: false,
        callbackUrl: "/",
      });
      router.push("/");
      router.refresh();
    } catch {
      setError("root.serverError", {
        message: "Đăng ký thành công nhưng đăng nhập thất bại. Vui lòng đăng nhập thủ công.",
      });
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="flex flex-col gap-3.5"
        noValidate
      >
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="name" className="text-[13px]">
            Tên hiển thị
          </Label>
          <Input
            id="name"
            type="text"
            autoComplete="nickname"
            placeholder="VD: Tuấn Anh"
            aria-invalid={!!errors.name}
            className="h-12 rounded-xl text-base"
            {...register("name")}
          />
          {errors.name ? (
            <p className="text-sm text-destructive">{errors.name.message}</p>
          ) : null}
        </div>

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

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="password" className="text-[13px]">
            Mật khẩu
          </Label>
          <Input
            id="password"
            type="password"
            autoComplete="new-password"
            placeholder="Tối thiểu 6 ký tự"
            aria-invalid={!!errors.password}
            className="h-12 rounded-xl text-base"
            {...register("password")}
          />
          {errors.password ? (
            <p className="text-sm text-destructive">{errors.password.message}</p>
          ) : null}
        </div>

        {errors.root?.serverError ? (
          <p className="text-sm text-destructive">
            {errors.root.serverError.message}
          </p>
        ) : null}

        <Button
          type="submit"
          disabled={isSubmitting}
          className="mt-1 h-12 w-full rounded-xl text-base"
        >
          {isSubmitting ? "Đang tạo tài khoản..." : "Tạo tài khoản"}
        </Button>
      </form>

      <Divider />

      <GoogleButton />

      <p className="mt-6 text-center text-sm text-ink-muted">
        Đã có tài khoản?{" "}
        <Link href="/login" className="font-semibold text-brand hover:underline">
          Đăng nhập
        </Link>
      </p>
    </div>
  );
}

function Divider() {
  return (
    <div className="my-1 flex items-center gap-3 text-[11px] font-semibold tracking-wide text-ink-muted">
      <span className="h-px flex-1 bg-line" />
      HOẶC
      <span className="h-px flex-1 bg-line" />
    </div>
  );
}
