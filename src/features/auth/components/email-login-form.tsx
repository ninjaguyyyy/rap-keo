"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { requestEmailOtp, type RequestOtpState } from "../actions";

const initialState: RequestOtpState = {};

export function EmailLoginForm() {
  const [state, formAction, pending] = useActionState(
    requestEmailOtp,
    initialState,
  );
  const router = useRouter();

  useEffect(() => {
    if (state.ok && state.email) {
      router.push(`/verify?email=${encodeURIComponent(state.email)}`);
    }
  }, [state, router]);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          name="email"
          type="email"
          inputMode="email"
          autoComplete="email"
          required
          placeholder="ban@email.com"
          className="h-11 text-base"
        />
      </div>

      {state.error ? (
        <p className="text-sm text-destructive">{state.error}</p>
      ) : null}

      <Button type="submit" disabled={pending} className="h-11 w-full text-base">
        {pending ? "Đang gửi mã..." : "Gửi mã đăng nhập"}
      </Button>
    </form>
  );
}
