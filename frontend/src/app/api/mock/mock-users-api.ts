import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { UsersApi, UsersListQuery } from '../apis/users-api';
import { ApiError } from '../models/api-error';
import { PagedResult } from '../models/paging';
import { User, UserRole } from '../models/user';
import { MockApiBase } from './mock-api-base';
import { MockDbService } from './mock-db.service';
import { requireRole, requireUser } from './mock-auth';

function norm(s: string): string {
  return s.trim().toLowerCase();
}

@Injectable()
export class MockUsersApi extends UsersApi {
  constructor(
    private readonly base: MockApiBase,
    private readonly dbService: MockDbService
  ) {
    super();
  }

  list(query: UsersListQuery): Observable<PagedResult<User>> {
    return this.base.network(() => {
      const db = this.dbService.require();
      const actor = requireUser(db.users);
      requireRole(actor, ['admin']);

      const search = query.search ? norm(query.search) : '';
      const role = query.role;

      let items = db.users.slice();
      if (search) items = items.filter((u) => norm(`${u.name} ${u.email}`).includes(search));
      if (role) items = items.filter((u) => u.role === role);

      items.sort((a, b) => {
        if (query.sortBy === 'email') return a.email.localeCompare(b.email);
        if (query.sortBy === 'createdAt') return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        return a.name.localeCompare(b.name);
      });

      const page = Math.max(1, Math.floor(query.page || 1));
      const pageSize = Math.min(50, Math.max(1, Math.floor(query.pageSize || 10)));
      const total = items.length;
      const start = (page - 1) * pageSize;

      return { items: items.slice(start, start + pageSize), total, page, pageSize };
    });
  }

  getById(id: string): Observable<User> {
    return this.base.network(() => {
      const db = this.dbService.require();
      const actor = requireUser(db.users);
      requireRole(actor, ['admin']);

      const user = db.users.find((u) => u.id === id);
      if (!user) throw new ApiError('User not found.', 404, 'NOT_FOUND');
      return user;
    });
  }

  setRole(userId: string, role: UserRole): Observable<User> {
    return this.base.network(() => {
      const db = this.dbService.require();
      const actor = requireUser(db.users);
      requireRole(actor, ['admin']);

      const user = db.users.find((u) => u.id === userId);
      if (!user) throw new ApiError('User not found.', 404, 'NOT_FOUND');

      const updated: User = { ...user, role };
      this.dbService.update((d) => {
        const idx = d.users.findIndex((u) => u.id === userId);
        if (idx >= 0) d.users[idx] = updated;
      });

      return updated;
    });
  }

  resetPassword(userId: string): Observable<void> {
    return this.base.network(() => {
      const db = this.dbService.require();
      const actor = requireUser(db.users);
      requireRole(actor, ['admin']);

      const privateRow = db.userPrivate.find((p) => p.userId === userId);
      if (!privateRow) throw new ApiError('User not found.', 404, 'NOT_FOUND');

      this.dbService.update((d) => {
        const row = d.userPrivate.find((p) => p.userId === userId);
        if (row) row.password = 'Password123!';
      });

      return undefined;
    });
  }
}
