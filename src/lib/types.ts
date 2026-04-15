/** A registered sub-application returned by the auth service. */
export interface AppInfo {
  id: string;
  name: string;
  url: string;
  iconUrl: string;
  description: string;
  active: boolean;
}

/** A user identity returned by the auth service. */
export interface UserInfo {
  id: string;
  name: string;
  type: 'owner' | 'named' | 'anonymous';
}

/** The standard auth response shape from login, setup, and validate-code endpoints. */
export interface AuthResponse {
  sessionToken: string;
  jwt: string;
  user: UserInfo;
  apps: AppInfo[];
}

/** Returned by validate-code when the code requires a password. */
export interface RequiresPasswordResponse {
  requiresPassword: true;
}

/** The session validation response from GET /auth/session. */
export interface SessionResponse {
  sessionToken: string;
  jwt: string;
  user: UserInfo | null;
  apps: AppInfo[];
}

/** Public app metadata from GET /apps/:slug/meta. */
export interface AppMeta {
  name: string;
  iconUrl: string;
}

/** Standard error response shape from the auth service. */
export interface ErrorResponse {
  error: string;
}
