import { Observable } from 'rxjs';
import { Rating, RatingSummary } from '../models/rating';

export abstract class RatingsApi {
  abstract summary(recipeId: string): Observable<RatingSummary>;
  abstract listByRecipe(recipeId: string): Observable<Rating[]>;
  abstract rate(recipeId: string, value: number): Observable<RatingSummary>;
}
