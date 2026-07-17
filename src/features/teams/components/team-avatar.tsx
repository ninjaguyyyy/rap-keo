// Avatar tròn chữ cái đầu tên đội, nền brand. Dùng chung cho card (list) + hero
// (detail). Chưa upload logo (logo_url null) — dùng chữ cái đầu làm placeholder.
// Presentational, không state -> render được trong Server Component.
import { cn } from "@/lib/utils";

export function TeamAvatar({
  name,
  size = "sm",
  className,
}: {
  name: string;
  size?: "sm" | "lg";
  className?: string;
}) {
  // Chữ cái đầu (giữ dấu tiếng Việt, VD "Đội ABC" -> "Đ"). Fallback "?" nếu rỗng.
  const letter = name.trim().charAt(0).toUpperCase() || "?";

  return (
    <span
      aria-hidden="true"
      className={cn(
        "grid shrink-0 place-items-center rounded-full bg-brand font-extrabold text-white",
        size === "lg" ? "h-20 w-20 text-3xl" : "h-10 w-10 text-base",
        className,
      )}
    >
      {letter}
    </span>
  );
}
