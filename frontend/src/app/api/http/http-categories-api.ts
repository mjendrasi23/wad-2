import { Injectable } from '@angular/core';
import { Observable, map } from 'rxjs';
import { CategoriesApi, CategoryUpsert } from '../apis/categories-api';
import { Category } from '../models/category';
import { HttpBaseApi } from './http-base-api';
import { categoryFromBackend } from './backend-mappers';

@Injectable()
export class HttpCategoriesApi extends CategoriesApi {
  constructor(private readonly base: HttpBaseApi) {
    super();
  }

  list(): Observable<Category[]> {
    return this.base.http.get<any[]>(`${this.base.baseUrl}/categories`).pipe(map((rows) => (rows || []).map(categoryFromBackend)));
  }

  create(request: CategoryUpsert): Observable<Category> {
    const body = { name: request.name, description: request.description };
    return this.base.http.post<any>(`${this.base.baseUrl}/categories`, body).pipe(map(categoryFromBackend));
  }

  update(id: string, request: CategoryUpsert): Observable<Category> {
    const body = { name: request.name, description: request.description };
    return this.base.http.put<any>(`${this.base.baseUrl}/categories/${id}`, body).pipe(map(categoryFromBackend));
  }

  delete(id: string): Observable<void> {
    return this.base.http.delete<void>(`${this.base.baseUrl}/categories/${id}`);
  }
}

