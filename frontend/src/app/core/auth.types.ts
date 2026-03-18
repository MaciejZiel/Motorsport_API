export interface AuthUser {
  id: number;
  username: string;
  is_staff: boolean;
  is_superuser: boolean;
}

export interface AuthSessionResponse {
  user: AuthUser;
}
