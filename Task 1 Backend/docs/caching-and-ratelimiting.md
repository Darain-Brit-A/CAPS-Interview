# Caching and Rate Limiting

## Caching Strategy

### What's Cached
All NASA API responses are cached using Redis (with in-memory fallback for local dev):
- **APOD**: 24-hour TTL. Content is published once per UTC day and doesn't change.
- **Mars Rover Photos**: 1-hour TTL. Late photo uploads from NASA can occur.
- **NEO Feed**: 1-hour TTL. Close-approach data may receive corrections.
- **Favorites**: Never cached — our own DB, already fast, must reflect latest writes.

### Cache Key Convention
Keys follow the pattern `nasa:{resource}:{normalized-query-signature}`:
- `nasa:apod:date=2026-06-30`
- `nasa:apod:range=2026-06-01:2026-06-07`
- `nasa:mars-rover:rover=curiosity:sol=1000:camera=FHAZ:page=1`
- `nasa:neo:start=2026-07-01:end=2026-07-05`

### Fail-Open Behavior
If Redis is unavailable, the cache layer fails open: requests pass through to NASA directly without caching. This ensures the API remains functional even if Redis is down — caching is an optimization, not a correctness dependency.

## Rate Limiting

### Our API Protection
We enforce rate limits on our own consumers using `express-rate-limit` with Redis-backed store:

- **General API**: 60 requests per minute per client IP (configurable via `RATE_LIMIT_MAX_REQUESTS`).
- **Write endpoints** (POST/PATCH/DELETE on favorites): 20 requests per minute per client IP — stricter to protect against abuse.
- Exceeding the limit returns `429 Too Many Requests` with a `Retry-After` header.

### NASA Upstream Protection
The NASA HTTP client monitors rate-limit response headers (`X-RateLimit-Limit`, `X-RateLimit-Remaining`) and logs warnings when remaining quota drops below 10%. On NASA 429 responses, we propagate the error as our own `503 Service Unavailable` with `Retry-After` header, rather than retrying.

## Trade-off Under Time Pressure

**Chose TTL-based cache invalidation over event-driven invalidation** because NASA data changes are predictable (APOD once daily, Mars Rover/NEO corrections are rare). TTL-based invalidation required zero additional infrastructure or webhook handling, saving implementation time for the restart-safety job ledger — which had higher correctness risk since incorrect job state could lead to missing daily APOD data entirely.
