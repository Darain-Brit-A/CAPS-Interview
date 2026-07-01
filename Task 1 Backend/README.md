# Space Explorer Dashboard API — Backend

## Implementation Specification (v1.0)

> **Audience**: This document is a complete implementation blueprint. It is written for an engineer or an AI coding agent (e.g. GitHub Copilot) to implement the project end-to-end without requiring clarification. Every section defines a concrete, unambiguous contract: data shapes, endpoint behavior, error codes, and acceptance criteria. Where a decision has been left open, it is explicitly flagged as `DECISION POINT` with a recommended default.

---

## 1. Project Summary

A backend service that:

1. Proxies and normalizes three NASA open APIs (APOD, Mars Rover Photos, NEO) behind a clean, versioned REST API.
2. Provides full CRUD for a **Favorites** resource backed by a relational database, allowing users to bookmark any NASA API result (an APOD entry, a Mars Rover photo, or a NEO record) with personal notes and tags.
3. Shields NASA's rate-limited upstream API using a caching layer.
4. Runs a scheduled background job that pre-fetches and stores each day's APOD, decoupled from user request traffic.

This is a backend-only deliverable. No frontend is in scope.

---

## 2. Tech Stack (Required)

| Concern | Choice | Notes |
|---|---|---|
| Language / Runtime | TypeScript on Node.js 20 LTS | Strict mode enabled (`"strict": true` in `tsconfig.json`) |
| Web framework | Express 4.x | REST implementation (see §11 for GraphQL alternative) |
| Database | PostgreSQL 15+ | Relational integrity for Favorites, easy to run locally via Docker |
| ORM | Prisma | Type-safe queries, migration tooling |
| Cache | Redis 7.x | TTL-based caching of upstream NASA responses. In-memory (`node-cache`) is an acceptable fallback for local dev only — see §8 |
| Background jobs | `node-cron` + a persisted job-run ledger table | See §9 for restart-safety requirements |
| HTTP client | `axios` (with `axios-retry`) | For calling NASA endpoints |
| Validation | `zod` | Validate all inbound request params/bodies and outbound NASA response shapes |
| Testing | `jest` + `supertest` | Unit + integration tests |
| API docs | OpenAPI 3.1 spec (`openapi.yaml`) generated/maintained manually, or Postman collection export | Deliverable, not optional |
| Containerization | Docker + `docker-compose.yml` | Must bring up API + Postgres + Redis with one command |
| Logging | `pino` (structured JSON logs) | Include request IDs |
| Environment config | `dotenv` + `zod`-validated config module | Fail fast on missing/invalid env vars at boot |

`DECISION POINT`: REST is the primary implementation target for this spec. If GraphQL is chosen instead, reuse the same service/repository layer and only replace the transport (resolvers instead of controllers) — see §11.

---

## 3. Repository Structure

