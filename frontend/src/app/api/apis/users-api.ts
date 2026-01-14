import { Observable } from 'rxjs';
import { PagedResult } from '../models/paging';
import { User, UserRole } from '../models/user';

export type UsersSortBy = 'name' | 'email' | 'createdAt';

export interface UsersListQuery {
  page: number;
  pageSize: number;
  sortBy: UsersSortBy;
  search?: string;
  role?: UserRole;
}

export abstract class UsersApi {
  abstract list(query: UsersListQuery): Observable<PagedResult<User>>;
  abstract getById(id: string): Observable<User>;
  abstract setRole(userId: string, role: UserRole): Observable<User>;
  abstract resetPassword(userId: string): Observable<void>;
}
