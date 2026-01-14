import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { CategoriesApi, CategoryUpsert } from '../apis/categories-api';
import { Category } from '../models/category';
import { HttpBaseApi } from './http-base-api';

@Injectable()
export class HttpCategoriesApi extends CategoriesApi {
  constructor(private readonly base: HttpBaseApi) {
    super();
  }

  list(): Observable<Category[]> {
    return this.base.http.get<Category[]>(`${this.base.baseUrl}/categories`);
  }

  create(request: CategoryUpsert): Observable<Category> {
    return this.base.http.post<Category>(`${this.base.baseUrl}/categories`, request);
  }

  update(id: string, request: CategoryUpsert): Observable<Category> {
    return this.base.http.put<Category>(`${this.base.baseUrl}/categories/${id}`, request);
  }

  delete(id: string): Observable<void> {
    return this.base.http.delete<void>(`${this.base.baseUrl}/categories/${id}`);
  }
}

