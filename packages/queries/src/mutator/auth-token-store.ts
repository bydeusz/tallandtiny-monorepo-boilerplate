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
