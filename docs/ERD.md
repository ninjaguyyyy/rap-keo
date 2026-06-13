# ERD — Ráp Kèo (Database Schema)

> DB: PostgreSQL + PostGIS. Toạ độ dùng kiểu `geography(Point, 4326)` để query "sân gần" bằng `ST_DWithin` / `ST_Distance`.

## Bảng

### User
- id (uuid, pk)
- phone (string, unique)        -- đăng nhập OTP
- name (string)
- avatar_url (string, nullable)
- created_at, updated_at

### Team
- id (uuid, pk)
- name (string)
- owner_id (fk -> User.id)      -- đội trưởng
- skill_tier (enum: FUN, AMATEUR, SEMI_PRO)
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
- match_type (enum: FIND_OPPONENT, NEED_PLAYERS, FIELD_AVAILABLE)
- field_type (enum: F5, F7, F11)
- skill_tier (enum: FUN, AMATEUR, SEMI_PRO, ANY)
- field_id (fk -> Field.id, nullable)     -- sân cụ thể nếu đã có
- area (string, nullable)                 -- khu vực mong muốn
- location (geography Point, nullable)     -- để filter "gần"
- play_time (timestamp)                   -- thời gian đá
- cost_per_side (int, nullable)           -- chi phí chia sân (VND)
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
- Match(status, play_time): lọc kèo OPEN sắp tới.
- Field.location: GIST index.

## Logic hết hạn
Job định kỳ chuyển Match `OPEN`/`MATCHED` có `play_time` đã qua sang `EXPIRED`.