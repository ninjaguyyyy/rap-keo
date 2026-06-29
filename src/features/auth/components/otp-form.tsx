"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { verifyEmailOtp, type VerifyOtpState } from "../actions";

const initialState: VerifyOtpState = {};

export function OtpForm({ email }: { email: string }) {
  const [state, formAction, pending] = useActionState(
    verifyEmailOtp,
    initialState,
  );

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="email" value={email} />

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="otp">Mã OTP</Label>
        <Input
          id="otp"
          name="otp"
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={6}
          required
          placeholder="______"
          className="h-12 text-center text-2xl tracking-[0.5em]"
        />
        <p className="text-sm text-muted-foreground">
          Mã gồm 6 chữ số đã gửi tới <span className="font-medium">{email}</span>
        </p>
      </div>

      {state.error ? (
        <p className="text-sm text-destructive">{state.error}</p>
      ) : null}

      <Button type="submit" disabled={pending} className="h-11 w-full text-base">
        {pending ? "Đang xác thực..." : "Xác nhận"}
      </Button>
    </form>
  );
}
