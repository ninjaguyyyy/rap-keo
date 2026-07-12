"use server";

// NOTE: Đăng ký thủ công đã chuyển sang API route handler
// `src/app/api/auth/register/route.ts` + React Hook Form ở client
// (`register-form.tsx`). Server action `registerManual` cũ đã bỏ —
// contact creation + per-field error giờ lo ở route + RHF setError.
//
// File này giữ lại "use server" boundary phòng khi thêm auth action khác
// về sau (vd: refresh session, link phone...).
export {};
