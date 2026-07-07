# ERD — Ráp Kèo (Database Schema)

> DB: PostgreSQL + PostGIS. Toạ độ dùng kiểu `geography(Point, 4326)` để query "sân gần" bằng `ST_DWithin` / `ST_Distance`.

## Bảng

### User
- id (uuid, pk)
- phone (string, unique, **nullable**)   -- đăng nhập thủ công SĐT + mật khẩu (có thể trống nếu đăng nhập bằng Google)
- email (string, unique, nullable)        -- từ Google OAuth; dùng làm key gộp account
- password_hash (string, nullable)        -- bcrypt; null đối với user Google
- name (string, **nullable**)             -- cho nhập sau khi đăng nhập lần đầu (onboarding)
- avatar_url (string, nullable)
- role (enum: USER, ADMIN, default USER)  -- ADMIN: quyền tạo kèo từ text (AI parse) + quản trị
- created_at, updated_at
- *Ràng buộc nghiệp vụ:* mỗi user có ít nhất một định danh (email hoặc phone).

### Account (OAuth)
- id (uuid, pk)
- user_id (fk -> User.id)
- type (string)                          -- kiểu NextAuth (vd "oauth")
- provider (string)                      -- "google"
- provider_account_id (string)           -- ID user tại provider (Google)
- refresh_token, access_token, id_token, scope, token_type, expires_at -- token lưu để refresh
- unique(provider, provider_account_id)  -- mỗi account provider chỉ thuộc 1 user
- *Gộp account:* khi Google user có email trùng user manual đã có, link vào cùng User (giữ phone/password đã có).

### Team
- id (uuid, pk)
- name (string)
- owner_id (fk -> User.id)      -- đội trưởng
- skill_tier (enum 7 mức yếu→mạnh: VERY_WEAK, WEAK, BELOW_AVERAGE, AVERAGE, ABOVE_AVERAGE, GOOD, STRONG)
  -- Hiển thị: Siêu Yếu, Yếu, Trung Bình Yếu, Trung Bình, Trung Bình Khá, Khá, Mạnh
- home_area (string, nullable)  -- khu vực hoạt động
- location (geography Point, nullable)
- logo_url (string, nullable)
- created_at, updated_at

### TeamMember
- id (uuid, pk)
- team_id (fk -> Team.id)
- user_id (fk -> User.id)
- role (enum: OWNER, MEMBER)
- joined_at
- unique(team_id, user_id)

### Field (Sân)
- id (uuid, pk)
- name (string)
- address (string)
- location (geography Point)    -- để tìm sân gần
- field_types (array enum: F5, F7, F11)  -- sân hỗ trợ loại nào
- owner_id (fk -> User.id, nullable)      -- chủ sân (nếu có)
- phone (string, nullable)
- created_at, updated_at

### Match (Kèo) — bảng lõi
- id (uuid, pk)
- creator_id (fk -> User.id)
- team_id (fk -> Team.id, nullable)       -- đội tạo kèo
- match_type (enum: FIND_OPPONENT, NEED_PLAYERS, FIELD_AVAILABLE, LOOKING_FOR_TEAM)
- field_type (enum: F5, F7, F11)
- skill_tiers (array enum: 7 mức như Team + ANY = mọi trình độ)  -- kèo mở cho nhiều trình độ cùng lúc
- field_id (fk -> Field.id, nullable)     -- sân cụ thể nếu đã có
- area (string, nullable)                 -- khu vực mong muốn
- location (geography Point, nullable)     -- để filter "gần"
- play_times (array timestamp)            -- thời gian đá (1 kèo có thể nhiều giờ trong ngày)
- note (text, nullable)
- status (enum: OPEN, MATCHED, CONFIRMED, COMPLETED, CANCELLED, EXPIRED)
- created_at, updated_at

### MatchRequest (Yêu cầu ghép kèo)
- id (uuid, pk)
- match_id (fk -> Match.id)
- requester_id (fk -> User.id)
- requester_team_id (fk -> Team.id, nullable)
- status (enum: PENDING, ACCEPTED, REJECTED, CANCELLED)
- message (text, nullable)
- created_at, updated_at

### Notification
- id (uuid, pk)
- user_id (fk -> User.id)
- type (enum: MATCH_REQUEST, REQUEST_ACCEPTED, REQUEST_REJECTED, MATCH_CONFIRMED, ...)
- payload (json)                          -- id liên quan
- read (bool, default false)
- created_at

## Quan hệ chính
- User 1—n Team (owner). User n—n Team qua TeamMember.
- Team 1—n Match. User 1—n Match (creator).
- Match 1—n MatchRequest.
- Field 1—n Match.

## Index quan trọng
- Match.location: GIST index (PostGIS) cho query gần.
- Match.skill_tiers: GIST/GIN index cho filter hasSome (task sau nếu cần).
- Match.play_times: array — query "OPEN có giờ sắp tới" lọc trong app (MVP).
- Field.location: GIST index.

## Logic hết hạn
Job định kỳ chuyển Match `OPEN`/`MATCHED` có toàn bộ `play_times` đã qua sang `EXPIRED`.