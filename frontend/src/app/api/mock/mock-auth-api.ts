import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { AuthApi, LoginRequest, LoginResponse, RegisterRequest } from '../apis/auth-api';
import { ApiError } from '../models/api-error';
import { User } from '../models/user';
import { MockApiBase } from './mock-api-base';
import { MockDbService } from './mock-db.service';
import { id, nowIso } from './mock-utils';

function makeToken(userId: string): string {
  return `mock.${userId}.${Math.random().toString(36).slice(2)}`;
}

function tokenUserId(token: string): string | null {
  const parts = token.split('.');
  if (parts.length < 3) return null;
  if (parts[0] !== 'mock') return null;
  return parts[1] || null;
}

@Injectable()
export class MockAuthApi extends AuthApi {
  constructor(
    private readonly base: MockApiBase,
    private readonly dbService: MockDbService
  ) {
    super();
  }

  login(request: LoginRequest): Observable<LoginResponse> {
    return this.base.network(() => {
      const db = this.dbService.require();
      const loginId = request.username.trim().toLowerCase();
      const user = db.users.find((u) => u.email.toLowerCase() === loginId || u.name.toLowerCase() === loginId);
      if (!user) throw new ApiError('Invalid username or password.', 401, 'AUTH_INVALID');

      const privateRow = db.userPrivate.find((p) => p.userId === user.id);
      if (!privateRow || privateRow.password !== request.password) {
        throw new ApiError('Invalid username or password.', 401, 'AUTH_INVALID');
      }

      return { token: makeToken(user.id), user };
    });
  }

  register(request: RegisterRequest): Observable<LoginResponse> {
    return this.base.network(() => {
      const email = request.email.trim().toLowerCase();
      if (!email) throw new ApiError('Email is required.', 400, 'VALIDATION');

      const db = this.dbService.require();
      if (db.users.some((u) => u.email.toLowerCase() === email)) {
        throw new ApiError('This email is already registered.', 409, 'AUTH_EMAIL_TAKEN');
      }

      const createdAt = nowIso();
      const userId = id('u_reg', db.users.length + 1);
      const user: User = { id: userId, name: request.username.trim() || 'New User', email, role: 'creator', createdAt };

      this.dbService.update((d) => {
        d.users.unshift(user);
        d.userPrivate.push({ userId, password: request.password });
      });

      return { token: makeToken(userId), user };
    });
  }

  me(token: string | null): Observable<User | null> {
    return this.base.network(() => {
      if (!token) return null;
      const userId = tokenUserId(token);
      if (!userId) return null;
      const db = this.dbService.require();
      return db.users.find((u) => u.id === userId) ?? null;
    });
  }

  logout(): Observable<void> {
    return this.base.network(() => void 0);
  }
}

