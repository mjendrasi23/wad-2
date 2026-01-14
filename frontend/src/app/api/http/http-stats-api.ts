import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { StatsApi } from '../apis/stats-api';
import { CategoryCountStat, CategoryRatingStat } from '../models/stats';
import { HttpBaseApi } from './http-base-api';

@Injectable()
export class HttpStatsApi extends StatsApi {
  constructor(private readonly base: HttpBaseApi) {
    super();
  }

  mostPopularCategories(): Observable<CategoryCountStat[]> {
    return this.base.http.get<CategoryCountStat[]>(`${this.base.baseUrl}/stats/categories/popular`);
  }

  averageRatingPerCategory(): Observable<CategoryRatingStat[]> {
    return this.base.http.get<CategoryRatingStat[]>(`${this.base.baseUrl}/stats/categories/ratings`);
  }
}

