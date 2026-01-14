export type UserRole = 'explorer' | 'creator' | 'manager' | 'admin';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatarUrl?: string;
  createdAt: string;
}

export interface UserPrivate {
  userId: string;
  password: string;
}

