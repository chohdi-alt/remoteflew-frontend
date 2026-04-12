export const APP_ROLES = ['EMPLOYEE', 'MANAGER', 'HR', 'ADMIN'] as const;
export type AppRole = (typeof APP_ROLES)[number];

export interface RemoteFlowTokenParsed {
  sub?: string;
  preferred_username?: string;
  email?: string;
  roles?: string[];
  realm_access?: {
    roles?: string[];
  };
  resource_access?: Record<string, { roles?: string[] } | undefined>;
  exp?: number;
  iat?: number;
}

export interface LoginRequestPayload {
  username: string;
  password: string;
}

export interface AuthTokenResponse {
  accessToken?: string;
  refreshToken?: string;
  expiresIn?: number;
  refreshExpiresIn?: number;
  tokenType?: string;
  role?: string;
  roles?: string[];
  userId?: string;
  username?: string;
  email?: string | null;
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  refresh_expires_in?: number;
  token_type?: string;
}

export interface StoredAuthSession {
  accessToken: string;
  refreshToken: string | null;
  expiresAt: number | null;
  refreshExpiresAt: number | null;
  roles: string[];
}

export interface CurrentUser {
  userId: string;
  username: string;
  email: string | null;
  roles: AppRole[];
  authorities: string[];
}

export interface ApiErrorPayload {
  timestamp: string;
  status: number;
  errorCode: string;
  message: string;
  path: string;
}

export interface PasswordUpdateRequiredResponse {
  error: 'PASSWORD_UPDATE_REQUIRED';
  username: string;
}

export interface ChangePasswordRequestPayload {
  username: string;
  temporaryPassword: string;
  newPassword: string;
}

export interface ChangePasswordResponse {
  success: boolean;
  username: string;
}

export interface ActivateAccountRequestPayload {
  token: string;
  newPassword: string;
}

export interface ActivateAccountResponse {
  success: boolean;
  username: string;
}

export enum AuthErrorType {
  INVALID_CREDENTIALS,
  TEMPORARY_LOCK,
  ACCOUNT_DISABLED,
  PASSWORD_RESET_REQUIRED,
  UNKNOWN
}

export interface AuthError {
  type: AuthErrorType;
  retryAfterSeconds?: number;
}

function mapErrorType(error: string): AuthErrorType {
  switch (error) {
    case 'AUTH_INVALID':
      return AuthErrorType.INVALID_CREDENTIALS;
    case 'AUTH_TEMP_LOCK':
      return AuthErrorType.TEMPORARY_LOCK;
    case 'AUTH_ACCOUNT_DISABLED':
      return AuthErrorType.ACCOUNT_DISABLED;
    case 'PASSWORD_UPDATE_REQUIRED':
      return AuthErrorType.PASSWORD_RESET_REQUIRED;
    default:
      return AuthErrorType.UNKNOWN;
  }
}

export function mapBackendError(error: string, payload?: any): AuthError {
  return {
    type: mapErrorType(error),
    retryAfterSeconds: payload?.retryAfterSeconds
  };
}
