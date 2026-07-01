# Mission Control Dashboard — Frontend

## Implementation Specification & Engineering Blueprint

> **Audience note**: This document is the complete specification for this project. It is written to be implemented directly by an engineer or an AI coding agent (e.g. GitHub Copilot) without further clarification. Every section below is normative unless explicitly marked "optional" or "nice-to-have." Where a decision is left open, a default is specified — follow the default unless there is a strong reason not to.

---

## 1. Project Summary

Build a client-side web application ("Mission Control Dashboard") that lets a user explore NASA open data:

- **APOD** — Astronomy Picture of the Day (browse by date, view metadata)
- **Mars Rover Photos** — browse photos from Curiosity, Opportunity, Perseverance, and Spirit, filterable by sol/date, camera
- **NEO (Near Earth Objects)** — browse asteroids passing near Earth, filterable by date range and estimated size

The app must feel fast and robust under real-world conditions: large result sets, slow networks, empty results, and API errors.

### 1.1 Backend Status Note

**This frontend must work standalone against NASA's public APIs directly.** A backend-for-frontend (BFF) may exist elsewhere in this repo/organization, but it is **not a hard dependency**. Implement an API client abstraction (see §7) so that:

- If `VITE_API_BASE_URL` (or `NEXT_PUBLIC_API_BASE_URL`, depending on framework choice — see §2) is set, the client calls the proprietary backend at that base URL.
- If it is **not** set, the client calls NASA's APIs directly from the browser using `VITE_NASA_API_KEY` (falls back to NASA's public `DEMO_KEY` if unset, with a visible rate-limit warning banner — see §9.4).

This toggle must require **zero code changes** — only an environment variable.

---

## 2. Tech Stack (Mandatory unless noted)

| Concern | Choice | Notes |
|---|---|---|
| Framework | **React 18+ with Vite** | Vite chosen over Next.js because this is a pure client-side SPA with no SSR requirement and NASA APIs are called client-side. If SSR/edge caching is desired instead, Next.js (App Router) is an acceptable substitution — but all subsequent instructions assume client components. |
| Language | **TypeScript** (strict mode) | `strict: true` in `tsconfig.json`. No implicit `any`. |
| Styling | **Tailwind CSS** | Utility-first, supports dark mode via `class` strategy (§6.6). |
| Routing | **React Router v6** (`react-router-dom`) | Needed for URL state sync (§6.4) and back/forward support. |
| Data fetching & caching | **TanStack Query (react-query) v5** | Handles caching, retries, background refetch, loading/error states. Do not hand-roll fetch/caching logic. |
| Virtualization | **`react-window`** (+ `react-window-infinite-loader`) | Chosen over `react-virtualized` for smaller bundle size and simpler API. Must be used for the Mars Rover grid (§6.2) — not optional. |
| Global/UI state | **Zustand** | Theme, favorites, view preferences. Filter state itself lives in the URL (§6.4), not in Zustand. |
| Drag and drop | **`@dnd-kit/core`** | For favorites reordering (§6.5, nice-to-have). |
| Forms/filter controls | Native controlled components + `react-datepicker` (or equivalent) for date ranges | |
| Testing | **Vitest** + **React Testing Library** for unit/component; **Playwright** for E2E | |
| Linting/formatting | **ESLint** (`@typescript-eslint`) + **Prettier** | |
| Deployment | **Vercel** (primary) or Netlify | See §14. |

---

## 3. NASA API Reference

Base URL: `https://api.nasa.gov`

All endpoints require an `api_key` query parameter. Use `DEMO_KEY` only for local dev/fallback; it is rate-limited to **30 requests/hour and 50/day per IP** — this constraint directly informs the caching and rate-limit-handling requirements in §9.

### 3.1 APOD — `GET /planetary/apod`

| Param | Type | Notes |
|---|---|---|
| `date` | `YYYY-MM-DD` | Defaults to today if omitted. Valid range: `1995-06-16` to today. |
| `start_date` / `end_date` | `YYYY-MM-DD` | For range queries (returns array). |
| `count` | integer | Random count of images (mutually exclusive with date params). |
| `thumbs` | boolean | Return video thumbnail if `media_type` is video. |

Response fields: `date`, `explanation`, `hdurl`, `url`, `media_type`, `title`, `copyright?`.