```
space-explorer-api/
├── src/
│   ├── config/
│   │   ├── env.ts                 # zod-validated environment config, fails fast on boot
│   │   └── logger.ts              # pino logger instance
│   ├── db/
│   │   ├── prisma/
│   │   │   ├── schema.prisma
│   │   │   └── migrations/
│   │   └── client.ts              # Prisma client singleton
│   ├── cache/
│   │   ├── redisClient.ts
│   │   └── cacheService.ts        # get/set/wrap helpers with TTL + key builder
│   ├── integrations/
│   │   └── nasa/
│   │       ├── nasaHttpClient.ts  # axios instance, retry/backoff, rate-limit header parsing
│   │       ├── apodClient.ts
│   │       ├── marsRoverClient.ts
│   │       ├── neoClient.ts
│   │       └── types.ts           # raw NASA API response types
│   ├── modules/
│   │   ├── apod/
│   │   │   ├── apod.controller.ts
│   │   │   ├── apod.service.ts
│   │   │   ├── apod.routes.ts
│   │   │   ├── apod.schema.ts     # zod request/response validators
│   │   │   └── apod.job.ts        # daily background fetch job
│   │   ├── mars-rover/
│   │   │   ├── marsRover.controller.ts
│   │   │   ├── marsRover.service.ts
│   │   │   ├── marsRover.routes.ts
│   │   │   └── marsRover.schema.ts
│   │   ├── neo/
│   │   │   ├── neo.controller.ts
│   │   │   ├── neo.service.ts
│   │   │   ├── neo.routes.ts
│   │   │   └── neo.schema.ts
│   │   └── favorites/
│   │       ├── favorites.controller.ts
│   │       ├── favorites.service.ts
│   │       ├── favorites.repository.ts
│   │       ├── favorites.routes.ts
│   │       └── favorites.schema.ts
│   ├── middleware/
│   │   ├── errorHandler.ts        # centralized error -> HTTP mapping
│   │   ├── requestId.ts
│   │   ├── rateLimiter.ts         # rate limiting for OUR API's own consumers
│   │   ├── notFound.ts
│   │   └── validate.ts            # generic zod validation middleware
│   ├── jobs/
│   │   ├── scheduler.ts           # registers all cron jobs, guards against overlap
│   │   └── jobRunLedger.ts        # persistence for job run state (restart safety)
│   ├── errors/
│   │   └── AppError.ts            # typed application error classes
│   ├── app.ts                     # Express app assembly (no listen())
│   └── server.ts                  # entrypoint: loads env, starts app, starts scheduler
├── tests/
│   ├── unit/
│   ├── integration/
│   └── fixtures/                  # recorded NASA API responses for deterministic tests
├── docs/
│   ├── openapi.yaml
│   ├── postman_collection.json
│   └── caching-and-ratelimiting.md   # the required 1-page write-up (see §14)
├── docker-compose.yml
├── Dockerfile
├── .env.example
├── package.json
├── tsconfig.json
└── README.md
```

---

## 4. Environment Variables

Create `.env` from `.env.example`. The app **must fail fast at startup** (non-zero exit, clear log message) if any required variable is missing or malformed — validate with `zod` in `src/config/env.ts`.

```dotenv
# --- Server ---
NODE_ENV=development                # development | test | production
PORT=4000
API_BASE_PATH=/api/v1

# --- NASA API ---
NASA_API_KEY=REPLACE_ME              # obtained from https://api.nasa.gov
NASA_API_BASE_URL=https://api.nasa.gov

# --- Database ---
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/space_explorer

# --- Cache ---
REDIS_URL=redis://localhost:6379
CACHE_DRIVER=redis                   # redis | memory (memory = dev/test fallback only)

# --- Caching TTLs (seconds) ---
CACHE_TTL_APOD=86400                 # 24h — APOD content changes once/day
CACHE_TTL_MARS_ROVER=3600            # 1h
CACHE_TTL_NEO=3600                   # 1h

# --- Rate limiting (OUR API, protecting our own consumers/NASA quota) ---
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=60

# --- Background job ---
APOD_JOB_CRON=0 6 * * *              # daily at 06:00 UTC (after NASA's APOD typically publishes)
APOD_JOB_ENABLED=true
APOD_JOB_BACKFILL_ON_BOOT=true       # see §9.3

# --- Logging ---
LOG_LEVEL=info
```

`DECISION POINT`: NASA's `DEMO_KEY` (30 req/hour, 50 req/day) may be used for local development, but the deliverable must document registration of a real key and must not hardcode `DEMO_KEY` as a fallback in production code paths — only in `.env.example` as a placeholder comment.

---

## 5. NASA API Integrations — Contracts & Edge Cases

All outbound calls go through `nasaHttpClient.ts`, a single axios instance configured with:
- Base URL `NASA_API_BASE_URL`, `api_key` query param injected on every request.
- Timeout: 10000ms.
- Retry: up to 2 retries on `5xx` and network errors only, exponential backoff (300ms base), **never** retry on `4xx`.
- Interceptor that reads NASA's rate-limit response headers (`X-RateLimit-Limit`, `X-RateLimit-Remaining`) and logs a warning when remaining drops below 10% of limit.
- On HTTP 429 from NASA: do not retry; surface as a typed `UpstreamRateLimitError`, which the error handler maps to our own `503 Service Unavailable` with a `Retry-After` header (NASA resets hourly).

