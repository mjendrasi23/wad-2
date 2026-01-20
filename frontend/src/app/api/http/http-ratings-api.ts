import { Injectable } from '@angular/core';
import { Observable, map } from 'rxjs';
import { RatingsApi } from '../apis/ratings-api';
import { Rating, RatingSummary } from '../models/rating';
import { HttpBaseApi } from './http-base-api';
import { ratingFromBackend, ratingSummaryFromBackend } from './backend-mappers';

@Injectable()
export class HttpRatingsApi extends RatingsApi {
  constructor(private readonly base: HttpBaseApi) {
    super();
  }

  summary(recipeId: string): Observable<RatingSummary> {
    return this.base.http.get<any>(`${this.base.baseUrl}/recipes/${recipeId}/ratings/summary`).pipe(map(ratingSummaryFromBackend));
  }

  listByRecipe(recipeId: string): Observable<Rating[]> {
    return this.base.http
      .get<any[]>(`${this.base.baseUrl}/recipes/${recipeId}/ratings`)
      .pipe(map((rows) => (rows || []).map(ratingFromBackend)));
  }

  rate(recipeId: string, value: number): Observable<RatingSummary> {
    return this.base.http
      .post<any>(`${this.base.baseUrl}/recipes/${recipeId}/ratings`, { value })
      .pipe(map(ratingSummaryFromBackend));
  }
}
