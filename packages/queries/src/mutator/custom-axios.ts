import Axios, {
  type AxiosError,
  type AxiosRequestConfig,
  type AxiosResponse,
} from 'axios';

export const AXIOS_INSTANCE = Axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001',
});

// Pluggable bearer-token source. A frontend registers its token getter once
// (e.g. from its auth store); defaults to no token.
let authTokenGetter: () => string | null | undefined = () => undefined;
export const setAuthTokenGetter = (
  getter: () => string | null | undefined,
): void => {
  authTokenGetter = getter;
};

AXIOS_INSTANCE.interceptors.request.use((config) => {
  const token = authTokenGetter();
  if (token) {
    config.headers = config.headers ?? {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// The API wraps every successful response in
// { success, statusCode, data, meta, ... }. Unwrap to the typed payload so the
// generated hooks return `data` directly. Raw responses (e.g. @SkipTransform
// health) pass through untouched.
export const customAxios = <T>(
  config: AxiosRequestConfig,
  options?: AxiosRequestConfig,
): Promise<T> => {
  const source = Axios.CancelToken.source();
  const promise = AXIOS_INSTANCE({
    ...config,
    ...options,
    cancelToken: source.token,
  }).then((response: AxiosResponse) => {
    const body = response.data;
    return (
      body && typeof body === 'object' && 'success' in body && 'data' in body
        ? body.data
        : body
    ) as T;
  });

  // @ts-expect-error allow react-query to cancel the request
  promise.cancel = () => {
    source.cancel('Query was cancelled');
  };

  return promise;
};

export type ErrorType<Error> = AxiosError<Error>;
export type BodyType<BodyData> = BodyData;
