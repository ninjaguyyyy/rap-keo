import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { loginSchema, type LoginInput } from "@/features/auth/schemas";

type FieldErrors = Partial<Record<keyof LoginInput, string>>;

function toFieldErrors(
  issues: { path: PropertyKey[]; message: string }[],
): FieldErrors {
  const out: FieldErrors = {};
  for (const issue of issues) {
    const key = issue.path[0];
    if (typeof key === "string") {
      const fieldKey = key as keyof LoginInput;
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

  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Dữ liệu không hợp lệ.",
        fieldErrors: toFieldErrors(parsed.error.issues),
      },
      { status: 400 },
    );
  }

  const { phone, password } = parsed.data;

  let user;
  try {
    user = await db.user.findUnique({ where: { phone } });
  } catch {
    return NextResponse.json(
      { error: "Không thể kiểm tra tài khoản. Vui lòng thử lại." },
      { status: 500 },
    );
  }

  if (!user || !user.passwordHash) {
    return NextResponse.json(
      {
        error: "Số điện thoại hoặc mật khẩu không đúng.",
        fieldErrors: {
          phone: "Số điện thoại hoặc mật khẩu không đúng.",
          password: "Số điện thoại hoặc mật khẩu không đúng.",
        },
      },
      { status: 401 },
    );
  }

  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) {
    return NextResponse.json(
      {
        error: "Số điện thoại hoặc mật khẩu không đúng.",
        fieldErrors: {
          phone: "Số điện thoại hoặc mật khẩu không đúng.",
          password: "Số điện thoại hoặc mật khẩu không đúng.",
        },
      },
      { status: 401 },
    );
  }

  return NextResponse.json(
    {
      ok: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    },
    { status: 200 },
  );
}