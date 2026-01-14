import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { RatingsApi } from '../apis/ratings-api';
import { Rating, RatingSummary } from '../models/rating';
import { HttpBaseApi } from './http-base-api';

@Injectable()
export class HttpRatingsApi extends RatingsApi {
  constructor(private readonly base: HttpBaseApi) {
    super();
  }

  summary(recipeId: string): Observable<RatingSummary> {
    return this.base.http.get<RatingSummary>(`${this.base.baseUrl}/recipes/${recipeId}/ratings/summary`);
  }

  listByRecipe(recipeId: string): Observable<Rating[]> {
    return this.base.http.get<Rating[]>(`${this.base.baseUrl}/recipes/${recipeId}/ratings`);
  }

  rate(recipeId: string, value: number): Observable<RatingSummary> {
    return this.base.http.post<RatingSummary>(`${this.base.baseUrl}/recipes/${recipeId}/ratings`, { value });
  }
}
