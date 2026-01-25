import { Component, inject } from '@angular/core';
import { FormBuilder } from '@angular/forms';
import { BehaviorSubject, combineLatest, debounceTime, distinctUntilChanged, map, shareReplay, startWith, switchMap } from 'rxjs';
import { UsersApi } from '../../../../api/apis/users-api';
import { PagedResult } from '../../../../api/models/paging';
import { User, UserRole } from '../../../../api/models/user';
import { ConfirmService } from '../../../../shared/services/confirm.service';

interface UsersVm {
  loading: boolean;
  result: PagedResult<User> | null;
}

@Component({
  selector: 'app-users-page',
  standalone: false,
  templateUrl: './users-page.html',
  styleUrl: './users-page.scss',
})
export class UsersPage {
  private readonly fb = inject(FormBuilder);
  private readonly usersApi = inject(UsersApi);
  private readonly confirm = inject(ConfirmService);

  readonly roles: UserRole[] = ['creator', 'manager', 'admin'];

  readonly form = this.fb.nonNullable.group({
    search: this.fb.nonNullable.control(''),
    role: this.fb.nonNullable.control<UserRole | ''>(''),
  });

  private readonly pageSubject = new BehaviorSubject<{ page: number; pageSize: number }>({ page: 1, pageSize: 10 });

  selectedUserId: string | null = null;

  readonly vm$ = combineLatest([
    this.form.valueChanges.pipe(startWith(this.form.getRawValue()), debounceTime(150), distinctUntilChanged((a, b) => JSON.stringify(a) === JSON.stringify(b))),
    this.pageSubject,
  ]).pipe(
    switchMap(([f, p]) => {
      return this.usersApi
        .list({
          page: p.page,
          pageSize: p.pageSize,
          sortBy: 'name',
          search: f.search || undefined,
          role: (f.role || undefined) as UserRole | undefined,
        })
        .pipe(
          map((result) => ({ loading: false, result } satisfies UsersVm)),
          startWith({ loading: true, result: null } satisfies UsersVm)
        );
    }),
    shareReplay(1)
  );

  onPageChange(pageIndex: number, pageSize: number): void {
    this.pageSubject.next({ page: pageIndex + 1, pageSize });
  }

  openUser(user: User): void {
    this.selectedUserId = user.id;
  }

  closeDrawer(): void {
    this.selectedUserId = null;
  }

  changeRole(user: User, role: UserRole): void {
    if (user.role === role) return;
    this.confirm
      .open({
        title: 'Change role?',
        message: `Change ${user.email} to \"${role}\"?`,
        confirmText: 'Change',
      })
      .subscribe((ok) => {
        if (!ok) return;
        this.usersApi.setRole(user.id, role).subscribe(() => this.pageSubject.next(this.pageSubject.value));
      });
  }
}
