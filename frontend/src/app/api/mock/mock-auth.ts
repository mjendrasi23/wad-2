import { ApiError } from '../models/api-error';
import { User, UserRole } from '../models/user';
import { MOCK_AUTH_TOKEN_KEY } from './mock-constants';
import { STORAGE_KEYS } from '../../core/storage/storage-keys';

export function getToken(): string | null {
  return localStorage.getItem(MOCK_AUTH_TOKEN_KEY);
}

export function tokenUserId(token: string): string | null {
  const parts = token.split('.');
  if (parts.length < 3) return null;
  if (parts[0] !== 'mock') return null;
  return parts[1] || null;
}

export function currentUser(dbUsers: User[]): User | null {
  const token = getToken();
  if (!token) return null;
  const userId = tokenUserId(token);
  if (!userId) return null;
  const user = dbUsers.find((u) => u.id === userId) ?? null;
  if (!user) return null;

  const override = localStorage.getItem(STORAGE_KEYS.devRoleOverride) as UserRole | null;
  if (!override) return user;
  if (override === user.role) return user;
  return { ...user, role: override };
}

export function requireUser(dbUsers: User[]): User {
  const user = currentUser(dbUsers);
  if (!user) throw new ApiError('You must be logged in.', 401, 'AUTH_REQUIRED');
  return user;
}

export function hasRole(user: User, roles: UserRole[]): boolean {
  if (roles.includes(user.role)) return true;
  return false;
}

export function requireRole(user: User, roles: UserRole[]): void {
  if (!hasRole(user, roles)) throw new ApiError('You do not have permission to do that.', 403, 'FORBIDDEN');
}

export function canExplore(user: User): boolean {
  return user.role === 'explorer' || user.role === 'creator';
}

export function canCreateRecipes(user: User): boolean {
  return user.role === 'creator';
}
