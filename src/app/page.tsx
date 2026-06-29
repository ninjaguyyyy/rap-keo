import { redirect } from "next/navigation";

export default function HomePage() {
  // Trang chủ điều hướng vào danh sách kèo (middleware lo việc bắt đăng nhập).
  redirect("/matches");
}
