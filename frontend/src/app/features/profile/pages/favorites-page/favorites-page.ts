import { Component, inject } from '@angular/core';
import { BehaviorSubject, combineLatest, map, shareReplay, startWith, switchMap } from 'rxjs';
import { FavoritesApi } from '../../../../api/apis/favorites-api';
import { PagedResult } from '../../../../api/models/paging';
import { RecipeListItem, RecipesListQuery } from '../../../../api/models/recipe';

interface FavoritesVm {
  query: RecipesListQuery;
  loading: boolean;
  result: PagedResult<RecipeListItem> | null;
}

@Component({
  selector: 'app-favorites-page',
  standalone: false,
  templateUrl: './favorites-page.html',
  styleUrl: './favorites-page.scss',
})
export class FavoritesPage {
  private readonly favoritesApi = inject(FavoritesApi);

  private readonly pageSubject = new BehaviorSubject<{ page: number; pageSize: number }>({ page: 1, pageSize: 12 });
  readonly vm$ = this.pageSubject.pipe(
    switchMap((p) => {
      const query: RecipesListQuery = {
        page: p.page,
        pageSize: p.pageSize,
        sortBy: 'newest',
        sortDir: 'desc',
      };

      return this.favoritesApi.listMyFavorites(query).pipe(
        map((result) => ({ query, result, loading: false } satisfies FavoritesVm)),
        startWith({ query, result: null, loading: true } satisfies FavoritesVm)
      );
    }),
    shareReplay(1)
  );

  onPageChange(pageIndex: number, pageSize: number): void {
    this.pageSubject.next({ page: pageIndex + 1, pageSize });
  }
}
