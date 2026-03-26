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
  email?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  roles: string[];
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
