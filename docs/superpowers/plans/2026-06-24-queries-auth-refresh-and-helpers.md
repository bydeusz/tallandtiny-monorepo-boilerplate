# @repo/queries — Auth Refresh + Response Helpers Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extend the shared `@repo/queries` package with an in-memory access-token store, a pluggable 401→refresh axios interceptor, envelope unwrapping that preserves pagination `meta`, and typed response helpers — so all apps share one correct, self-refreshing data layer.

**Architecture:** `@repo/queries` is a source-only workspace package (`"type": "module"`, consumed directly by Next apps via `exports."."` → `./src/index.ts`; no build step). We refactor the existing axios mutator (`src/mutator/custom-axios.ts`) into focused modules: a token store, a pure envelope-unwrap function, and the configured axios instance with request (attach Bearer) + response (401→refresh→retry) interceptors. Response helpers become thin typed accessors over the now-honest generated types. This is Plan 1 of 5 for the dashboard boilerplate port; later plans (`@repo/auth`, `apps/dashboard`) consume the interfaces produced here.

**Tech Stack:** TypeScript (ESM), axios, `@tanstack/react-query` (peer), orval-generated client, vitest (new, for unit tests).

## Global Constraints

- Node `>=22.12`; package manager `pnpm@10.28.2`. Run package-scoped commands with `pnpm --filter @repo/queries <script>`.
- `@repo/queries` is `"type": "module"` and consumed as **source** (no build). The quality gates are `check-types` (tsc) and `test` (vitest). Test files live at `src/**/*.test.ts` and are type-checked by `tsc`, so import test APIs explicitly (`import { describe, it, expect } from 'vitest'`) — do **not** rely on vitest globals.
- The mutator must stay **framework-agnostic**: no React/Next imports in `src/mutator/*`. Browser-only behaviour (redirect) must be guarded by `typeof window !== 'undefined'`.
- Preserve backward compatibility: keep the existing `setAuthTokenGetter` export working.
- The NestJS API wraps every non-`@SkipTransform` response as `{ success, statusCode, data, meta, requestId, timestamp, path }`, where `meta` is `null` for single resources and a `PaginationMetaDto` object for paginated lists (`meta` is a **sibling** of `data`, not nested).
- Generated types are authoritative: `OrganisationMemberList200 = { meta: PaginationMetaDto; data?: OrganisationMemberResponseDto[] }`; `OrganisationList200 = { meta: PaginationMetaDto; data?: OrganisationResponseDto[] }`; `AuthTokensResponseDto = { access_token: string; refresh_token: string }`.
- Commit after every task. Commit scope: `(queries)`.

## File Structure

- `packages/queries/vitest.config.ts` *(create)* — vitest config (node env, `src/**/*.test.ts`).
- `packages/queries/package.json` *(modify)* — add `vitest` devDep + `test` script.
- `packages/queries/src/mutator/auth-token-store.ts` *(create)* — in-memory access token store.
- `packages/queries/src/mutator/auth-token-store.test.ts` *(create)* — store tests.
- `packages/queries/src/mutator/envelope.ts` *(create)* — pure `unwrapEnvelope<T>(body)` (preserves `meta`).
- `packages/queries/src/mutator/envelope.test.ts` *(create)* — unwrap tests.
- `packages/queries/src/mutator/custom-axios.ts` *(modify)* — use token store + envelope; add refresh config, single-flight `refreshAccessToken`, request/response interceptors.
- `packages/queries/src/mutator/custom-axios.test.ts` *(create)* — `refreshAccessToken` tests with a fake `fetch`.
- `packages/queries/src/helpers/api-error.ts` *(create)* — `extractErrorMessage(err)`.
- `packages/queries/src/helpers/member-response.ts` *(create)* — `extractMemberList` / `extractMemberListMeta`.
- `packages/queries/src/helpers/organisation-response.ts` *(create)* — `extractOrganisationList`.
- `packages/queries/src/helpers/*.test.ts` *(create)* — helper tests.
- `packages/queries/src/index.ts` *(modify)* — export new token/refresh API + helpers.

---

