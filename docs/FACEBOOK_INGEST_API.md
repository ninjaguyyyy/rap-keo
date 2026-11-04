# Facebook Match Ingest API Contract

This document defines the contract for crawler/AI agents that ingest Facebook posts into Phủi League.

## Change Log (Crawler-facing)

### 2026-11-03

- Type: `ADDITIVE`
- Change:
  - Added optional `normalized.playersNeeded` (`1..30`).
  - Server persists this to `matches.needed_players` when `normalized.matchType = NEED_PLAYERS` or `INTERNAL`.
- Crawler action required:
  - When parser detects "thiếu/cần thêm N người", send `normalized.playersNeeded = N`.
  - Preferred: send `playersNeeded` for `NEED_PLAYERS` and `INTERNAL` when value is known.
  - For other types, server ignores this field.

### 2026-11-03 (Earlier)

- Type: `BREAKING`
- Change:
  - Deprecated match types were removed from accepted ingest values:
    - `FIELD_AVAILABLE`
    - `LOOKING_FOR_TEAM`
- Crawler action required:
  - Stop emitting those two values immediately.
  - Map legacy intents to supported values:
    - `FIELD_AVAILABLE` -> `FIND_OPPONENT`
    - `LOOKING_FOR_TEAM` -> `NEED_PLAYERS` (when intent is missing players) or `FIND_OPPONENT` (when intent is finding opponent).
  - Expect per-item rejection codes:
    - `DEPRECATED_MATCH_TYPE:FIELD_AVAILABLE`
    - `DEPRECATED_MATCH_TYPE:LOOKING_FOR_TEAM`

### Compatibility Note

- If crawler and API versions are temporarily out of sync, server-side validation will reject incompatible rows per item instead of failing the whole batch.
- Keep batch size <= 50 and monitor `results[].status` / `results[].reason` for rollout safety.

## Endpoint

- Method: `POST`
- URL: `/api/internal/ingest/facebook-matches`
- Runtime: Node.js route handler

## Authentication

Use Bearer token:

```http
Authorization: Bearer <CRAWLER_INGEST_TOKEN>
```

Required server env vars:

- `CRAWLER_INGEST_TOKEN`

## Request Payload

```json
{
  "runId": "fb-2026-11-02-01",
  "source": "facebook",
  "items": [
    {
      "externalId": "group_123_post_456",
      "groupId": "123",
      "postId": "456",
      "postUrl": "https://facebook.com/groups/123/posts/456",
      "postedAt": "2026-11-02T08:00:00Z",
      "scrapedAt": "2026-11-02T10:00:00Z",
      "posterName": "Nguyen Van A",
      "phone": "0905123456",
      "rawText": "CLB FC Go Vap can tim keo san 7 luc 19h30...",
      "normalized": {
        "teamName": "FC Go Vap",
        "matchType": "FIND_OPPONENT",
        "fieldType": "F7",
        "skillTiers": ["AVERAGE", "ABOVE_AVERAGE"],
        "playTimes": ["2026-11-02T19:30:00+07:00"],
        "playersNeeded": 2,
        "area": "Go Vap",
        "note": "San 7, da co san"
      },
      "confidence": 0.87
    }
  ]
}
```

## Validation Rules

- `source` must be `"facebook"`.
- `items` min `1`, max `50` per request.
- Per item:
  - `externalId`: required, max length `191`.
  - `postUrl`: required valid URL.
  - `posterName`: required, max length `120`.
  - `phone`: optional, min length `6`, max length `32`.
  - `rawText`: required, max length `10000`.
  - `normalized` is required with:
    - `matchType`: one of `FIND_OPPONENT | NEED_PLAYERS | INTERNAL`
    - `fieldType`: one of `F5 | F7 | F11`
    - `skillTiers`: array, min `1`, max `8`, values from `MatchSkillTier`
    - `playTimes`: array, min `1`, max `10`, ISO datetime with offset
    - `playersNeeded`: optional int `1..30`, meaningful when `matchType = NEED_PLAYERS | INTERNAL`
    - `teamName | area | note`: optional
  - `confidence`: optional number `0..1`

## Team Name Resolution (Important)

The server always resolves team name in this exact order:

1. `normalized.teamName` (if valid and non-empty)
2. Extract from `rawText` using heuristics (`doi`, `clb`, `club`, `team`, `fc`, etc.)
3. Fallback to `posterName`

Stored fields:

- `matches.source_team_name`
- `matches.source_team_name_source` with enum:
  - `NORMALIZED`
  - `RAW_TEXT`
  - `POSTER_NAME`

## Phone Resolution

The server resolves phone in this order:

1. `phone` from payload (normalize canonical: bỏ khoảng trắng/ký tự phân tách, giữ số; `00` -> `+`)
2. Extract from `rawText` (Vietnamese phone patterns)

If no valid phone is found, `source_phone` is stored as `null`.

## Idempotency & Duplicate Behavior

Idempotency key is:

- `(source_platform = FACEBOOK, source_external_id = externalId)`

Behavior:

- First time: create a new `Match` (`CREATED_MATCH`).
- Duplicate `externalId`: update source metadata (`UPDATED_MATCH`), do not create a new match.

## Fields Written to `matches`

Core source metadata:

- `source_platform = FACEBOOK`
- `source_external_id`
- `source_post_url`
- `source_poster_name`
- `source_phone`
- `source_team_name`
- `source_team_name_source`
- `source_posted_at`
- `source_scraped_at`

Match data:

- `creator_id = first ADMIN user (ordered by created_at ascending)`
- `match_type`, `field_type`, `skill_tiers`, `play_times`, `needed_players`, `area`, `note`
- `status = OPEN`

## Success Response

```json
{
  "ok": true,
  "runId": "fb-2026-11-02-01",
  "received": 2,
  "created": 1,
  "updated": 1,
  "rejected": 0,
  "results": [
    {
      "externalId": "group_123_post_456",
      "status": "CREATED_MATCH",
      "matchId": "4c3bff90-02ac-4f39-bcc0-3e4da727d509",
      "teamNameSource": "NORMALIZED"
    },
    {
      "externalId": "group_123_post_789",
      "status": "UPDATED_MATCH",
      "matchId": "9eeec42e-9682-4678-9d44-b76d70f57f82",
      "teamNameSource": "POSTER_NAME"
    }
  ]
}
```

## Error Responses

- `401 UNAUTHORIZED`
- `400 INVALID_PAYLOAD`
- `500 INGEST_AUTH_NOT_CONFIGURED`
- `500 ADMIN_USER_NOT_FOUND`

Per-item rejection in `results`:

- `INVALID_ITEM`
- `DEPRECATED_MATCH_TYPE:FIELD_AVAILABLE`
- `DEPRECATED_MATCH_TYPE:LOOKING_FOR_TEAM`
- `CREATE_FAILED`

## cURL Example

```bash
curl -X POST "https://<your-domain>/api/internal/ingest/facebook-matches" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <CRAWLER_INGEST_TOKEN>" \
  -d '{
    "runId": "fb-2026-11-02-01",
    "source": "facebook",
    "items": [
      {
        "externalId": "group_123_post_456",
        "postUrl": "https://facebook.com/groups/123/posts/456",
        "posterName": "Nguyen Van A",
        "phone": "0905123456",
        "rawText": "FC Go Vap can tim doi da 19h30 san 7",
        "normalized": {
          "matchType": "FIND_OPPONENT",
          "fieldType": "F7",
          "skillTiers": ["AVERAGE"],
          "playTimes": ["2026-11-02T19:30:00+07:00"]
        }
      }
    ]
  }'
```
