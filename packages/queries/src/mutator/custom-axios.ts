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
