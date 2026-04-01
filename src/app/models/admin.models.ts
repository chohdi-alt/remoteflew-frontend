export interface AdminUserDTO {
  externalId: string;
  fullName: string;
  email: string | null;
  matricule: string | null;
  active: boolean;
  roles: string[];
  teamName: string | null;
}

export interface UpdateUserRolesRequest {
  roles: string[];
}

export interface UpdateUserActivationRequest {
  active: boolean;
}

export interface UserDirectoryDTO {
  id: number;
  externalId: string;
  email: string | null;
  nom: string | null;
  prenom: string | null;
  roles: string[];
  teamName: string | null;
}

export interface TeamDirectoryDTO {
  id: number;
  name: string;
  manager: string | null;
  membersCount: number;
}

export interface RoleDTO {
  name: string;
}

export interface CreateTeamRequest {
  name: string;
  managerExternalId: string;
}

export interface UpdateTeamManagerRequest {
  managerExternalId: string;
}

export interface UpdateTeamMembersRequest {
  userExternalIds: string[];
}

export interface CreateUserRequest {
  username: string;
  email: string;
  firstName?: string | null;
  lastName?: string | null;
  roles: string[];
}

export interface SmtpConfigRequest {
  name: string;
  host: string;
  port: number;
  protocol?: string | null;
  username?: string | null;
  password?: string | null;
  fromEmail?: string | null;
  authEnabled: boolean;
  starttlsEnabled: boolean;
  sslEnabled: boolean;
  connectionTimeoutMs?: number | null;
  readTimeoutMs?: number | null;
  writeTimeoutMs?: number | null;
  active: boolean;
}

export interface SmtpConfigResponse {
  id: number | null;
  name: string;
  host: string;
  port: number;
  protocol: string;
  username: string | null;
  hasPassword: boolean;
  fromEmail: string | null;
  authEnabled: boolean;
  starttlsEnabled: boolean;
  sslEnabled: boolean;
  connectionTimeoutMs: number | null;
  readTimeoutMs: number | null;
  writeTimeoutMs: number | null;
  active: boolean;
  source: string;
  updatedAt: string | null;
}

export interface SmtpConnectionTestResponse {
  success: boolean;
  message: string;
}

export interface PageResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
  numberOfElements: number;
  first: boolean;
  last: boolean;
}
