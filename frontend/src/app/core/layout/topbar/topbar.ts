import { Component, inject } from '@angular/core';
import { shareReplay } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { CategoriesApi } from '../../../api/apis/categories-api';
import { UserRole } from '../../../api/models/user';
import { AuthService } from '../../services/auth.service';
import { DevToolsService } from '../../services/dev-tools.service';

@Component({
  selector: 'app-topbar',
  standalone: false,
  templateUrl: './topbar.html',
  styleUrl: './topbar.scss',
})
export class Topbar {
  private readonly categoriesApi = inject(CategoriesApi);

  readonly env = environment;
  readonly roles: Array<UserRole | 'guest'> = ['guest', 'explorer', 'creator', 'manager', 'admin'];
  readonly categories$ = this.categoriesApi.list().pipe(shareReplay(1));

  constructor(
    readonly auth: AuthService,
    readonly devTools: DevToolsService
  ) {}
}
