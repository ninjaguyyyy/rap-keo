---
version: alpha
name: Ráp Kèo
description: Hệ thống nhận diện cho web ghép kèo bóng đá phủi — mobile-first, tông xanh cỏ năng động.
colors:
  brand: "#15803D"            # Xanh cỏ đậm — màu chính cho nút/link/heading (đạt AA trên nền trắng)
  brandHover: "#166534"       # Trạng thái hover/active của brand
  brandBright: "#16A34A"      # Xanh cỏ tươi — mảng trang trí lớn, focus ring
  brandSoft: "#DCFCE7"        # Nền nhạt cho badge/khối nhấn xanh
  ink: "#111827"              # Chữ chính
  inkMuted: "#6B7280"         # Chữ phụ
  inkSubtle: "#9CA3AF"        # Chữ mờ / placeholder
  surface: "#FFFFFF"          # Nền card/khối nổi
  surfaceMuted: "#F9FAFB"     # Nền trang
  line: "#E5E7EB"             # Đường viền/đường kẻ
  danger: "#DC2626"           # Lỗi / hành động phá huỷ
  dangerSoft: "#FEE2E2"       # Nền nhạt cho thông báo lỗi
  typeOpponent: "#1D4ED8"     # Badge "Tìm đối"
  typeOpponentSoft: "#DBEAFE"
  typePlayers: "#B45309"      # Badge "Thiếu người"
  typePlayersSoft: "#FEF3C7"
  typeField: "#047857"        # Badge "Có sân trống"
  typeFieldSoft: "#D1FAE5"
typography:
  display:
    fontFamily: "var(--font-geist-sans), system-ui, sans-serif"
    fontSize: 30px
    fontWeight: 800
    lineHeight: 1.15
  heading:
    fontFamily: "var(--font-geist-sans), system-ui, sans-serif"
    fontSize: 20px
    fontWeight: 700
    lineHeight: 1.3
  body:
    fontFamily: "var(--font-geist-sans), system-ui, sans-serif"
    fontSize: 16px
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "var(--font-geist-sans), system-ui, sans-serif"
    fontSize: 14px
    fontWeight: 600
    lineHeight: 1.4
  caption:
    fontFamily: "var(--font-geist-sans), system-ui, sans-serif"
    fontSize: 12px
    fontWeight: 600
    lineHeight: 1.4
rounded:
  sm: 8px
  md: 12px
  lg: 16px
  xl: 24px
  full: 9999px
spacing:
  1: 4px
  2: 8px
  3: 12px
  4: 16px
  5: 20px
  6: 24px
  8: 32px
components:
  button:
    backgroundColor: "{colors.brand}"
    textColor: "{colors.surface}"
    typography: "{typography.label}"
    rounded: "{rounded.lg}"
    padding: "12px 16px"
  buttonHover:
    backgroundColor: "{colors.brandHover}"
  card:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.xl}"
    padding: "16px"
  input:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.lg}"
    padding: "12px 16px"
  badge:
    rounded: "{rounded.full}"
    typography: "{typography.caption}"
    padding: "4px 10px"
---

# Ráp Kèo — Design System

## Overview

Ráp Kèo là web (mobile-first) giúp đội bóng phủi tìm đối, tìm người, tìm sân. Giao diện cần
**nhanh, rõ, năng động** — đúng tinh thần sân cỏ. Người dùng thao tác bằng một tay trên điện thoại,
trong điều kiện ánh sáng ngoài trời, nên ưu tiên tương phản cao, vùng chạm lớn, ít chữ.

Nguyên tắc:
- **Mobile-first**: thiết kế cho màn hình hẹp trước; layout giới hạn bề ngang (`max-width` ~`640px`), căn giữa.
- **Tương phản cao**: chữ luôn đạt WCAG AA. Không dùng chữ xám nhạt trên nền sáng cho nội dung quan trọng.
- **Năng động nhưng gọn**: màu xanh cỏ làm điểm nhấn hành động; phần còn lại trung tính để nội dung nổi bật.