### 5.1 APOD — Astronomy Picture of the Day

**Upstream endpoint**: `GET https://api.nasa.gov/planetary/apod`

**Our endpoint**: `GET /api/v1/apod`

| Query param | Type | Required | Notes |
|---|---|---|---|
| `date` | `YYYY-MM-DD` | no | Defaults to today (server's UTC date) |
| `start_date` | `YYYY-MM-DD` | no | For range queries |
| `end_date` | `YYYY-MM-DD` | no | Defaults to today if `start_date` given without `end_date` |

**Validation rules (enforce before calling NASA):**
- `date` cannot be a future date (relative to server UTC "today") → `400 Bad Request`, code `INVALID_DATE_FUTURE`.
- `date` cannot be earlier than APOD's known minimum date, `1995-06-16` → `400 Bad Request`, code `INVALID_DATE_TOO_EARLY`.
- Cannot supply both `date` and (`start_date`/`end_date`) simultaneously → `400 Bad Request`, code `INVALID_DATE_PARAM_COMBINATION`.
- `start_date` must be ≤ `end_date` → `400 Bad Request`, code `INVALID_DATE_RANGE`.
- Malformed date strings → `400 Bad Request`, code `INVALID_DATE_FORMAT`.

**Response shape (normalized, our API's contract — do not just pass through NASA's raw shape):**

```json
{
  "data": [
    {
      "date": "2026-06-30",
      "title": "string",
      "explanation": "string",
      "mediaType": "image | video",
      "url": "string",
      "hdurl": "string | null",
      "copyright": "string | null"
    }
  ],
  "meta": {
    "count": 1,
    "cached": true,
    "source": "nasa_apod_v1"
  }
}
```

Single-date queries return `data` as a single-element array for response-shape consistency with range queries.

**Edge cases to handle explicitly (tests required):**
- NASA occasionally returns `code: 400` with a message body instead of a proper HTTP error for out-of-range dates — parse NASA's error body defensively, don't assume HTTP status alone is reliable.
- Video-type APOD entries have no `hdurl` — must not throw, `hdurl` becomes `null`.

### 5.2 Mars Rover Photos

**Upstream endpoint**: `GET https://api.nasa.gov/mars-photos/api/v1/rovers/{rover}/photos`

**Our endpoint**: `GET /api/v1/mars-rover/photos`

| Query param | Type | Required | Notes |
|---|---|---|---|
| `rover` | enum: `curiosity`, `opportunity`, `spirit`, `perseverance` | yes | Case-insensitive, normalize to lowercase |
| `sol` | integer ≥ 0 | one of `sol`/`earth_date` required | Martian sol (mission day) |
| `earth_date` | `YYYY-MM-DD` | one of `sol`/`earth_date` required | Mutually exclusive with `sol` |
| `camera` | string | no | Validate against that rover's known camera list (see below) |
| `page` | integer ≥ 1 | no | Default `1`; NASA paginates at 25 photos/page |

**Rover → valid camera abbreviations** (validate and reject unknown combinations with a clear error rather than silently returning empty):

| Rover | Cameras |
|---|---|
| Curiosity | `FHAZ`, `RHAZ`, `MAST`, `CHEMCAM`, `MAHLI`, `MARDI`, `NAVCAM` |
| Opportunity / Spirit | `FHAZ`, `RHAZ`, `NAVCAM`, `PANCAM`, `MINITES` |
| Perseverance | `EDL_RUCAM`, `EDL_RDCAM`, `EDL_DDCAM`, `EDL_PUCAM1`, `EDL_PUCAM2`, `NAVCAM_LEFT`, `NAVCAM_RIGHT`, `MCZ_RIGHT`, `MCZ_LEFT`, `FRONT_HAZCAM_LEFT_A`, `FRONT_HAZCAM_RIGHT_A`, `REAR_HAZCAM_LEFT`, `REAR_HAZCAM_RIGHT`, `SKYCAM`, `SHERLOC_WATSON` |

- `camera` not valid for the given `rover` → `400 Bad Request`, code `INVALID_CAMERA_FOR_ROVER`, message lists valid cameras for that rover.
- Both `sol` and `earth_date` supplied → `400 Bad Request`, code `INVALID_PARAM_COMBINATION`.
- Neither supplied → `400 Bad Request`, code `MISSING_DATE_PARAM`.
- `earth_date` in the future → `400 Bad Request`, code `INVALID_DATE_FUTURE`.
- `sol` or `earth_date` beyond a rover's known active mission window (e.g., Spirit went silent 2010, Opportunity 2018) is **not** rejected client-side (missions can be extended/re-evaluated) — instead, an empty result is a valid, successful response (see below), not an error.

**Response shape:**

```json
{
  "data": [
    {
      "id": 102693,
      "sol": 1000,
      "earthDate": "2015-05-30",
      "camera": { "code": "FHAZ", "fullName": "Front Hazard Avoidance Camera" },
      "rover": { "name": "curiosity", "status": "active" },
      "imgSrc": "string"
    }
  ],
  "meta": {
    "count": 0,
    "page": 1,
    "cached": false,
    "source": "nasa_mars_rover_v1"
  }
}
```

**Critical edge case — empty result set:** A sol/date with zero photos for a rover/camera combination is a **normal, successful `200 OK`** with `"data": []` and `"count": 0`. This must **not** be treated as a `404`. This is explicitly called out as a correctness criterion — test it.

### 5.3 Near Earth Object (NEO) API

**Upstream endpoint**: `GET https://api.nasa.gov/neo/rest/v1/feed`

**Our endpoint**: `GET /api/v1/neo`

| Query param | Type | Required | Notes |
|---|---|---|---|
| `start_date` | `YYYY-MM-DD` | no | Defaults to today |
| `end_date` | `YYYY-MM-DD` | no | Defaults to `start_date` + 7 days if omitted |
| `min_diameter_km` | number ≥ 0 | no | Client-side filter applied **after** fetching (NASA has no such param) |
| `max_diameter_km` | number ≥ 0 | no | Client-side filter applied after fetching |
| `hazardous_only` | boolean | no | Client-side filter |

**Validation rules:**
- **The NASA `feed` endpoint hard-rejects ranges over 7 days** — validate this ourselves *before* calling NASA so we return a clean, fast `400` instead of proxying NASA's error: `end_date - start_date > 7 days` → `400 Bad Request`, code `INVALID_DATE_RANGE_EXCEEDS_LIMIT`, message: `"NEO feed queries are limited to a 7-day range."`
- `start_date > end_date` → `400 Bad Request`, code `INVALID_DATE_RANGE`.
- Future dates are allowed for NEO (NASA publishes forward-looking close-approach data) — do **not** reject future dates here, unlike APOD/Mars Rover.
- Malformed dates → `400 Bad Request`, code `INVALID_DATE_FORMAT`.

**Response shape (flattened from NASA's date-keyed object into an array, sorted by `closeApproachDate` ascending):**

```json
{
  "data": [
    {
      "id": "3542519",
      "name": "string",
      "estimatedDiameterKm": { "min": 0.12, "max": 0.27 },
      "isPotentiallyHazardous": true,
      "closeApproachDate": "2026-07-01",
      "missDistanceKm": 123456.7,
      "relativeVelocityKmS": 12.3
    }
  ],
  "meta": {
    "count": 1,
    "elementCount": 1,
    "cached": false,
    "startDate": "2026-07-01",
    "endDate": "2026-07-05",
    "source": "nasa_neo_v1"
  }
}
```

`min_diameter_km`/`max_diameter_km`/`hazardous_only` filters are applied in `neo.service.ts` after normalization, and `meta.count` reflects the post-filter count while `meta.elementCount` reflects NASA's raw element count (useful for debugging filter behavior).

---

## 6. Favorites — CRUD Specification

Favorites let a user save any NASA object (APOD entry, Mars Rover photo, or NEO record) with personal `notes` and `tags`.

### 6.1 Database Schema (Prisma)

```prisma
// schema.prisma

enum FavoriteSourceType {
  APOD
  MARS_ROVER_PHOTO
  NEO
}

model Favorite {
  id            String             @id @default(uuid())
  sourceType    FavoriteSourceType
  sourceId      String             // natural key from NASA data, e.g. APOD date, photo id, NEO id
  title         String             // denormalized display title, captured at save-time
  payload       Json               // full normalized object as returned by our API at save-time (snapshot)
  notes         String?            @db.Text
  tags          String[]           @default([])
  createdAt     DateTime           @default(now())
  updatedAt     DateTime           @updatedAt

  @@unique([sourceType, sourceId])
  @@index([sourceType])
  @@index([tags])
}
```

Design rationale: `payload` stores a snapshot so a favorite remains viewable even if the underlying NASA data changes or NASA's upstream is unavailable. `sourceType` + `sourceId` are unique together to prevent duplicate favoriting of the same object (creating a duplicate returns `409 Conflict`, not a silent second row).

### 6.2 Endpoints

All under `/api/v1/favorites`.

#### `POST /api/v1/favorites` — Create

**Request body:**
```json
{
  "sourceType": "APOD | MARS_ROVER_PHOTO | NEO",
  "sourceId": "string",
  "title": "string",
  "payload": { "...": "the object being favorited, as returned by our own API" },
  "notes": "string (optional)",
  "tags": ["string"] 
}
```
- `sourceType`, `sourceId`, `title`, `payload` required. `notes` optional, `tags` optional (defaults `[]`).
- Duplicate `(sourceType, sourceId)` → `409 Conflict`, code `FAVORITE_ALREADY_EXISTS`.
- Success → `201 Created`, returns the created resource including generated `id`, `createdAt`, `updatedAt`.

#### `GET /api/v1/favorites` — List

Query params:
| Param | Type | Notes |
|---|---|---|
| `sourceType` | enum | filter |
| `tag` | string | filter — favorites containing this tag |
| `search` | string | case-insensitive match against `title` and `notes` |
| `page` | integer ≥ 1 | default `1` |
| `pageSize` | integer, 1–100 | default `20` |
| `sortBy` | `createdAt`\|`updatedAt`\|`title` | default `createdAt` |
| `sortOrder` | `asc`\|`desc` | default `desc` |

Response:
```json
{
  "data": [ { "id": "...", "sourceType": "APOD", "...": "..." } ],
  "meta": { "page": 1, "pageSize": 20, "totalCount": 42, "totalPages": 3 }
}
```

#### `GET /api/v1/favorites/:id` — Retrieve one
- Not found → `404 Not Found`, code `FAVORITE_NOT_FOUND`.

#### `PATCH /api/v1/favorites/:id` — Update
- Only `notes` and `tags` are mutable via this endpoint (immutable: `sourceType`, `sourceId`, `title`, `payload` — a favorite is a snapshot; if the user wants a fresh snapshot they delete and re-create).
- Body: `{ "notes"?: string, "tags"?: string[] }` — at least one field required, else `400 Bad Request`, code `EMPTY_UPDATE_PAYLOAD`.
- Not found → `404`.
- Success → `200 OK`, returns updated resource.

#### `DELETE /api/v1/favorites/:id` — Delete
- Not found → `404`.
- Success → `204 No Content`.

### 6.3 Validation
All request bodies validated with `zod` schemas in `favorites.schema.ts`; invalid payloads return `400 Bad Request` with a structured `details` array (see §10 error shape).

---

## 7. Full Endpoint Inventory

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/v1/apod` | Fetch APOD (single date or range) |
| GET | `/api/v1/mars-rover/photos` | Fetch Mars Rover photos, filtered |
| GET | `/api/v1/mars-rover/manifests/:rover` | (Optional) Rover mission manifest — max sol, launch/landing dates, status |
| GET | `/api/v1/neo` | Fetch NEO feed, filtered |
| POST | `/api/v1/favorites` | Create favorite |
| GET | `/api/v1/favorites` | List favorites (paginated, filterable) |
| GET | `/api/v1/favorites/:id` | Get one favorite |
| PATCH | `/api/v1/favorites/:id` | Update notes/tags |
| DELETE | `/api/v1/favorites/:id` | Delete favorite |
| GET | `/api/v1/health` | Liveness probe — checks DB + Redis connectivity, returns `200`/`503` |
| GET | `/api/v1/jobs/apod/status` | (Optional, ops-facing) Last N run statuses of the APOD background job |

---

## 8. Caching Strategy

**Goal**: minimize calls to NASA's rate-limited upstream, keep our own API fast, and stay correct (never serve stale data indefinitely).

### 8.1 Cache key convention
`nasa:{resource}:{normalized-query-signature}`

Examples:
- `nasa:apod:date=2026-06-30`
- `nasa:apod:range=2026-06-01:2026-06-07`
- `nasa:mars-rover:rover=curiosity:sol=1000:camera=FHAZ:page=1`
- `nasa:neo:start=2026-07-01:end=2026-07-05`

Build the signature by sorting query params alphabetically before hashing/concatenating, so equivalent requests with differing param order hit the same cache entry.

### 8.2 `cacheService.ts` contract

```ts
async function wrap<T>(
  key: string,
  ttlSeconds: number,
  fetchFn: () => Promise<T>
): Promise<{ value: T; cached: boolean }>
```
- On cache hit: return `{ value, cached: true }`, no upstream call.
- On cache miss: call `fetchFn()`, store result with TTL, return `{ value, cached: false }`.
- On Redis connection failure: log a warning and **fail open** — call `fetchFn()` directly rather than failing the request. Caching is an optimization, not a correctness dependency.
- Every module response includes `meta.cached` reflecting this flag (see §5 response shapes) — this is directly testable and demonstrates the caching layer works.

### 8.3 TTL rationale
- **APOD: 24h.** Content is published once per UTC day and does not change afterward, so a full-day TTL is safe and maximizes cache hits.
- **Mars Rover / NEO: 1h.** These datasets can occasionally receive corrections/backfill from NASA (e.g. late photo uploads for a sol), so a shorter TTL bounds staleness while still meaningfully reducing upstream calls during bursts of user traffic.
- Favorites are **never cached** — they're our own DB, already fast, and must always reflect the latest write.

### 8.4 Cache invalidation
No explicit invalidation endpoint is required for v1 (TTL expiry is sufficient given the data characteristics above). `DECISION POINT`: if requirements later demand it, add an admin-only `DELETE /api/v1/cache?pattern=...` guarded by an internal auth token.

### 8.5 Rate limiting (our own API's consumers)

Independent from NASA's rate limits — this protects *our* service and, indirectly, our NASA quota, from any single client hammering us.

- Implement with `express-rate-limit`, backed by the same Redis instance (`rate-limit-redis` store) so limits are enforced correctly across multiple server instances.
- Default: `RATE_LIMIT_MAX_REQUESTS` (60) per `RATE_LIMIT_WINDOW_MS` (60s) per client IP.
- Exceeding limit → `429 Too Many Requests` with `Retry-After` header and standard error body (§10).
- Favorites write endpoints (`POST`/`PATCH`/`DELETE`) may warrant a stricter limiter than read endpoints — apply a separate, tighter limiter instance to those routes. `DECISION POINT`: default stricter limit suggested as 20/min.

---

## 9. Background Job — Daily APOD Fetch

### 9.1 Behavior
- Scheduled via `node-cron` using `APOD_JOB_CRON` (default daily 06:00 UTC).
- On each run: fetch today's APOD from NASA (bypassing cache read, but writing through to cache on success), and upsert it into a persisted `ApodDaily` table (separate from Favorites) so historical APODs are available even if NASA's upstream is later unreachable.

```prisma
model ApodDaily {
  date         String   @id  // YYYY-MM-DD
  title        String
  explanation  String   @db.Text
  mediaType    String
  url          String
  hdurl        String?
  copyright    String?
  fetchedAt    DateTime @default(now())
}
```

### 9.2 Restart-safety (explicit grading criterion — implement carefully)

Add a `JobRun` ledger table:

```prisma
enum JobStatus {
  RUNNING
  SUCCEEDED
  FAILED
}

model JobRun {
  id          String    @id @default(uuid())
  jobName     String    // e.g. "apod-daily-fetch"
  targetDate  String    // the logical date this run is fetching, YYYY-MM-DD
  status      JobStatus
  startedAt   DateTime  @default(now())
  finishedAt  DateTime?
  errorMessage String?

  @@unique([jobName, targetDate])
}
```

Rules:
1. Before starting work, the job attempts to create a `JobRun` row `(jobName, targetDate, status=RUNNING)`. The `@@unique` constraint means if a row for that `(jobName, targetDate)` already exists, the insert fails — treat this as "another run is already in progress or already completed for this date" and **skip**, logging why (idempotency guard against overlapping cron triggers, e.g. if a previous run is still executing when the next fires).
2. If a previous run is found in `RUNNING` state but its `startedAt` is older than a stale threshold (e.g. 15 minutes — the job should never legitimately take that long), treat it as an orphaned run from a crashed process: mark it `FAILED` with `errorMessage: "orphaned - assumed crashed"`, then proceed with a fresh run.
3. On success: update the row to `SUCCEEDED`, set `finishedAt`.
4. On failure (NASA unreachable, validation error, DB error): update the row to `FAILED`, set `finishedAt` and `errorMessage`. Do not crash the process — background job failures must be caught and logged, never allowed to bring down the server.
5. This design means: **if the server restarts mid-run**, on the next boot (see §9.3) or next scheduled tick, the system can correctly determine "did today's fetch actually complete?" by querying `JobRun` rather than assuming state from memory — memory is exactly what a restart wipes out.

### 9.3 Boot-time backfill check
If `APOD_JOB_BACKFILL_ON_BOOT=true`, on server startup (after DB connection is confirmed), check whether a `SUCCEEDED` `JobRun` exists for today's date. If not, trigger the job immediately (in addition to its normal cron schedule) so a server that was down over its scheduled window doesn't simply miss the day. This directly satisfies "behaves sensibly if the server restarts mid-run."

### 9.4 Testing requirement
Include an integration test that: (a) inserts a stale `RUNNING` `JobRun` row with an old `startedAt`, (b) invokes the job, (c) asserts the stale row is marked `FAILED` and a new run proceeds and succeeds.

---

## 10. Error Handling — Standard Shape

All errors, from all layers, are normalized by `middleware/errorHandler.ts` into:

```json
{
  "error": {
    "code": "INVALID_DATE_RANGE_EXCEEDS_LIMIT",
    "message": "NEO feed queries are limited to a 7-day range.",
    "details": [
      { "field": "end_date", "issue": "must be within 7 days of start_date" }
    ],
    "requestId": "uuid"
  }
}
```

| Scenario | HTTP Status |
|---|---|
| Request validation failure (zod) | 400 |
| Resource not found (Favorite by id) | 404 |
| Duplicate favorite | 409 |
| Our own rate limit exceeded | 429 |
| NASA upstream 429 | 503 (with `Retry-After`) |
| NASA upstream unreachable / timeout | 502 |
| NASA upstream unexpected 4xx (bad request we didn't anticipate) | 502, code `UPSTREAM_ERROR`, original message included in `details` |
| Unhandled exception | 500, generic message, full detail only in server logs (never leak stack traces to client) |

`AppError` base class (in `src/errors/AppError.ts`) carries `httpStatus`, `code`, `message`, `details`; all thrown application errors extend it, and the error handler defaults anything not an `AppError` to `500`.

---

## 11. GraphQL Alternative (if chosen instead of REST)

`DECISION POINT`: If GraphQL is preferred, keep every service/repository function from §5/§6 unchanged and add an `src/graphql/` layer with:
- `typeDefs.graphql` mirroring the REST response shapes as GraphQL types (`Apod`, `MarsRoverPhoto`, `NeoObject`, `Favorite`).
- Resolvers that call the exact same `*.service.ts` functions used by REST controllers — do not duplicate business logic.
- Queries: `apod`, `marsRoverPhotos`, `neoFeed`, `favorites`, `favorite(id)`.
- Mutations: `createFavorite`, `updateFavorite`, `deleteFavorite`.
- Use `graphql-yoga` or `apollo-server-express`; expose at `/api/v1/graphql`.
- Validation errors surface as GraphQL errors with an `extensions.code` matching the same error codes used in REST (§10), for consistency.

If both REST and GraphQL are offered, REST remains canonical for the OpenAPI deliverable.

---

## 12. Testing Requirements

| Layer | Tool | Coverage expectation |
|---|---|---|
| Unit — validation | Jest | All zod schemas: valid input passes, each invalid case in §5/§6 produces the documented error code |
| Unit — services | Jest, mocked HTTP client | Normalization logic (raw NASA shape → our response shape), filter logic (NEO diameter/hazardous filters) |
| Integration — API | Jest + Supertest, test DB, recorded fixtures | Full request/response cycle for every endpoint in §7, including the specific edge cases called out below |
| Integration — background job | Jest, test DB | Restart-safety scenario from §9.4 |

**Mandatory edge-case tests (explicitly named in project grading criteria — do not skip):**
1. Mars Rover: a `sol`/rover combination with zero photos returns `200` + `data: []`, not `404`.
2. APOD: a future `date` returns `400` with `INVALID_DATE_FUTURE`.
3. NEO: `end_date` more than 7 days after `start_date` returns `400` with `INVALID_DATE_RANGE_EXCEEDS_LIMIT` **before** any call to NASA is attempted (assert the mock HTTP client was never called).
4. NASA upstream 429 propagates as our `503` with `Retry-After` header.
5. Favorites: duplicate `(sourceType, sourceId)` returns `409`.
6. Favorites: `PATCH` with empty body returns `400`.

Use recorded/mocked NASA responses in `tests/fixtures/` — tests must not depend on live network access or a real API key to run in CI.

---

## 13. Setup & Run

```bash
# 1. Clone and install
git clone <repo-url>
cd space-explorer-api
npm install

# 2. Configure environment
cp .env.example .env
# edit .env — set NASA_API_KEY from https://api.nasa.gov

# 3. Start infra (Postgres + Redis)
docker-compose up -d postgres redis

# 4. Run migrations
npx prisma migrate dev

# 5. Start the API
npm run dev        # ts-node-dev, hot reload
# or
npm run build && npm start   # production build

# 6. Run tests
npm test
npm run test:integration

# Full stack via Docker (API + Postgres + Redis)
docker-compose up --build
```

`package.json` scripts to implement: `dev`, `build`, `start`, `test`, `test:integration`, `lint`, `prisma:generate`, `prisma:migrate`.

---

## 14. Required Deliverables Checklist

- [ ] This README (setup, env vars, architecture — this document satisfies that requirement).
- [ ] `docs/openapi.yaml` **or** `docs/postman_collection.json` covering every endpoint in §7, including example requests/responses and error cases.
- [ ] `docs/caching-and-ratelimiting.md` — one page or less, covering:
  - The caching strategy from §8 (what's cached, TTL choices and why, fail-open behavior).
  - The rate-limiting strategy from §8.5 (our own endpoint protection).
  - **One explicit trade-off made under time pressure** (e.g., "chose TTL-based invalidation over event-driven invalidation because NASA data changes are predictable and low-frequency, saving implementation time for the restart-safety job ledger, which had higher correctness risk").
- [ ] Automated tests per §12, runnable via `npm test` without live network/API key dependency.
- [ ] `docker-compose.yml` bringing up the full stack with one command.

---

## 15. Non-Functional Requirements

- All monetary/rate-limit-sensitive external calls must be logged with enough context (endpoint, params, cache hit/miss, latency) to debug quota issues in production, via `pino` structured logs.
- No secrets committed to the repo; `.env` is gitignored, `.env.example` has placeholders only.
- API responses are versioned under `/api/v1` to allow non-breaking evolution.
- All dates in requests/responses use ISO 8601 (`YYYY-MM-DD` for dates, full ISO timestamps for `createdAt`/`updatedAt`).
- CORS: configurable allow-list via env var (`CORS_ALLOWED_ORIGINS`), default permissive only in `development`.
