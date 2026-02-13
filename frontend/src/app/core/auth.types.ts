export interface AuthUser {
  id: number;
  username: string;
  is_staff: boolean;
  is_superuser: boolean;
}

export interface TokenPair {
  access: string;
  refresh: string;
}

export interface RegisterResponse extends TokenPair {
  user: AuthUser;
}
