import { Component, EventEmitter, Input, Output, inject } from '@angular/core';
import { BehaviorSubject, filter, map, shareReplay, startWith, switchMap } from 'rxjs';
import { UsersApi } from '../../../../api/apis/users-api';
import { User } from '../../../../api/models/user';
import { ConfirmService } from '../../../../shared/services/confirm.service';
import { MatSnackBar } from '@angular/material/snack-bar';

@Component({
  selector: 'app-user-detail-drawer',
  standalone: false,
  templateUrl: './user-detail-drawer.html',
  styleUrl: './user-detail-drawer.scss',
})
export class UserDetailDrawer {
  private readonly usersApi = inject(UsersApi);
  private readonly confirm = inject(ConfirmService);
  private readonly snackBar = inject(MatSnackBar);

  private readonly userIdSubject = new BehaviorSubject<string | null>(null);

  @Input({ required: true })
  set userId(value: string) {
    this.userIdSubject.next(value);
  }

  get userId(): string {
    return this.userIdSubject.value ?? '';
  }

  @Output() closed = new EventEmitter<void>();

  readonly vm$ = this.userIdSubject.pipe(
    filter((id): id is string => !!id),
    switchMap((id) =>
      this.usersApi.getById(id).pipe(
        map((user) => ({ loading: false, user })),
        startWith({ loading: true, user: null as User | null })
      )
    ),
    shareReplay(1)
  );

  close(): void {
    this.closed.emit();
  }

  resetPassword(user: User): void {
    this.confirm
      .open({
        title: 'Reset password?',
        message: `Reset password for ${user.email} to “Password123!”?`,
        confirmText: 'Reset',
      })
      .subscribe((ok) => {
        if (!ok) return;
        this.usersApi.resetPassword(user.id).subscribe(() => {
          this.snackBar.open('Password reset to Password123!.', 'Dismiss', { duration: 3000 });
        });
      });
  }
}
