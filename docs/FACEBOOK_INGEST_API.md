# Facebook Match Ingest API Contract

This document defines the contract for crawler/AI agents that ingest Facebook posts into Phủi League.

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
      "rawText": "CLB FC Go Vap can tim keo san 7 luc 19h30...",
      "normalized": {
        "teamName": "FC Go Vap",
        "matchType": "FIND_OPPONENT",
        "fieldType": "F7",
        "skillTiers": ["AVERAGE", "ABOVE_AVERAGE"],
        "playTimes": ["2026-11-02T19:30:00+07:00"],
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
  - `rawText`: required, max length `10000`.
  - `normalized` is required with:
    - `matchType`: one of `FIND_OPPONENT | NEED_PLAYERS | FIELD_AVAILABLE | LOOKING_FOR_TEAM`
    - `fieldType`: one of `F5 | F7 | F11`
    - `skillTiers`: array, min `1`, max `8`, values from `MatchSkillTier`
    - `playTimes`: array, min `1`, max `10`, ISO datetime with offset
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
- `source_team_name`
- `source_team_name_source`
- `source_posted_at`
- `source_scraped_at`

Match data:

- `creator_id = first ADMIN user (ordered by created_at ascending)`
- `match_type`, `field_type`, `skill_tiers`, `play_times`, `area`, `note`
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
