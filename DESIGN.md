---
version: beta
name: Phủi League
description: Hệ thống nhận diện mobile-first theo phong cách Premier League (phase 1 foundation).
colors:
  brand: "#37003C"            # Primary purple cho CTA, heading chính
  brandHover: "#4A0050"
  brandBright: "#64006E"      # Focus ring / emphasis
  brandSoft: "#F3E8FF"
  brandSpotlight: "#240028"   # Hero / spotlight surface
  accentLime: "#00FF85"       # Accent highlight
  accentLimeInk: "#073B2A"
  accentYellow: "#FFCB05"
  matchHome: "#2341B2"        # Left panel ở match detail scoreboard
  matchAway: "#DD2D39"        # Right panel ở match detail scoreboard
  ink: "#2A0634"
  inkMuted: "#70557E"
  inkSubtle: "#9F8BAA"
  surface: "#FFFFFF"
  surfaceMuted: "#F7F3FA"
  line: "#E8DFF0"
  danger: "#D7265F"
  dangerSoft: "#FFE7F0"
typography:
  headingFamily: '"Sora", var(--font-app-heading), system-ui, sans-serif'
  bodyFamily: '"Plus Jakarta Sans", var(--font-app-sans), system-ui, sans-serif'
  displayWeight: 800
  headingWeight: 700
  bodyWeight: 500
shape:
  buttonRadius: 12px
  inputRadius: 12px
  cardRadius: 16px
---

# Phủi League — Design System (Premier-inspired)

## 1) Mục tiêu visual

- Chuyển toàn bộ UI sang ngôn ngữ thiết kế tím đậm + accent neon.
- Ưu tiên cảm giác: **đậm, sắc nét, giàu tương phản, hiện đại**.
- Vẫn giữ trải nghiệm mobile-first cho người dùng bóng phủi.

## 2) Tokens & semantic mapping

Nguồn sự thật của màu nằm ở [globals.css](/Users/chi.nguyenh/code/rap-keo/src/app/globals.css).

- `--primary`: `brand` (purple) cho CTA chính.
- `--accent`: lime highlight, chỉ dùng làm accent (chip/tag/điểm nhấn).
- `--foreground`: `ink` (tím than), không dùng xám nhạt cho nội dung quan trọng.
- `--border`: `line` (lavender line).

Quy ước utility:
- `bg-brand`, `text-brand`, `border-line`, `text-ink`, `text-ink-muted`...
- Không hardcode màu Tailwind trong feature component khi đã có token semantic.

## 3) Typography

- Heading: **Sora** (đậm, thể thao, có cá tính).
- Body/UI: **Plus Jakarta Sans** (dễ đọc trên mobile).
- Font được load trong [layout.tsx](/Users/chi.nguyenh/code/rap-keo/src/app/layout.tsx).

## 4) Component nền (Phase 1)

Chuẩn đã áp dụng cho shadcn foundation:

- Button: bo tròn `xl`, cao hơn, chữ semibold.
- Input: cao `44px+`, bo tròn `xl`, focus ring rõ.
- Card: bo `2xl`, shadow nhẹ màu tím.
- Badge: pill cao hơn, nét đậm hơn.

Các component nền:
- [button.tsx](/Users/chi.nguyenh/code/rap-keo/src/components/ui/button.tsx)
- [input.tsx](/Users/chi.nguyenh/code/rap-keo/src/components/ui/input.tsx)
- [card.tsx](/Users/chi.nguyenh/code/rap-keo/src/components/ui/card.tsx)
- [badge.tsx](/Users/chi.nguyenh/code/rap-keo/src/components/ui/badge.tsx)

Global navigation:
- Sticky header menu dùng chung toàn app: [sticky-site-header.tsx](/Users/chi.nguyenh/code/rap-keo/src/components/layout/sticky-site-header.tsx).

## 5) Do / Don’t

### Do
- Dùng `brand` cho CTA chính và heading quan trọng.
- Dùng `accentLime` có tiết chế để nhấn trạng thái/live/highlight.
- Giữ card sáng, viền tím nhạt, bóng vừa đủ.
- Ưu tiên hierarchy rõ: title đậm, metadata dịu hơn.

### Don’t
- Không quay lại palette xanh cỏ cũ.
- Không để nhiều CTA cùng cấp cạnh tranh màu.
- Không dùng xám nhạt cho text chính.
- Không lạm dụng neon làm nền diện rộng gây chói.

## 6) Rollout

Phase 1 (đang làm):
- Foundation tokens + shadcn base styles.
- Áp dụng lên màn Teams trước.

Phase 2:
- Matches list/detail + Home shell.

Phase 3:
- Auth + các flow còn lại, unify spacing/typography toàn app.
