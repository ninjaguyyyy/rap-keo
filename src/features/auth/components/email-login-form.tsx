"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
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
        <label htmlFor="email" className="text-sm font-medium text-gray-700">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          inputMode="email"
          autoComplete="email"
          required
          placeholder="ban@email.com"
          className="rounded-xl border border-gray-300 px-4 py-3 text-base outline-none focus:border-green-600 focus:ring-2 focus:ring-green-600/20"
        />
      </div>

      {state.error ? (
        <p className="text-sm text-red-600">{state.error}</p>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="rounded-xl bg-green-600 px-4 py-3 text-base font-semibold text-white transition active:scale-[0.99] disabled:opacity-60"
      >
        {pending ? "Đang gửi mã..." : "Gửi mã đăng nhập"}
      </button>
    </form>
  );
}
