import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { MatchForm } from "@/features/matches/components/match-form";

// Trang tạo kèo — yêu cầu đăng nhập. Chưa đăng nhập -> về login.
// (Trang /matches là public, nhưng tạo kèo cần biết creator là ai.)
export default async function NewMatchPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?callbackUrl=/matches/new");

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-xl font-bold text-ink">Tạo kèo mới</h1>
        <p className="text-sm text-ink-muted">
          Điền thông tin kèo để đội khác thấy và ráp kèo với bạn.
        </p>
      </div>

      <div className="rounded-xl bg-surface p-4 shadow-sm">
        <MatchForm />
      </div>
    </div>
  );
}
