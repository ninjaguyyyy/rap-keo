# CLAUDE.md — Ráp Kèo

> File này Claude Code tự đọc mỗi phiên. Đọc cả `docs/PRD.md` và `docs/ERD.md` trước khi làm.

## Về dự án
- **Tên dự án (repo):** rap-keo
- **Tên hiển thị:** Ráp Kèo
- **Mô tả:** Web app (mobile-first) giúp đội bóng phủi ráp kèo: tìm đối, tìm người, tìm sân — với bộ lọc theo vị trí gần, loại sân, thời gian, trình độ.
- **Quy mô:** solo dev.

## Tech stack (đã chốt)
- **Frontend + Backend:** Next.js (App Router) full-stack, 1 codebase. API qua Route Handlers / Server Actions.
- **Ngôn ngữ:** TypeScript.
- **Database:** PostgreSQL + PostGIS (query vị trí "sân gần").
- **ORM:** Prisma (lưu ý: cột geography dùng raw SQL / unsupported type của Prisma).
- **Auth:** đăng nhập bằng số điện thoại + OTP.
- **UI:** Tailwind CSS, thiết kế mobile-first.
- **Map:** chọn sau (Google Maps hoặc Mapbox).

## Quy ước
- Code & comment kỹ thuật: tiếng Anh. Nội dung hiển thị cho người dùng: tiếng Việt.
- Cấu trúc theo feature (feature-based folders), không gom hết vào 1 chỗ.
- Đặt tên rõ ràng, tránh viết tắt khó hiểu.
- Validate input ở server (dùng zod).
- Không commit secret; dùng `.env` (có `.env.example`).

## Cách làm việc (quan trọng)
- **Luôn lập plan trước khi code.** Đề xuất hướng làm, chờ tôi duyệt rồi mới code.
- Làm theo **task nhỏ**, từng feature một. Không làm cả app một lần.
- Sau khi code: chạy lint + typecheck + test, tự sửa lỗi.
- Commit theo từng feature hoàn chỉnh, message rõ ràng.
- Khi đụng tới schema DB: đối chiếu `docs/ERD.md`, không tự ý đổi cấu trúc khi chưa hỏi.

## Thứ tự build MVP
1. Scaffold project (Next.js + TS + Tailwind + Prisma + Postgres/PostGIS) + Docker compose cho DB.
2. Prisma schema theo `docs/ERD.md` + migration + setup PostGIS.
3. Auth OTP qua số điện thoại.
4. CRUD đội bóng (Team) + thành viên.
5. Tạo kèo (Match) — feature lõi.
6. Tìm + filter kèo (gần, loại sân, giờ, trình độ, loại kèo).
7. Ghép kèo (MatchRequest) + thông báo + khóa kèo.
8. Danh sách sân (Field) — hiển thị.

## Lệnh hay dùng
(điền sau khi scaffold)
- Dev: `npm run dev`
- Lint: `npm run lint`
- Typecheck: `npm run typecheck`
- Migrate: `npx prisma migrate dev`
- DB local: `docker compose up -d`