### 3.2 Mars Rover Photos — `GET /mars-photos/api/v1/rovers/{rover}/photos`

`{rover}` ∈ `curiosity | opportunity | perseverance | spirit`

| Param | Type | Notes |
|---|---|---|
| `sol` | integer | Martian sol (day). Mutually exclusive with `earth_date`. |
| `earth_date` | `YYYY-MM-DD` | Alternative to `sol`. |
| `camera` | string | e.g. `fhaz`, `rhaz`, `mast`, `chemcam`, `mahli`, `mardi`, `navcam`, `pancam`, `minites`. Valid cameras differ per rover — see §3.2.1. |
| `page` | integer | 25 photos per page. **This is the pagination mechanism to drive infinite scroll (§6.1).** |

Also fetch `GET /mars-photos/api/v1/rovers/{rover}` to get each rover's `max_sol`, `max_date`, `status`, and **available cameras**, and use this to populate/validate the camera filter dropdown per rover (§6.3).

#### 3.2.1 Rover → Valid Cameras (hardcode as a lookup table; do not assume all cameras apply to all rovers)

- **Curiosity**: FHAZ, RHAZ, MAST, CHEMCAM, MAHLI, MARDI, NAVCAM
- **Opportunity / Spirit**: FHAZ, RHAZ, NAVCAM, PANCAM, MINITES
- **Perseverance**: EDL_RUCAM, EDL_RDCAM, EDL_DDCAM, NAVCAM_LEFT, NAVCAM_RIGHT, MCZ_RIGHT, MCZ_LEFT, FRONT_HAZCAM_LEFT_A, FRONT_HAZCAM_RIGHT_A, REAR_HAZCAM_LEFT, REAR_HAZCAM_RIGHT, SKYCAM, SHERLOC_WATSON

Response fields per photo: `id`, `sol`, `camera: { name, full_name }`, `img_src`, `earth_date`, `rover: { name, status }`.

### 3.3 Near Earth Objects (NeoWs) — `GET /neo/rest/v1/feed`

| Param | Type | Notes |
|---|---|---|
| `start_date` | `YYYY-MM-DD` | Required. |
| `end_date` | `YYYY-MM-DD` | Required. **Max span is 7 days per request** — the client must chunk larger ranges into sequential/parallel 7-day requests and merge results. |

Response shape: `near_earth_objects: { [date]: NeoObject[] }`. Relevant fields per object: `id`, `name`, `estimated_diameter.kilometers.{estimated_diameter_min,estimated_diameter_max}`, `is_potentially_hazardous_asteroid`, `close_approach_data[0].{close_approach_date, relative_velocity.kilometers_per_hour, miss_distance.kilometers}`.

**Client-side size filter**: since the API has no size query param, filtering by asteroid size (§6.3) must be done client-side after fetching, on `estimated_diameter.kilometers.estimated_diameter_max` (or min — use max, documented in a code comment).

---

## 4. Folder Structure

```
src/
├── api/
│   ├── client.ts              # fetch wrapper, base URL resolution, API key injection
│   ├── apod.ts                 # APOD endpoint functions + query key factory
│   ├── marsPhotos.ts            # Mars rover endpoint functions
│   ├── neo.ts                  # NEO endpoint functions + 7-day chunking logic
│   └── types.ts                # Shared response DTOs
├── features/
│   ├── apod/
│   │   ├── ApodPage.tsx
│   │   ├── ApodCard.tsx
│   │   └── useApod.ts          # react-query hooks
│   ├── mars-rover/
│   │   ├── MarsRoverPage.tsx
│   │   ├── RoverPhotoGrid.tsx  # virtualized grid (react-window)
│   │   ├── RoverFilters.tsx
│   │   └── useMarsPhotosInfinite.ts
│   ├── neo/
│   │   ├── NeoPage.tsx
│   │   ├── NeoList.tsx         # virtualized list
│   │   ├── NeoFilters.tsx
│   │   └── useNeo.ts
│   └── favorites/
│       ├── FavoritesPanel.tsx
│       └── useFavoritesStore.ts
├── components/
│   ├── ui/                     # buttons, inputs, skeletons, badges (design-system primitives)
│   ├── layout/                 # AppShell, NavBar, ThemeToggle
│   └── feedback/                # ErrorState, EmptyState, OfflineBanner, RateLimitBanner
├── hooks/
│   ├── useUrlFilters.ts        # generic URL <-> filter-state sync hook (§6.4)
│   └── useMediaQuery.ts
├── store/
│   └── themeStore.ts           # Zustand store for theme (§6.6)
├── lib/
│   ├── queryClient.ts
│   └── dateUtils.ts
├── routes/
│   └── router.tsx               # React Router route tree
├── App.tsx
└── main.tsx
```

