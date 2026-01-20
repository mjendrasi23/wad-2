import { Observable } from 'rxjs';
import { User } from '../models/user';

export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  user: User;
}

export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
}

export abstract class AuthApi {
  abstract login(request: LoginRequest): Observable<LoginResponse>;
  abstract register(request: RegisterRequest): Observable<LoginResponse>;
  abstract me(token: string | null): Observable<User | null>;
  abstract logout(): Observable<void>;
}