## Colors

Màu chính là **xanh cỏ** (`brand`). Lưu ý quan trọng về tương phản:
- `brand` (#15803D) dùng cho nút, link, heading vì đạt AA khi đặt trên nền trắng/chữ trắng.
- `brandBright` (#16A34A) **chỉ dùng cho mảng trang trí lớn / focus ring**, KHÔNG dùng làm màu chữ nhỏ trên nền trắng (tương phản không đạt AA).
- Mỗi loại kèo có cặp màu riêng (chữ đậm + nền nhạt) cho badge: `typeOpponent` (Tìm đối · xanh dương), `typePlayers` (Thiếu người · hổ phách), `typeField` (Có sân trống · xanh ngọc).

## Typography

Dùng một font sans (Geist) cho toàn bộ. Thang chữ: `display` (tiêu đề lớn/logo), `heading` (tiêu đề mục),
`body` (nội dung), `label` (nút, nhãn form), `caption` (badge, chú thích). Heading và label in đậm để dễ quét.

## Layout

- Khung nội dung căn giữa, `max-width` ~`640px`, padding ngang `16px`.
- Khoảng cách dùng thang `spacing` (bội số của 4px). Khoảng cách giữa các card: `12px`.
- Vùng chạm tối thiểu `44px` chiều cao cho nút và control.

## Elevation & Depth

Giao diện phẳng, nhẹ. Card và header dùng bóng rất nhẹ (`shadow-sm`) thay vì viền nặng.
Header dính trên cùng (`sticky top`) có đường kẻ `line` mảnh phía dưới.

## Shapes

Bo góc mềm, thân thiện: input/nút dùng `rounded.lg` (16px), card dùng `rounded.xl` (24px),
badge bo tròn hết `rounded.full`. Không dùng góc vuông cứng.

## Components

> Triển khai bằng **shadcn/ui** (Base UI + Tailwind) trong `src/components/ui/`. Biến semantic của
> shadcn được map sang palette brand trong `globals.css` (`--primary`=brand, `--border`=line,
> `--ring`=brandBright, `--destructive`=danger), nên các component mặc định đã đúng tông. Thêm
> component mới: `npx shadcn@latest add <tên>`.

- **Button (primary)**: nền `brand`, chữ trắng. Là hành động chính ("Cáp kèo", "Gửi mã", "Xác nhận"). Trên mobile dùng full-width, cao ≥ 44px (`h-11`).
- **Card kèo**: nền `surface`, bo `xl`, viền/ring nhẹ; badge loại kèo ở góc trên, giờ đá nổi bật bên phải.
- **Input**: viền `line`, focus đổi viền `brand` + ring `brandBright` mờ. Cao ≥ 44px trên mobile.
- **Badge**: bo tròn, chữ nhỏ đậm. Badge loại kèo dùng cặp màu `type*` (chữ đậm + nền nhạt); badge phụ (loại sân, trình độ, chi phí) dùng `variant="secondary"`.
- **Select (bộ lọc)**: dùng shadcn Select; trigger cao ≥ 40px.

## Do's and Don'ts

- ✅ Dùng `brand` (#15803D) cho mọi nút/link/heading chính.
- ✅ Giữ nền trang `surfaceMuted`, nội dung đặt trên card `surface`.
- ✅ Vùng chạm ≥ 44px; ưu tiên một cột trên mobile.
- ❌ KHÔNG dùng `brandBright` làm màu chữ nhỏ trên nền trắng (rớt AA).
- ❌ KHÔNG đặt chữ `inkSubtle` cho nội dung quan trọng (chỉ cho placeholder/chú thích).
- ❌ KHÔNG dùng nhiều màu nhấn cạnh tranh nhau; mỗi màn chỉ một hành động chính màu `brand`.
- ❌ KHÔNG dùng dark theme ở giai đoạn này (thiết kế đang tối ưu cho nền sáng).
