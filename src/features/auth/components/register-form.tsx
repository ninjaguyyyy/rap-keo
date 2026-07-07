"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { registerManual, type RegisterState } from "../actions";
import { GoogleButton } from "./google-button";

const initialState: RegisterState = {};

export function RegisterForm() {
  const [state, formAction, pending] = useActionState(
    registerManual,
    initialState,
  );

  return (
    <div className="flex flex-col gap-4">
      <form action={formAction} className="flex flex-col gap-3.5">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="name" className="text-[13px]">
            Tên hiển thị
          </Label>
          <Input
            id="name"
            name="name"
            type="text"
            autoComplete="nickname"
            required
            placeholder="VD: Tuấn Anh"
            className="h-12 rounded-xl text-base"
          />
        </div>

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
          <Label htmlFor="password" className="text-[13px]">
            Mật khẩu
          </Label>
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete="new-password"
            required
            placeholder="Tối thiểu 6 ký tự"
            className="h-12 rounded-xl text-base"
          />
        </div>

        {state.error ? (
          <p className="text-sm text-destructive">{state.error}</p>
        ) : null}

        <Button
          type="submit"
          disabled={pending}
          className="mt-1 h-12 w-full rounded-xl text-base"
        >
          {pending ? "Đang tạo tài khoản..." : "Tạo tài khoản"}
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
