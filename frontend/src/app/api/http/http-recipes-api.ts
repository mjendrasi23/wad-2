import { Injectable } from '@angular/core';
import { Observable, map } from 'rxjs';
import { RecipesApi } from '../apis/recipes-api';
import { PagedResult } from '../models/paging';
import { RecipeDetail, RecipeListItem, RecipesListQuery, RecipeUpsert } from '../models/recipe';
import { HttpBaseApi } from './http-base-api';
import { mapPagedResult, recipeDetailFromBackend, recipeListItemFromBackend } from './backend-mappers';

@Injectable()
export class HttpRecipesApi extends RecipesApi {
  constructor(private readonly base: HttpBaseApi) {
    super();
  }

  list(query: RecipesListQuery): Observable<PagedResult<RecipeListItem>> {
    return this.base.http
      .get<PagedResult<any>>(`${this.base.baseUrl}/recipes`, { params: this.base.params(query as any) })
      .pipe(map((r) => mapPagedResult(r, recipeListItemFromBackend)));
  }

  listMine(query: RecipesListQuery): Observable<PagedResult<RecipeListItem>> {
    return this.base.http
      .get<PagedResult<any>>(`${this.base.baseUrl}/recipes/mine`, { params: this.base.params(query as any) })
      .pipe(map((r) => mapPagedResult(r, recipeListItemFromBackend)));
  }

  getById(id: string): Observable<RecipeDetail> {
    return this.base.http.get<any>(`${this.base.baseUrl}/recipes/${id}`).pipe(map(recipeDetailFromBackend));
  }

  create(request: RecipeUpsert): Observable<RecipeDetail> {
    return this.base.http.post<any>(`${this.base.baseUrl}/recipes`, request).pipe(map(recipeDetailFromBackend));
  }

  update(id: string, request: RecipeUpsert): Observable<RecipeDetail> {
    return this.base.http.put<any>(`${this.base.baseUrl}/recipes/${id}`, request).pipe(map(recipeDetailFromBackend));
  }

  delete(id: string): Observable<void> {
    return this.base.http.delete<void>(`${this.base.baseUrl}/recipes/${id}`);
  }
}
