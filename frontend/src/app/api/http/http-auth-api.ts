import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { AuthApi, LoginRequest, LoginResponse, RegisterRequest } from '../apis/auth-api';
import { User } from '../models/user';
import { HttpBaseApi } from './http-base-api';

@Injectable()
export class HttpAuthApi extends AuthApi {
  constructor(private readonly base: HttpBaseApi) {
    super();
  }

  login(request: LoginRequest): Observable<LoginResponse> {
    return this.base.http.post<LoginResponse>(`${this.base.baseUrl}/auth/login`, request);
  }

  register(request: RegisterRequest): Observable<LoginResponse> {
    return this.base.http.post<LoginResponse>(`${this.base.baseUrl}/auth/register`, request);
  }

  me(token: string | null): Observable<User | null> {
    // The real backend should typically infer the user from the Authorization header.
    // We pass the token here to keep the UI-layer code independent of the auth mechanism.
    return this.base.http.get<User | null>(`${this.base.baseUrl}/auth/me`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
  }
}

