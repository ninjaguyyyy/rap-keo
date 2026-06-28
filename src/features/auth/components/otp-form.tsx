"use client";

import { useActionState } from "react";
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
        <label htmlFor="otp" className="text-sm font-medium text-gray-700">
          Mã OTP
        </label>
        <input
          id="otp"
          name="otp"
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={6}
          required
          placeholder="______"
          className="rounded-xl border border-gray-300 px-4 py-3 text-center text-2xl tracking-[0.5em] outline-none focus:border-green-600 focus:ring-2 focus:ring-green-600/20"
        />
        <p className="text-sm text-gray-500">
          Mã gồm 6 chữ số đã gửi tới <span className="font-medium">{email}</span>
        </p>
      </div>

      {state.error ? (
        <p className="text-sm text-red-600">{state.error}</p>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="rounded-xl bg-green-600 px-4 py-3 text-base font-semibold text-white transition active:scale-[0.99] disabled:opacity-60"
      >
        {pending ? "Đang xác thực..." : "Xác nhận"}
      </button>
    </form>
  );
}