---

## 5. Global Application Shell

- Persistent top navigation with links: **APOD**, **Mars Rovers**, **Near Earth Objects**, **Favorites**.
- Theme toggle (sun/moon icon) in the nav bar, always visible.
- Routes (React Router):
  - `/` → redirect to `/apod`
  - `/apod`
  - `/mars-rover`
  - `/neo`
  - `/favorites`
- Each route owns its own filter/query-param namespace so switching tabs doesn't clobber other tabs' state.

---

## 6. Feature Specifications

### 6.1 Mars Rover Gallery — Infinite Scroll

- Data source: `GET /mars-photos/api/v1/rovers/{rover}/photos`, paginated via `page` (25 items/page).
- Implement with **`useInfiniteQuery`** from TanStack Query:
  - `queryKey: ['marsPhotos', rover, sol|earthDate, camera, page]`
  - `getNextPageParam`: return `undefined` when a page returns `< 25` photos (signals last page); otherwise `page + 1`.
- Infinite scroll trigger must be driven by the **virtualization library's own "load more" callback** (`react-window-infinite-loader`'s `onItemsRendered` / `loadMoreItems`), **not** a naive `IntersectionObserver` on a sentinel div at the bottom of an unvirtualized list. This is the mechanism that must integrate with §6.2.
- While fetching the next page, render skeleton placeholder tiles in the last row(s) rather than a full-page spinner (§6.7).
- Deduplicate photo `id`s across pages defensively (NASA's API has occasionally returned overlapping results across pages).

### 6.2 Virtualized Rendering — Non-Negotiable Requirement

**Both** the Mars Rover photo grid and the NEO list must be virtualized. This must be demonstrably real, not decorative:

- Use `react-window`'s `FixedSizeGrid` (or `VariableSizeGrid` if tile sizes vary responsively) for the Mars Rover gallery — grid layout, not a single column list, since it's a photo gallery.
- Use `react-window`'s `FixedSizeList` for the NEO list.
- **Verification requirement (must hold true in the shipped app, and should be manually verified during development):**
  - Only DOM nodes for currently-visible rows/tiles (+ a small overscan buffer) exist in the DOM at any time — inspect via DevTools Elements panel with a dataset of 300+ items; node count should stay roughly constant while scrolling, not grow.
  - Scrolling through 300+ items maintains ~60fps with no jank (spot-check with the Performance panel or the React DevTools Profiler).
  - Grid column count recalculates responsively on container resize (use a `ResizeObserver`-based hook, e.g. wrap in `react-virtualized-auto-sizer`, which is compatible with `react-window`).
- Do not wrap virtualization in a way that renders all items into a scrollable `overflow` div "for simplicity" — this defeats the purpose and will be flagged in review.

### 6.3 Advanced Filtering

**Mars Rover filters:**
- Rover (single-select: Curiosity / Opportunity / Perseverance / Spirit)
- Date mode toggle: Sol (integer input, bounded by that rover's `max_sol`) **or** Earth date (date picker, bounded by that rover's `landing_date`–`max_date`)
- Camera (single or multi-select, options populated dynamically per §3.2.1 for the selected rover; reset selection if it becomes invalid after switching rovers)

**NEO filters:**
- Date range (start/end date pickers; UI should silently chunk into ≤7-day API calls per §3.3, transparent to the user)
- Estimated diameter range (min/max km, dual-handle slider or two numeric inputs) — applied client-side post-fetch
- Potentially-hazardous-only toggle (boolean)

**APOD filters:**
- Single date picker, or date range (renders a strip/grid of results if range)

### 6.4 URL State Synchronization — Detailed Spec

This is a core grading criterion. Implement a single reusable hook: `useUrlFilters<T>(schema, defaults)`.

**Requirements:**
1. Filter state is the **single source of truth is the URL** (`useSearchParams` from React Router) — component state is only a synchronized mirror, not the source of truth. Do not keep filters in `useState` and push to the URL as an afterthought; read from the URL on every render.
2. On initial mount, parse URL search params into typed filter state using a validation/coercion layer (e.g. `zod` schema per feature) — invalid/missing params fall back to documented defaults (e.g. `?rover=curiosity&sol=1000&camera=fhaz`).
3. Any filter change (dropdown, date picker, slider) calls `setSearchParams` with **replace: true** for continuous inputs (e.g. slider drag) to avoid flooding browser history, but **replace: false** (push) for discrete selections (e.g. picking a rover) so back/forward is meaningful.
4. Reserved query param naming convention per route, e.g.:
   - `/mars-rover?rover=curiosity&mode=sol&sol=1000&camera=fhaz,mast&page=3`
   - `/neo?start=2026-06-01&end=2026-06-10&minKm=0.1&maxKm=5&hazardousOnly=true`
   - `/apod?date=2026-05-14` or `/apod?start=2026-05-01&end=2026-05-14`
5. **Hard acceptance test**: apply a non-trivial combination of filters, hit browser refresh (F5) — the exact same filtered view must render, including scroll-restored-to-top infinite query state (page param determines how many pages are pre-fetched on load, see below). Then click a filter, then click the browser Back button — the previous filter state must restore, not just the URL bar.
6. For infinite-scroll pagination interacting with URL state: store the **highest page reached** in the URL (`page=3`) and on mount/refresh, prefetch pages `1..page` sequentially via `useInfiniteQuery`'s `initialPageParam` + a loop, so a refreshed deep-scrolled view restores its scroll depth rather than resetting to page 1. Document this trade-off in code comments (it costs N requests on refresh) — acceptable given NASA API constraints.
7. Debounce free-text/numeric filter inputs (e.g. size range typing) by 300–500ms before writing to the URL, to avoid a URL write (and thus a query re-fetch) per keystroke.

### 6.5 Favorites (Nice-to-have)

- Any APOD entry, rover photo, or NEO can be "favorited" (star icon on card/tile).
- Favorites stored in `localStorage` via a Zustand store with persistence middleware (`zustand/middleware persist`).
- `/favorites` route displays all favorites grouped by category, each group in its own drag-and-drop-reorderable list using `@dnd-kit/core` (`DndContext` + `SortableContext`). Reordering persists to `localStorage`.
- Favoriting must work even in direct-NASA-API mode (no backend) since it's a pure client-side concern.

### 6.6 Theme Persistence (Nice-to-have)

- Zustand store (`themeStore.ts`) with `theme: 'light' | 'dark' | 'system'`, persisted to `localStorage` (`persist` middleware).
- On app boot, before first paint if possible (inline script in `index.html`, or a `useEffect` guarded to avoid flash-of-wrong-theme), apply `class="dark"` to `<html>` based on stored preference or `prefers-color-scheme` if `system`.
- Tailwind config: `darkMode: 'class'`.

### 6.7 Skeleton Loading States (Nice-to-have, but treat as expected baseline quality)

- Every data-fetching surface must have a matching skeleton component (`components/ui/Skeleton*.tsx`) shown while `isLoading` (initial fetch) is true — not while `isFetching` for background refetches, which should instead show a subtle inline spinner/indicator so the UI doesn't jump.
- Mars Rover grid: skeleton tiles matching the grid's exact cell dimensions, so layout doesn't shift when real data arrives.
- NEO list: skeleton rows matching `FixedSizeList` row height.
- APOD: skeleton hero card (image block + text lines).

---

## 7. API Client Layer

`src/api/client.ts` responsibilities:

1. Resolve base mode: `const useBackend = Boolean(import.meta.env.VITE_API_BASE_URL)`.
2. Export a single `apiFetch<T>(path, params)` used by all feature API modules — never call `fetch` directly from feature code.
3. If `useBackend`, prefix requests with `VITE_API_BASE_URL` and omit the NASA `api_key` param (assume backend injects it).
4. Else, prefix with `https://api.nasa.gov` and append `api_key=${VITE_NASA_API_KEY || 'DEMO_KEY'}`.
5. Centralized error normalization: convert non-2xx responses and network failures into a typed `ApiError { status, message, code }` thrown object, so react-query's `error` state is consistently shaped across all features.
6. Centralized handling of NASA's `429 Too Many Requests` (DEMO_KEY exhaustion) → surface a distinguishable `ApiError.code = 'RATE_LIMITED'` so the UI can show the specific rate-limit banner (§9.4), not a generic error.

---

## 8. State Management Summary

| State | Owner | Persisted? |
|---|---|---|
| Filters (per route) | URL search params | Yes (via URL, shareable) |
| Server data / cache | TanStack Query | In-memory + optional `persistQueryClient` to `localStorage` for offline resilience (optional enhancement) |
| Theme | Zustand + localStorage | Yes |
| Favorites | Zustand + localStorage | Yes |
| Ephemeral UI (modal open, hover) | Local `useState` | No |

**Rule**: filter/search state never lives in Zustand or component state as the source of truth — it is always derived from the URL (§6.4).

---

## 9. Resilience: Empty, Error, and Slow-Network States

This is an explicit evaluation criterion — implement all of the following, not just the happy path.

### 9.1 Empty States
- Each feature has a dedicated `<EmptyState />` (in `components/feedback/`) shown when a successful response yields zero results (e.g. a rover/sol combo with no photos, or a NEO date range with no objects). Must include a human-readable explanation and a suggested action (e.g. "Try a different sol" / "Clear filters" button that resets URL params to defaults).
- Distinguish empty-because-no-data from empty-because-filtered-too-narrowly where feasible (e.g. show "no photos for this camera — try All Cameras" when a camera filter is active).

### 9.2 Error States
- Each feature has a dedicated `<ErrorState />` with: error message (map `ApiError.code` to friendly copy), a **Retry** button that calls react-query's `refetch()`, and — for `RATE_LIMITED` — a note that the demo API key is throttled and to try again shortly or configure a personal key.
- Errors during infinite-scroll "load more" (not the initial load) must not blow away already-rendered results — show an inline "failed to load more, retry" affordance at the bottom of the grid/list instead of replacing the whole view with `<ErrorState />`.
- Wrap each route in a React **Error Boundary** to catch render-time exceptions distinct from data-fetch errors.

### 9.3 Slow Network Handling
- Configure TanStack Query with sensible `staleTime` (e.g. 5 min for APOD/rover photos which don't change, shorter for NEO near "today") and `retry: 2` with exponential backoff for transient failures — but `retry: 0` for `4xx` errors (retrying won't help a bad request).
- Show skeletons (§6.7) rather than blank/white screens during any load state exceeding ~150–200ms (avoid skeleton flash on near-instant cache hits by only rendering skeleton after a short delay or relying on `isLoading` vs cached `isFetching`).
- Manually test and document (in this README's "Testing Notes" section once implemented) behavior under Chrome DevTools "Slow 3G" throttling for all three features.
- Add a lightweight global offline banner (`navigator.onLine` + `online`/`offline` event listeners) informing the user connectivity was lost, auto-dismissing on reconnect and triggering a refetch of active queries.

### 9.4 Rate Limit Handling (specific to direct-NASA-API / DEMO_KEY mode)
- Since `DEMO_KEY` allows only 30 req/hour, proactively show a **persistent, dismissible banner** when in direct-API mode without a configured personal `VITE_NASA_API_KEY`, explaining the limit.
- On receiving a `429`, surface the `RATE_LIMITED` error state (§9.2) globally (e.g. via a toast) in addition to the local error state, since it affects all in-flight and subsequent requests app-wide.

---

## 10. Accessibility

- All interactive elements (filters, buttons, cards, drag handles) keyboard-navigable and screen-reader labeled (`aria-label`, `role`).
- Virtualized grids/lists: ensure `react-window` container has `role="grid"`/`role="list"` and rendered cells have appropriate `role="gridcell"`/`role="listitem"`, since virtualization can otherwise break AT semantics.
- Color contrast compliant with WCAG AA in both light and dark themes.
- Respect `prefers-reduced-motion` for drag-and-drop and transition animations.

---

## 11. Environment Variables

Create `.env.example`:

```
# If set, the app calls this backend instead of NASA's API directly.
VITE_API_BASE_URL=

# Used only when VITE_API_BASE_URL is unset (direct-to-NASA mode).
# Get a free key at https://api.nasa.gov — falls back to DEMO_KEY (heavily rate-limited) if unset.
VITE_NASA_API_KEY=
```

---

## 12. Testing Strategy

- **Unit tests**: `useUrlFilters` hook (param parsing, defaulting, malformed input handling), API client error normalization, NEO 7-day chunking logic, camera-validity-per-rover lookup.
- **Component tests**: `EmptyState`, `ErrorState`, skeleton components render correctly given mocked query states (use `@tanstack/react-query`'s test utilities to seed loading/error/success states directly, do not mock `fetch` per test where avoidable).
- **E2E (Playwright)**:
  1. Apply Mars Rover filters (rover + camera + sol) → assert URL reflects state → reload page → assert same filtered results render.
  2. Scroll Mars Rover grid past 100+ items → assert DOM node count for photo tiles stays bounded (query `document.querySelectorAll` count before/after scroll).
  3. Simulate offline (Playwright's `context.setOffline(true)`) mid-session → assert offline banner appears; restore online → assert banner clears and data refetches.
  4. Mock a `429` response → assert rate-limit error state renders with Retry.
  5. Apply NEO date range > 7 days → assert requests are chunked (intercept network calls, assert each chunk ≤ 7-day span) and results are merged correctly.

---

## 13. Performance Budget

- Initial JS bundle (gzipped) target: **< 250KB** for the main chunk; route-level code-splitting via `React.lazy` for each feature page.
- Lighthouse Performance score target: **≥ 85** on the deployed production build (mobile throttled profile).
- No layout shift (CLS) from image loading in the Mars Rover grid — reserve aspect-ratio space for tiles before the image loads (use `aspect-ratio` CSS or fixed tile dimensions dictated by the virtualization grid's `columnWidth`/`rowHeight`).

---

## 14. Deployment

- Target: **Vercel** (recommended for Vite SPA — configure `vercel.json` with a rewrite/fallback to `index.html` for client-side routing so refreshing on `/mars-rover?...` doesn't 404).
- Set `VITE_NASA_API_KEY` (and `VITE_API_BASE_URL` if a backend exists) as Vercel project environment variables — never commit real API keys.
- Deliverables checklist for submission:
  - [ ] Live deployed URL (Vercel/Netlify)
  - [ ] Public GitHub repo link
  - [ ] This README, kept accurate to the final implementation
  - [ ] `.env.example` committed (no real secrets)

---

## 15. Getting Started (for the implementing engineer/agent)

```bash
npm create vite@latest mission-control-dashboard -- --template react-ts
cd mission-control-dashboard
npm install react-router-dom @tanstack/react-query react-window react-window-infinite-loader react-virtualized-auto-sizer zustand @dnd-kit/core zod react-datepicker
npm install -D tailwindcss postcss autoprefixer vitest @testing-library/react @testing-library/jest-dom @playwright/test
npx tailwindcss init -p
cp .env.example .env.local   # then fill in VITE_NASA_API_KEY
npm run dev
```

Implementation order (recommended, to keep the app demoable at every step):

1. App shell, routing, theme store (§5, §6.6).
2. API client layer + typed API modules for all three NASA endpoints (§7, §3).
3. APOD page (simplest feature) end-to-end including loading/error/empty states — validates the whole plumbing.
4. Mars Rover filters + infinite query (non-virtualized list first) — validates data/filter logic.
5. Swap the Mars Rover list for the `react-window` virtualized grid + infinite loader integration (§6.1, §6.2) — the highest-risk piece; validate with 300+ item datasets early.
6. URL state sync hook (§6.4), retrofit into APOD and Mars Rover filters, then build NEO page using it from the start.
7. NEO page + client-side size filtering + 7-day chunking (§3.3, §6.3).
8. Resilience pass: empty/error/offline/rate-limit states across all three features (§9).
9. Skeletons (§6.7), then Favorites (§6.5) and drag-and-drop, last.
10. Accessibility pass, performance pass, tests, deploy.

---

## 16. Definition of Done

- [ ] All three data views (APOD, Mars Rover, NEO) functional against live NASA API with no backend present.
- [ ] Mars Rover gallery virtualized with verified bounded DOM node count under scroll with 300+ results.
- [ ] Infinite scroll loads additional pages seamlessly, integrated with the virtualization library's own load-more mechanism.
- [ ] All filters (date, rover, camera, asteroid size) synchronized to the URL; refresh and back/forward both preserve state correctly.
- [ ] Empty, error, offline, and rate-limited states implemented and manually verified for every feature — not just the happy path.
- [ ] Deployed live and publicly accessible; repo public with this README accurate to the shipped app.
