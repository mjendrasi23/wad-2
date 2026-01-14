import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivate, Router, UrlTree } from '@angular/router';
import { Observable, map, take } from 'rxjs';
import { UserRole } from '../../api/models/user';
import { AuthService } from '../services/auth.service';

@Injectable({ providedIn: 'root' })
export class RoleGuard implements CanActivate {
  constructor(
    private readonly auth: AuthService,
    private readonly router: Router
  ) {}

  canActivate(route: ActivatedRouteSnapshot): Observable<boolean | UrlTree> {
    const roles = (route.data['roles'] as UserRole[] | undefined) ?? [];
    if (!roles.length) {
      return this.auth.ready$.pipe(
        take(1),
        map(() => (this.auth.userSnapshot() ? true : this.router.createUrlTree(['/login'])))
      );
    }

    return this.auth.ready$.pipe(
      take(1),
      map(() => {
        const u = this.auth.userSnapshot();
        if (!u) return this.router.createUrlTree(['/login']);
        return roles.includes(u.role) ? true : this.router.createUrlTree(['/']);
      })
    );
  }
}
