import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { RecipesApi } from '../apis/recipes-api';
import { PagedResult } from '../models/paging';
import { RecipeDetail, RecipeListItem, RecipesListQuery, RecipeUpsert } from '../models/recipe';
import { HttpBaseApi } from './http-base-api';

@Injectable()
export class HttpRecipesApi extends RecipesApi {
  constructor(private readonly base: HttpBaseApi) {
    super();
  }

  list(query: RecipesListQuery): Observable<PagedResult<RecipeListItem>> {
    return this.base.http.get<PagedResult<RecipeListItem>>(`${this.base.baseUrl}/recipes`, { params: query as any });
  }

  listMine(query: RecipesListQuery): Observable<PagedResult<RecipeListItem>> {
    return this.base.http.get<PagedResult<RecipeListItem>>(`${this.base.baseUrl}/recipes/mine`, { params: query as any });
  }

  getById(id: string): Observable<RecipeDetail> {
    return this.base.http.get<RecipeDetail>(`${this.base.baseUrl}/recipes/${id}`);
  }

  create(request: RecipeUpsert): Observable<RecipeDetail> {
    return this.base.http.post<RecipeDetail>(`${this.base.baseUrl}/recipes`, request);
  }

  update(id: string, request: RecipeUpsert): Observable<RecipeDetail> {
    return this.base.http.put<RecipeDetail>(`${this.base.baseUrl}/recipes/${id}`, request);
  }

  delete(id: string): Observable<void> {
    return this.base.http.delete<void>(`${this.base.baseUrl}/recipes/${id}`);
  }
}
