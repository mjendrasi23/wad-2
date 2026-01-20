import { Injectable } from '@angular/core';
import { Observable, map } from 'rxjs';
import { AuthApi, LoginRequest, LoginResponse, RegisterRequest } from '../apis/auth-api';
import { User } from '../models/user';
import { HttpBaseApi } from './http-base-api';
import { userFromAuthPayload } from './backend-mappers';

@Injectable()
export class HttpAuthApi extends AuthApi {
  constructor(private readonly base: HttpBaseApi) {
    super();
  }

  login(request: LoginRequest): Observable<LoginResponse> {
    return this.base.http
      .post<any>(`${this.base.baseUrl}/auth/login`, request)
      .pipe(map((payload) => ({ token: 'session', user: userFromAuthPayload(payload)! })));
  }

  register(request: RegisterRequest): Observable<LoginResponse> {
    return this.base.http
      .post<any>(`${this.base.baseUrl}/auth/register`, request)
      .pipe(map((payload) => ({ token: 'session', user: userFromAuthPayload(payload)! })));
  }

  me(token: string | null): Observable<User | null> {
    return this.base.http.get<any>(`${this.base.baseUrl}/auth/me`).pipe(map((payload) => userFromAuthPayload(payload)));
  }

  logout(): Observable<void> {
    return this.base.http.delete<void>(`${this.base.baseUrl}/auth/logout`);
  }
}

