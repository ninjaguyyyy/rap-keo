// Avatar tròn cho team/user name. Nếu có imageUrl thì render ảnh; nếu không thì
// fallback chữ cái đầu trên nền brand.
// Presentational, không state -> render được trong Server Component.
import Image from "next/image";
import { cn } from "@/lib/utils";

export function TeamAvatar({
  name,
  imageUrl,
  size = "sm",
  className,
}: {
  name: string;
  imageUrl?: string | null;
  size?: "sm" | "lg";
  className?: string;
}) {
  // Chữ cái đầu (giữ dấu tiếng Việt, VD "Đội ABC" -> "Đ"). Fallback "?" nếu rỗng.
  const letter = name.trim().charAt(0).toUpperCase() || "?";

  return (
    <span
      aria-hidden="true"
      className={cn(
        "relative grid shrink-0 place-items-center overflow-hidden rounded-full bg-brand font-extrabold text-white",
        size === "lg" ? "h-20 w-20 text-3xl" : "h-10 w-10 text-base",
        className,
      )}
    >
      {imageUrl ? (
        <Image
          src={imageUrl}
          alt=""
          fill
          sizes={size === "lg" ? "96px" : "40px"}
          className="object-cover"
        />
      ) : (
        letter
      )}
    </span>
  );
}