### Task 1: Test runner + access-token store

**Files:**
- Modify: `packages/queries/package.json`
- Create: `packages/queries/vitest.config.ts`
- Create: `packages/queries/src/mutator/auth-token-store.ts`
- Test: `packages/queries/src/mutator/auth-token-store.test.ts`

**Interfaces:**
- Consumes: nothing (first task).
- Produces: `getAccessToken(): string | null`, `setAccessToken(token: string | null): void`, `clearAccessToken(): void` from `src/mutator/auth-token-store.ts`.

- [ ] **Step 1: Install vitest**

Run:
```bash
pnpm --filter @repo/queries add -D vitest
```
Expected: `vitest` added to `packages/queries/package.json` devDependencies; lockfile updates.

- [ ] **Step 2: Add the `test` script**

Modify `packages/queries/package.json` `scripts` to add:
```json
"test": "vitest run"
```
(Keep existing `gen:queries` and `check-types`.)

- [ ] **Step 3: Create vitest config**

Create `packages/queries/vitest.config.ts`:
```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
```

- [ ] **Step 4: Write the failing test**

Create `packages/queries/src/mutator/auth-token-store.test.ts`:
```ts
import { describe, it, expect, beforeEach } from 'vitest';
import {
  getAccessToken,
  setAccessToken,
  clearAccessToken,
} from './auth-token-store';

describe('auth-token-store', () => {
  beforeEach(() => clearAccessToken());

  it('returns null when no token is set', () => {
    expect(getAccessToken()).toBeNull();
  });

  it('stores and returns the access token', () => {
    setAccessToken('token-abc');
    expect(getAccessToken()).toBe('token-abc');
  });

  it('clears the stored token', () => {
    setAccessToken('token-abc');
    clearAccessToken();
    expect(getAccessToken()).toBeNull();
  });

  it('setAccessToken(null) clears the token', () => {
    setAccessToken('token-abc');
    setAccessToken(null);
    expect(getAccessToken()).toBeNull();
  });
});
```

- [ ] **Step 5: Run test to verify it fails**

Run: `pnpm --filter @repo/queries test`
Expected: FAIL — cannot resolve `./auth-token-store` (module not found).

- [ ] **Step 6: Implement the token store**

Create `packages/queries/src/mutator/auth-token-store.ts`:
```ts
// In-memory access-token store. Framework-agnostic: the access token lives
// only in module memory (never localStorage). Apps set it after login/refresh;
// the axios request interceptor reads it to attach the Bearer header.
let accessToken: string | null = null;

export function getAccessToken(): string | null {
  return accessToken;
}

export function setAccessToken(token: string | null): void {
  accessToken = token;
}

export function clearAccessToken(): void {
  accessToken = null;
}
```

- [ ] **Step 7: Run test to verify it passes**

Run: `pnpm --filter @repo/queries test`
Expected: PASS — 4 passed.

- [ ] **Step 8: Commit**

```bash
git add packages/queries/package.json packages/queries/pnpm-lock.yaml packages/queries/vitest.config.ts packages/queries/src/mutator/auth-token-store.ts packages/queries/src/mutator/auth-token-store.test.ts pnpm-lock.yaml
git commit -m "feat(queries): in-memory access-token store + vitest runner"
```
(The lockfile is at the repo root; `packages/queries/pnpm-lock.yaml` will not exist — that path is harmless if absent. If `git add` errors on a missing path, drop it.)

---

### Task 2: Envelope unwrap that preserves pagination meta

**Files:**
- Create: `packages/queries/src/mutator/envelope.ts`
- Test: `packages/queries/src/mutator/envelope.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: `unwrapEnvelope<T>(body: unknown): T` from `src/mutator/envelope.ts`. Behaviour: if `body` has both `success` and `data` keys → when `meta` is a non-null object return `{ data, meta }` (matches the generated `*List200` types), otherwise return `body.data`; for any other shape (e.g. `@SkipTransform` health payloads) return `body` unchanged.

- [ ] **Step 1: Write the failing test**

Create `packages/queries/src/mutator/envelope.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { unwrapEnvelope } from './envelope';

