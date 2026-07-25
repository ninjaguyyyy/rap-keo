// Slugify tiếng Việt: bỏ dấu + lowercase + thay ký tự không alphanumeric -> "-".
// VD "Giải Mùa Hè 2026!" -> "giai-mua-he-2026". Trim "-" đầu/cuối, gộp "--".
// Dùng cho tournament.slug (URL /tournaments/[slug]). Pure function, không side-effect.
export function slugify(input: string): string {
  return input
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "d")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}
