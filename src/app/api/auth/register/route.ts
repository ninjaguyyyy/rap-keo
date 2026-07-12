// POST /api/auth/register — tạo tài khoản thủ công (SĐT + mật khẩu + tên hiển thị).
// Validate bằng registerSchema (zod, giống registerManual cũ). Sau khi tạouser
// xong, client tự gọi signIn("credentials") để set session (giống login-form.tsx).
// Route handler chỉ lo tạo user + trả JSON chuẩn; không set cookie session ở đây.
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { registerSchema, type RegisterInput } from "@/features/auth/schemas";

type FieldErrors = Partial<Record<keyof RegisterInput, string>>;

// Chuyển ZodError -> { field, message } theo first-path-segment (giống pattern
// matches/actions.ts). First-wins: mỗi field chỉ lấy thông điệp đầu tiên.
function toFieldErrors(
  issues: { path: PropertyKey[]; message: string }[],
): FieldErrors {
  const out: FieldErrors = {};
  for (const issue of issues) {
    const key = issue.path[0];
    if (typeof key === "string") {
      const fieldKey = key as keyof RegisterInput;
      if (!out[fieldKey]) out[fieldKey] = issue.message;
    }
  }
  return out;
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Yêu cầu không hợp lệ (JSON)." },
      { status: 400 },
    );
  }

  const parsed = registerSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Dữ liệu không hợp lệ.",
        fieldErrors: toFieldErrors(parsed.error.issues),
      },
      { status: 400 },
    );
  }

  const { name, phone, password } = parsed.data;

  // SĐT chưa được dùng (unique).
  const existing = await db.user.findUnique({ where: { phone } });
  if (existing) {
    return NextResponse.json(
      {
        error: "Số điện thoại đã được đăng ký.",
        fieldErrors: { phone: "Số điện thoại đã được đăng ký." },
      },
      { status: 409 },
    );
  }

  try {
    const passwordHash = await bcrypt.hash(password, 10);
    await db.user.create({
      data: { name, phone, passwordHash },
    });
  } catch {
    return NextResponse.json(
      { error: "Không thể tạo tài khoản. Vui lòng thử lại." },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true }, { status: 200 });
}
