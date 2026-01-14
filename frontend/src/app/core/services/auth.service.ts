import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { BehaviorSubject, Observable, catchError, map, of, tap } from 'rxjs';
import { AuthApi, LoginRequest, RegisterRequest } from '../../api/apis/auth-api';
import { User, UserRole } from '../../api/models/user';
import { environment } from '../../../environments/environment';
import { ErrorHandlingService } from '../error/error-handling.service';
import { STORAGE_KEYS } from '../storage/storage-keys';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly tokenSubject = new BehaviorSubject<string | null>(this.readToken());
  private readonly userSubject = new BehaviorSubject<User | null>(null);
  private readonly readySubject = new BehaviorSubject<boolean>(false);

  readonly token$ = this.tokenSubject.asObservable();
  readonly user$ = this.userSubject.asObservable();
  readonly ready$ = this.readySubject.asObservable();

  readonly isAuthenticated$ = this.user$.pipe(map((u) => !!u));

  constructor(
    private readonly api: AuthApi,
    private readonly router: Router,
    private readonly errors: ErrorHandlingService
  ) {
    this.bootstrap();
  }

  tokenSnapshot(): string | null {
    return this.tokenSubject.value;
  }

  userSnapshot(): User | null {
    return this.userSubject.value;
  }

  hasAnyRole(roles: UserRole[]): boolean {
    const user = this.userSnapshot();
    return !!user && roles.includes(user.role);
  }

  login(request: LoginRequest): Observable<{ ok: boolean; message?: string }> {
    return this.api.login(request).pipe(
      tap((res) => this.setSession(res.token, res.user)),
      map(() => ({ ok: true } as const)),
      catchError((e) => {
        const message = this.errors.messageFrom(e) ?? 'Login failed.';
        this.errors.notifyError(e, 'Login failed.');
        return of({ ok: false, message } as const);
      })
    );
  }

  register(request: RegisterRequest): Observable<{ ok: boolean; message?: string }> {
    return this.api.register(request).pipe(
      tap((res) => this.setSession(res.token, res.user)),
      map(() => ({ ok: true } as const)),
      catchError((e) => {
        const message = this.errors.messageFrom(e) ?? 'Registration failed.';
        this.errors.notifyError(e, 'Registration failed.');
        return of({ ok: false, message } as const);
      })
    );
  }

  logout(): void {
    this.clearSession();
    void this.router.navigateByUrl('/');
  }

  devSwitchRole(role: UserRole | 'guest'): Observable<void> {
    if (!environment.useMockApi) return of(void 0);
    if (role === 'guest') {
      localStorage.removeItem(STORAGE_KEYS.devRoleOverride);
      this.logout();
      return of(void 0);
    }

    const creds: Record<UserRole, LoginRequest> = {
      explorer: { email: 'user@demo.com', password: 'Password123!' },
      creator: { email: 'user@demo.com', password: 'Password123!' },
      manager: { email: 'manager@demo.com', password: 'Password123!' },
      admin: { email: 'admin@demo.com', password: 'Password123!' },
    };

    return this.api.login(creds[role]).pipe(
      tap((res) => {
        if (role === 'explorer') localStorage.setItem(STORAGE_KEYS.devRoleOverride, 'explorer');
        else if (role === 'creator') localStorage.removeItem(STORAGE_KEYS.devRoleOverride);
        else localStorage.removeItem(STORAGE_KEYS.devRoleOverride);

        this.setSession(res.token, this.applyRoleOverride(res.user));
      }),
      map(() => void 0)
    );
  }

  private bootstrap(): void {
    const token = this.readToken();
    this.api
      .me(token)
      .pipe(
        tap((me) => {
          this.userSubject.next(me ? this.applyRoleOverride(me) : null);
          if (!me) this.writeToken(null);
        }),
        catchError((e) => {
          this.clearSession();
          this.errors.notifyError(e);
          return of(null);
        })
      )
      .subscribe({
        complete: () => this.readySubject.next(true),
      });
  }

  private setSession(token: string, user: User): void {
    this.writeToken(token);
    this.tokenSubject.next(token);
    this.userSubject.next(user);
  }

  private clearSession(): void {
    this.writeToken(null);
    this.tokenSubject.next(null);
    this.userSubject.next(null);
  }

  private readToken(): string | null {
    return localStorage.getItem(STORAGE_KEYS.authToken);
  }

  private writeToken(token: string | null): void {
    if (!token) {
      localStorage.removeItem(STORAGE_KEYS.authToken);
      return;
    }
    localStorage.setItem(STORAGE_KEYS.authToken, token);
  }

  private applyRoleOverride(user: User): User {
    if (!environment.useMockApi) return user;
    const override = localStorage.getItem(STORAGE_KEYS.devRoleOverride) as UserRole | null;
    if (!override) return user;
    return { ...user, role: override };
  }
}
