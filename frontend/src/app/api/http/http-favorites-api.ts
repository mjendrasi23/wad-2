import { Injectable } from '@angular/core';
import { Observable, map } from 'rxjs';
import { FavoritesApi } from '../apis/favorites-api';
import { PagedResult } from '../models/paging';
import { RecipeListItem, RecipesListQuery } from '../models/recipe';
import { HttpBaseApi } from './http-base-api';
import { mapPagedResult, recipeListItemFromBackend } from './backend-mappers';

@Injectable()
export class HttpFavoritesApi extends FavoritesApi {
  constructor(private readonly base: HttpBaseApi) {
    super();
  }

  listMyFavorites(query: RecipesListQuery): Observable<PagedResult<RecipeListItem>> {
    return this.base.http
      .get<PagedResult<any>>(`${this.base.baseUrl}/favorites`, { params: query as any })
      .pipe(map((r) => mapPagedResult(r, recipeListItemFromBackend)));
  }

  toggle(recipeId: string): Observable<{ isFavorite: boolean }> {
    return this.base.http.post<{ isFavorite: boolean }>(`${this.base.baseUrl}/favorites/${recipeId}`, {});
  }

  isFavorite(recipeId: string): Observable<boolean> {
    return this.base.http.get<boolean>(`${this.base.baseUrl}/favorites/${recipeId}`);
  }
}

