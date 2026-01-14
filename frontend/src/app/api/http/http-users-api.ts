import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { UsersApi, UsersListQuery } from '../apis/users-api';
import { PagedResult } from '../models/paging';
import { User, UserRole } from '../models/user';
import { HttpBaseApi } from './http-base-api';

@Injectable()
export class HttpUsersApi extends UsersApi {
  constructor(private readonly base: HttpBaseApi) {
    super();
  }

  list(query: UsersListQuery): Observable<PagedResult<User>> {
    return this.base.http.get<PagedResult<User>>(`${this.base.baseUrl}/admin/users`, { params: query as any });
  }

  getById(id: string): Observable<User> {
    return this.base.http.get<User>(`${this.base.baseUrl}/admin/users/${id}`);
  }

  setRole(userId: string, role: UserRole): Observable<User> {
    return this.base.http.patch<User>(`${this.base.baseUrl}/admin/users/${userId}`, { role });
  }

  resetPassword(userId: string): Observable<void> {
    return this.base.http.post<void>(`${this.base.baseUrl}/admin/users/${userId}/reset-password`, {});
  }
}