describe('unwrapEnvelope', () => {
  it('returns body.data for a single-resource envelope (meta null)', () => {
    const body = {
      success: true,
      statusCode: 200,
      data: { id: 'org-1', name: 'Acme' },
      meta: null,
    };
    expect(unwrapEnvelope(body)).toEqual({ id: 'org-1', name: 'Acme' });
  });

  it('returns { data, meta } for a paginated envelope (meta object)', () => {
    const body = {
      success: true,
      statusCode: 200,
      data: [{ id: 'm-1' }],
      meta: { page: 1, limit: 10, total: 1, totalPages: 1, hasNextPage: false, hasPreviousPage: false },
    };
    expect(unwrapEnvelope(body)).toEqual({
      data: [{ id: 'm-1' }],
      meta: { page: 1, limit: 10, total: 1, totalPages: 1, hasNextPage: false, hasPreviousPage: false },
    });
  });

  it('returns the body unchanged when there is no envelope (skip-transform)', () => {
    const body = { status: 'ok', info: {} };
    expect(unwrapEnvelope(body)).toEqual({ status: 'ok', info: {} });
  });

  it('returns body.data when the envelope has no meta key at all', () => {
    const body = { success: true, data: { id: 'u-1' } };
    expect(unwrapEnvelope(body)).toEqual({ id: 'u-1' });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @repo/queries test envelope`
Expected: FAIL — cannot resolve `./envelope`.

- [ ] **Step 3: Implement the unwrap function**

Create `packages/queries/src/mutator/envelope.ts`:
```ts
// The API wraps every transformed response as
// { success, statusCode, data, meta, requestId, timestamp, path }.
// `meta` is a sibling of `data`: null for single resources, a pagination
// object for lists. The generated `*List200` types are `{ meta, data }`,
// so for paginated responses we must return BOTH (not just `data`) to keep
// pagination meta available and the generated types honest.
export function unwrapEnvelope<T>(body: unknown): T {
  if (body && typeof body === 'object' && 'success' in body && 'data' in body) {
    const envelope = body as { data: unknown; meta?: unknown };
    if (envelope.meta !== null && envelope.meta !== undefined) {
      return { data: envelope.data, meta: envelope.meta } as T;
    }
    return envelope.data as T;
  }
  return body as T;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @repo/queries test envelope`
Expected: PASS — 4 passed.

- [ ] **Step 5: Commit**

```bash
git add packages/queries/src/mutator/envelope.ts packages/queries/src/mutator/envelope.test.ts
git commit -m "feat(queries): envelope unwrap preserving pagination meta"
```

---

### Task 3: Refactor mutator — token store, single-flight refresh, 401 retry

**Files:**
- Modify: `packages/queries/src/mutator/custom-axios.ts`
- Test: `packages/queries/src/mutator/custom-axios.test.ts`

**Interfaces:**
- Consumes: `getAccessToken`, `setAccessToken`, `clearAccessToken` (Task 1); `unwrapEnvelope` (Task 2).
- Produces (from `src/mutator/custom-axios.ts`):
  - `AXIOS_INSTANCE` (unchanged export).
  - `customAxios<T>(config, options?): Promise<T>` (unchanged signature; now unwraps via `unwrapEnvelope`).
  - `setAuthTokenGetter(getter: () => string | null | undefined): void` (back-compat).
  - `configureAuthRefresh(config: Partial<{ endpoint: string; onUnauthorized: () => void }>): void` — override the refresh endpoint (default `/api/auth/refresh`) and the unauthorized handler (default: `window.location.href = '/login'` in the browser).
  - `refreshAccessToken(fetchImpl?: typeof fetch): Promise<string | null>` — single-flight POST to the refresh endpoint with `credentials: 'include'`; on success stores + returns the new access token, else returns `null`.
  - `type ErrorType<Error>`, `type BodyType<BodyData>` (unchanged).

- [ ] **Step 1: Write the failing test**

Create `packages/queries/src/mutator/custom-axios.test.ts`:
```ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { refreshAccessToken, configureAuthRefresh } from './custom-axios';
import { getAccessToken, clearAccessToken } from './auth-token-store';

function jsonResponse(ok: boolean, body: unknown): Response {
  return {
    ok,
    json: async () => body,
  } as unknown as Response;
}

describe('refreshAccessToken', () => {
  beforeEach(() => {
    clearAccessToken();
    configureAuthRefresh({ endpoint: '/api/auth/refresh', onUnauthorized: () => {} });
  });

  it('stores and returns the new access token on success', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      jsonResponse(true, { access_token: 'new-token' }),
    );
    const token = await refreshAccessToken(fetchImpl as unknown as typeof fetch);
    expect(token).toBe('new-token');
    expect(getAccessToken()).toBe('new-token');
    expect(fetchImpl).toHaveBeenCalledWith(
      '/api/auth/refresh',
      expect.objectContaining({ method: 'POST', credentials: 'include' }),
    );
  });

  it('returns null and does not store a token when the response is not ok', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse(false, { message: 'nope' }));
    const token = await refreshAccessToken(fetchImpl as unknown as typeof fetch);
    expect(token).toBeNull();
    expect(getAccessToken()).toBeNull();
  });

  it('returns null when the success body has no access_token', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse(true, {}));
    const token = await refreshAccessToken(fetchImpl as unknown as typeof fetch);
    expect(token).toBeNull();
  });

  it('coalesces concurrent calls into a single fetch (single-flight)', async () => {
    let resolveFetch: (r: Response) => void = () => {};
    const fetchImpl = vi.fn().mockImplementation(
      () => new Promise<Response>((resolve) => { resolveFetch = resolve; }),
    );
    const p1 = refreshAccessToken(fetchImpl as unknown as typeof fetch);
    const p2 = refreshAccessToken(fetchImpl as unknown as typeof fetch);
    resolveFetch(jsonResponse(true, { access_token: 'shared' }));
    const [t1, t2] = await Promise.all([p1, p2]);
    expect(t1).toBe('shared');
    expect(t2).toBe('shared');
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @repo/queries test custom-axios`
Expected: FAIL — `refreshAccessToken` / `configureAuthRefresh` are not exported.

- [ ] **Step 3: Rewrite the mutator**

Replace the entire contents of `packages/queries/src/mutator/custom-axios.ts` with:
```ts
import Axios, {
  type AxiosError,
  type AxiosRequestConfig,
  type AxiosResponse,
  type InternalAxiosRequestConfig,
} from 'axios';
import {
  getAccessToken,
  setAccessToken,
  clearAccessToken,
} from './auth-token-store';
import { unwrapEnvelope } from './envelope';

export const AXIOS_INSTANCE = Axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001',
});

// Back-compat secondary token source (used if the in-memory store is empty).
let authTokenGetter: () => string | null | undefined = () => undefined;
export const setAuthTokenGetter = (
  getter: () => string | null | undefined,
): void => {
  authTokenGetter = getter;
};

// --- refresh configuration -------------------------------------------------
type RefreshConfig = {
  endpoint: string;
  onUnauthorized: () => void;
};

const refreshConfig: RefreshConfig = {
  endpoint: '/api/auth/refresh',
  onUnauthorized: () => {
    if (typeof window !== 'undefined') {
      window.location.href = '/login';
    }
  },
};

export const configureAuthRefresh = (
  config: Partial<RefreshConfig>,
): void => {
  Object.assign(refreshConfig, config);
};

// Single-flight refresh: concurrent 401s share one network round-trip.
let refreshPromise: Promise<string | null> | null = null;

export async function refreshAccessToken(
  fetchImpl: typeof fetch = fetch,
): Promise<string | null> {
  if (!refreshPromise) {
    refreshPromise = (async () => {
      try {
        const response = await fetchImpl(refreshConfig.endpoint, {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
        });
        if (!response.ok) {
          return null;
        }
        const data = (await response.json()) as { access_token?: string };
        if (!data.access_token) {
          return null;
        }
        setAccessToken(data.access_token);
        return data.access_token;
      } catch {
        return null;
      } finally {
        refreshPromise = null;
      }
    })();
  }
  return refreshPromise;
}

// --- interceptors ----------------------------------------------------------
AXIOS_INSTANCE.interceptors.request.use((config) => {
  const token = getAccessToken() ?? authTokenGetter();
  if (token) {
    config.headers = config.headers ?? {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

type RetriableRequestConfig = InternalAxiosRequestConfig & {
  _retry?: boolean;
};

AXIOS_INSTANCE.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as RetriableRequestConfig | undefined;
    const status = error.response?.status;

    if (!originalRequest || status !== 401 || originalRequest._retry) {
      return Promise.reject(error);
    }

    originalRequest._retry = true;
    const token = await refreshAccessToken();

    if (!token) {
      clearAccessToken();
      refreshConfig.onUnauthorized();
      return Promise.reject(error);
    }

    originalRequest.headers = originalRequest.headers ?? {};
    originalRequest.headers.Authorization = `Bearer ${token}`;
    return AXIOS_INSTANCE(originalRequest);
  },
);

// --- request helper --------------------------------------------------------
// Unwraps the API envelope (preserving pagination meta) so the generated
// hooks return the typed payload directly. Raw (skip-transform) responses
// pass through untouched.
export const customAxios = <T>(
  config: AxiosRequestConfig,
  options?: AxiosRequestConfig,
): Promise<T> => {
  const source = Axios.CancelToken.source();
  const promise = AXIOS_INSTANCE({
    ...config,
    ...options,
    cancelToken: source.token,
  }).then((response: AxiosResponse) => unwrapEnvelope<T>(response.data));

  // @ts-expect-error allow react-query to cancel the request
  promise.cancel = () => {
    source.cancel('Query was cancelled');
  };

  return promise;
};

export type ErrorType<Error> = AxiosError<Error>;
export type BodyType<BodyData> = BodyData;
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @repo/queries test custom-axios`
Expected: PASS — 4 passed.

- [ ] **Step 5: Run the full package test + type-check**

Run: `pnpm --filter @repo/queries test && pnpm --filter @repo/queries check-types`
Expected: all tests pass; `tsc --noEmit` reports no errors.

- [ ] **Step 6: Commit**

```bash
git add packages/queries/src/mutator/custom-axios.ts packages/queries/src/mutator/custom-axios.test.ts
git commit -m "feat(queries): pluggable 401->refresh interceptor with single-flight refresh"
```

---

### Task 4: Typed response helpers

**Files:**
- Create: `packages/queries/src/helpers/api-error.ts`
- Create: `packages/queries/src/helpers/member-response.ts`
- Create: `packages/queries/src/helpers/organisation-response.ts`
- Test: `packages/queries/src/helpers/api-error.test.ts`
- Test: `packages/queries/src/helpers/member-response.test.ts`
- Test: `packages/queries/src/helpers/organisation-response.test.ts`

**Interfaces:**
- Consumes: generated types from `../generated/model` (`OrganisationMemberList200`, `OrganisationMemberResponseDto`, `PaginationMetaDto`, `OrganisationList200`, `OrganisationResponseDto`).
- Produces:
  - `extractErrorMessage(err: unknown): string | null` (`api-error.ts`).
  - `extractMemberList(payload: OrganisationMemberList200 | undefined): OrganisationMemberResponseDto[]` and `extractMemberListMeta(payload: OrganisationMemberList200 | undefined): PaginationMetaDto | null` (`member-response.ts`).
  - `extractOrganisationList(payload: OrganisationList200 | undefined): OrganisationResponseDto[]` (`organisation-response.ts`).

> Note: because `customAxios` now returns the unwrapped `{ meta, data }` for list endpoints (Task 2/3), these helpers operate on the **already-unwrapped** generated types — no double-nesting. Single-resource fetches (`organisationGet`, invite/update member mutations) return their DTO directly, so they need no helper.

- [ ] **Step 1: Write the failing tests**

Create `packages/queries/src/helpers/api-error.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { extractErrorMessage } from './api-error';

describe('extractErrorMessage', () => {
  it('reads a string message from an axios error envelope', () => {
    const err = { response: { data: { message: 'Invalid credentials' } } };
    expect(extractErrorMessage(err)).toBe('Invalid credentials');
  });

  it('joins an array message', () => {
    const err = { response: { data: { message: ['a', 'b'] } } };
    expect(extractErrorMessage(err)).toBe('a, b');
  });

  it('falls back to Error.message', () => {
    expect(extractErrorMessage(new Error('boom'))).toBe('boom');
  });

  it('returns null when nothing usable is present', () => {
    expect(extractErrorMessage({})).toBeNull();
  });
});
```

Create `packages/queries/src/helpers/member-response.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { extractMemberList, extractMemberListMeta } from './member-response';

const meta = {
  page: 1, limit: 10, total: 1, totalPages: 1,
  hasNextPage: false, hasPreviousPage: false,
};

describe('member-response helpers', () => {
  it('extracts the member array', () => {
    const payload = { meta, data: [{ id: 'm-1' }] } as never;
    expect(extractMemberList(payload)).toEqual([{ id: 'm-1' }]);
  });

  it('returns [] when data is missing', () => {
    const payload = { meta } as never;
    expect(extractMemberList(payload)).toEqual([]);
  });

  it('returns [] for undefined payload', () => {
    expect(extractMemberList(undefined)).toEqual([]);
  });

  it('extracts pagination meta', () => {
    const payload = { meta, data: [] } as never;
    expect(extractMemberListMeta(payload)).toEqual(meta);
  });

  it('returns null meta for undefined payload', () => {
    expect(extractMemberListMeta(undefined)).toBeNull();
  });
});
```

Create `packages/queries/src/helpers/organisation-response.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { extractOrganisationList } from './organisation-response';

const meta = {
  page: 1, limit: 10, total: 1, totalPages: 1,
  hasNextPage: false, hasPreviousPage: false,
};

describe('organisation-response helpers', () => {
  it('extracts the organisation array', () => {
    const payload = { meta, data: [{ id: 'org-1', name: 'Acme' }] } as never;
    expect(extractOrganisationList(payload)).toEqual([{ id: 'org-1', name: 'Acme' }]);
  });

  it('returns [] when data is missing', () => {
    expect(extractOrganisationList({ meta } as never)).toEqual([]);
  });

  it('returns [] for undefined payload', () => {
    expect(extractOrganisationList(undefined)).toEqual([]);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm --filter @repo/queries test helpers`
Expected: FAIL — cannot resolve `./api-error`, `./member-response`, `./organisation-response`.

- [ ] **Step 3: Implement the helpers**

Create `packages/queries/src/helpers/api-error.ts`:
```ts
/**
 * Pulls a human-readable message out of an Axios/Nest error envelope.
 * Returns null if no usable string can be derived; callers should fall back
 * to a context-specific default.
 */
export function extractErrorMessage(err: unknown): string | null {
  if (
    err &&
    typeof err === 'object' &&
    'response' in err &&
    typeof err.response === 'object' &&
    err.response &&
    'data' in err.response &&
    typeof err.response.data === 'object' &&
    err.response.data &&
    'message' in err.response.data
  ) {
    const message = (err.response.data as { message: unknown }).message;
    if (typeof message === 'string') return message;
    if (Array.isArray(message)) return message.join(', ');
  }
  if (err instanceof Error) return err.message;
  return null;
}
```

Create `packages/queries/src/helpers/member-response.ts`:
```ts
import type {
  OrganisationMemberList200,
  OrganisationMemberResponseDto,
  PaginationMetaDto,
} from '../generated/model';

/** List payload from `organisationMemberList` / `useOrganisationMemberList`. */
export function extractMemberList(
  payload: OrganisationMemberList200 | undefined,
): OrganisationMemberResponseDto[] {
  return payload?.data ?? [];
}

/** Pagination meta from the same response. */
export function extractMemberListMeta(
  payload: OrganisationMemberList200 | undefined,
): PaginationMetaDto | null {
  return payload?.meta ?? null;
}
```

Create `packages/queries/src/helpers/organisation-response.ts`:
```ts
import type {
  OrganisationList200,
  OrganisationResponseDto,
} from '../generated/model';

/** List payload from `organisationList` / `useOrganisationList`. */
export function extractOrganisationList(
  payload: OrganisationList200 | undefined,
): OrganisationResponseDto[] {
  return payload?.data ?? [];
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm --filter @repo/queries test helpers`
Expected: PASS — all helper tests pass.

- [ ] **Step 5: Commit**

```bash
git add packages/queries/src/helpers/
git commit -m "feat(queries): typed response helpers (api-error, member, organisation)"
```

---

### Task 5: Export the public API and verify the package

**Files:**
- Modify: `packages/queries/src/index.ts`

**Interfaces:**
- Consumes: all exports from Tasks 1–4.
- Produces: the package's public surface — generated endpoints/models (unchanged) plus `setAuthTokenGetter`, `setAccessToken`, `getAccessToken`, `clearAccessToken`, `configureAuthRefresh`, `refreshAccessToken`, `extractErrorMessage`, `extractMemberList`, `extractMemberListMeta`, `extractOrganisationList`.

- [ ] **Step 1: Update the barrel export**

Replace the contents of `packages/queries/src/index.ts` with:
```ts
export * from './generated/endpoints/auth/auth';
export * from './generated/endpoints/files/files';
export * from './generated/endpoints/health/health';
export * from './generated/endpoints/mail/mail';
export * from './generated/endpoints/organisations/organisations';
export * from './generated/endpoints/users/users';
export * from './generated/model';

export {
  setAuthTokenGetter,
  configureAuthRefresh,
  refreshAccessToken,
} from './mutator/custom-axios';
export {
  getAccessToken,
  setAccessToken,
  clearAccessToken,
} from './mutator/auth-token-store';

export * from './helpers/api-error';
export * from './helpers/member-response';
export * from './helpers/organisation-response';
```

- [ ] **Step 2: Type-check the whole package**

Run: `pnpm --filter @repo/queries check-types`
Expected: PASS — no `tsc` errors.

- [ ] **Step 3: Run the full test suite**

Run: `pnpm --filter @repo/queries test`
Expected: PASS — all suites (auth-token-store, envelope, custom-axios, helpers) pass.

- [ ] **Step 4: Verify nothing downstream broke**

Run: `pnpm --filter web check-types && pnpm --filter dashboard check-types`
Expected: PASS — existing consumers still type-check (no consumer relied on the old list-without-meta runtime shape).

- [ ] **Step 5: Commit**

```bash
git add packages/queries/src/index.ts
git commit -m "feat(queries): export token/refresh API and response helpers"
```

---

## Self-Review

**Spec coverage (this plan's slice of the spec):**
- "Extend mutator: pluggable 401→refresh interceptor + token store, refresh endpoint configurable (default `/api/auth/refresh`), token setter injected at startup." → Tasks 1, 3 (`configureAuthRefresh`, `refreshAccessToken`, `setAccessToken`, `setAuthTokenGetter`). ✓
- "Helpers: api-error, member-response, organisation-response." → Task 4. ✓
- Discovered refinement (envelope drops pagination meta; generated list types are dishonest) → Task 2 fix, consumed by Task 4 helpers. ✓
- Unit tests for response unwrap, 401-refresh-retry, helpers (spec build-order step 1) → Tasks 2, 3, 4. ✓

**Placeholder scan:** No TBD/TODO; every code step shows full file/replacement content. ✓

**Type consistency:** `getAccessToken/setAccessToken/clearAccessToken` (store) used identically in Task 3 and re-exported in Task 5. `refreshAccessToken(fetchImpl?)` / `configureAuthRefresh(Partial<RefreshConfig>)` signatures match across Task 3 definition, Task 3 tests, and Task 5 exports. Helper signatures match generated types (`OrganisationMemberList200 = { meta; data? }`). ✓

**Out-of-plan note:** the response interceptor's full 401→retry path (axios round-trip) is covered by integration/run verification in the `apps/dashboard` plan (Plan 5), not unit-tested here; the unit tests target the single-flight `refreshAccessToken` and the pure unwrap, which carry the logic risk.
