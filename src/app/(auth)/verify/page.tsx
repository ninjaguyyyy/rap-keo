import Link from "next/link";
import { redirect } from "next/navigation";
import { OtpForm } from "@/features/auth/components/otp-form";

// Next 16: searchParams là Promise.
export default async function VerifyPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string }>;
}) {
  const { email } = await searchParams;
  if (!email) redirect("/login");

  return (
    <div>
      <h2 className="mb-1 text-xl font-bold text-gray-900">Nhập mã OTP</h2>
      <p className="mb-6 text-sm text-gray-500">
        Kiểm tra hộp thư để lấy mã đăng nhập.
      </p>
      <OtpForm email={email} />
      <Link
        href="/login"
        className="mt-4 block text-center text-sm text-green-700 underline"
      >
        Dùng email khác
      </Link>
    </div>
  );
}
