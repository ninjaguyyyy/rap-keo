"use client";

import { useActionState, useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { signIn } from "next-auth/react";
import { GoogleButton } from "./google-button";

// Login dùng signIn() client-side của next-auth (Credentials provider).
export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") ?? "/";

  const [state, formAction, pending] = useActionState(
    // Wrapper useActionState cho phép return error string thay vì object.
    async (_prev: string | undefined, formData: FormData) => {
      const phone = formData.get("phone");
      const password = formData.get("password");
      try {
        await signIn("credentials", {
          phone,
          password,
          redirect: false,
          callbackUrl,
        });
        return undefined;
      } catch {
        return "Số điện thoại hoặc mật khẩu không đúng.";
      }
    },
    undefined,
  );

  // Đăng nhập thành công -> redirect.
  useEffect(() => {
    if (state === undefined) {
      router.push(callbackUrl);
      router.refresh();
    }
  }, [state, router, callbackUrl]);

  return (
    <div className="flex flex-col gap-4">
      <form action={formAction} className="flex flex-col gap-3.5">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="phone" className="text-[13px]">
            Số điện thoại
          </Label>
          <Input
            id="phone"
            name="phone"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            required
            placeholder="0912345678"
            className="h-12 rounded-xl text-base"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <Label htmlFor="password" className="text-[13px]">
              Mật khẩu
            </Label>
            <Link
              href="/forgot-password"
              className="text-xs font-semibold text-brand hover:underline"
              tabIndex={-1}
            >
              Quên mật khẩu?
            </Link>
          </div>
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            placeholder="••••••••"
            className="h-12 rounded-xl text-base"
          />
        </div>

        {state ? <p className="text-sm text-destructive">{state}</p> : null}

        <Button
          type="submit"
          disabled={pending}
          className="mt-1 h-12 w-full rounded-xl text-base"
        >
          {pending ? "Đang đăng nhập..." : "Đăng nhập"}
        </Button>
      </form>

      <Divider />

      <GoogleButton />

      <p className="mt-6 text-center text-sm text-ink-muted">
        Chưa có tài khoản?{" "}
        <Link href="/register" className="font-semibold text-brand hover:underline">
          Đăng ký
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
