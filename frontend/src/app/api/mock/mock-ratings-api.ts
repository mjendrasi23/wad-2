import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { RatingsApi } from '../apis/ratings-api';
import { ApiError } from '../models/api-error';
import { Rating, RatingSummary } from '../models/rating';
import { MockApiBase } from './mock-api-base';
import { MockDbService } from './mock-db.service';
import { canExplore, currentUser, requireUser } from './mock-auth';
import { id, nowIso } from './mock-utils';

function avg(nums: number[]): number {
  if (!nums.length) return 0;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

@Injectable()
export class MockRatingsApi extends RatingsApi {
  constructor(
    private readonly base: MockApiBase,
    private readonly dbService: MockDbService
  ) {
    super();
  }

  summary(recipeId: string): Observable<RatingSummary> {
    return this.base.network(() => {
      const db = this.dbService.require();
      const actor = currentUser(db.users);

      const recipe = db.recipes.find((r) => r.id === recipeId);
      if (!recipe) throw new ApiError('Recipe not found.', 404, 'NOT_FOUND');

      const visible =
        recipe.isPublic || (actor && (actor.role === 'admin' || actor.role === 'manager' || recipe.authorId === actor.id));
      if (!visible) throw new ApiError('Recipe not found.', 404, 'NOT_FOUND');

      const all = db.ratings.filter((r) => r.recipeId === recipeId);
      const values = all.map((r) => r.value);
      const my = actor ? all.find((r) => r.userId === actor.id)?.value : undefined;

      return { recipeId, avgRating: avg(values), count: values.length, myRating: my };
    });
  }

  listByRecipe(recipeId: string): Observable<Rating[]> {
    return this.base.network(() => {
      const db = this.dbService.require();
      const actor = currentUser(db.users);

      const recipe = db.recipes.find((r) => r.id === recipeId);
      if (!recipe) throw new ApiError('Recipe not found.', 404, 'NOT_FOUND');

      const visible =
        recipe.isPublic || (actor && (actor.role === 'admin' || actor.role === 'manager' || recipe.authorId === actor.id));
      if (!visible) throw new ApiError('Recipe not found.', 404, 'NOT_FOUND');

      return db.ratings.filter((r) => r.recipeId === recipeId).slice();
    });
  }

  rate(recipeId: string, value: number): Observable<RatingSummary> {
    return this.base.network(() => {
      const db = this.dbService.require();
      const actor = requireUser(db.users);
      if (!canExplore(actor)) throw new ApiError('Ratings are not available for this role.', 403, 'FORBIDDEN');

      const recipe = db.recipes.find((r) => r.id === recipeId);
      if (!recipe || !recipe.isPublic) throw new ApiError('Recipe not found.', 404, 'NOT_FOUND');

      const v = Math.floor(value);
      if (v < 1 || v > 5) throw new ApiError('Rating must be between 1 and 5.', 400, 'VALIDATION');

      this.dbService.update((d) => {
        const existing = d.ratings.find((r) => r.recipeId === recipeId && r.userId === actor.id);
        if (existing) {
          existing.value = v;
          return;
        }
        d.ratings.push({ id: id('rate', d.ratings.length + 1), recipeId, userId: actor.id, value: v, createdAt: nowIso() });
      });

      const all = this.dbService.require().ratings.filter((r) => r.recipeId === recipeId);
      const values = all.map((r) => r.value);
      const my = all.find((r) => r.userId === actor.id)?.value;

      return { recipeId, avgRating: avg(values), count: values.length, myRating: my };
    });
  }
}
