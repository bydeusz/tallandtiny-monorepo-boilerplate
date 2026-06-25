export * from './generated/endpoints/auth/auth';
export * from './generated/endpoints/files/files';
export * from './generated/endpoints/health/health';
export * from './generated/endpoints/mail/mail';
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
