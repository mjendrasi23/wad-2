import { Observable } from 'rxjs';
import { CategoryCountStat, CategoryRatingStat } from '../models/stats';

export abstract class StatsApi {
  abstract mostPopularCategories(): Observable<CategoryCountStat[]>;
  abstract averageRatingPerCategory(): Observable<CategoryRatingStat[]>;
}

