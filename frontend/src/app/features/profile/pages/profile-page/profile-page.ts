import { Component, inject } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { map, shareReplay } from 'rxjs';
import { FavoritesApi } from '../../../../api/apis/favorites-api';
import { MaintenanceApi } from '../../../../api/apis/maintenance-api';
import { RecipesListQuery } from '../../../../api/models/recipe';
import { AuthService } from '../../../../core/services/auth.service';
import { environment } from '../../../../../environments/environment';
import { ConfirmService } from '../../../../shared/services/confirm.service';

@Component({
  selector: 'app-profile-page',
  standalone: false,
  templateUrl: './profile-page.html',
  styleUrl: './profile-page.scss',
})
export class ProfilePage {
  readonly env = environment;
  readonly auth = inject(AuthService);
  private readonly favoritesApi = inject(FavoritesApi);
  private readonly maintenanceApi = inject(MaintenanceApi);
  private readonly confirm = inject(ConfirmService);
  private readonly snackBar = inject(MatSnackBar);

  readonly user$ = this.auth.user$;

  readonly favoritesPreview$ = this.favoritesApi
    .listMyFavorites({
      page: 1,
      pageSize: 3,
      sortBy: 'newest',
      sortDir: 'desc',
    } satisfies RecipesListQuery)
    .pipe(shareReplay(1));

  resetDemoData(): void {
    if (!this.env.useMockApi) return;
    this.confirm
      .open({
        title: 'Reset demo data?',
        message: 'This will restore the seeded mock database and sign you out.',
        confirmText: 'Reset',
        tone: 'danger',
      })
      .subscribe((ok) => {
        if (!ok) return;
        this.maintenanceApi.resetDemoData().subscribe(() => {
          this.auth.logout();
          this.snackBar.open('Demo data reset.', 'Dismiss', { duration: 3000 });
        });
      });
  }
}
