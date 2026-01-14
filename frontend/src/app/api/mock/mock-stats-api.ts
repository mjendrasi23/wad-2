import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { StatsApi } from '../apis/stats-api';
import { CategoryCountStat, CategoryRatingStat } from '../models/stats';
import { MockApiBase } from './mock-api-base';
import { MockDbService } from './mock-db.service';

function avg(nums: number[]): number {
  if (!nums.length) return 0;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

@Injectable()
export class MockStatsApi extends StatsApi {
  constructor(
    private readonly base: MockApiBase,
    private readonly dbService: MockDbService
  ) {
    super();
  }

  mostPopularCategories(): Observable<CategoryCountStat[]> {
    return this.base.network(() => {
      const db = this.dbService.require();
      const counts = new Map<string, number>();
      for (const recipe of db.recipes.filter((r) => r.isPublic)) {
        counts.set(recipe.categoryId, (counts.get(recipe.categoryId) ?? 0) + 1);
      }

      const items = db.categories.map((c) => ({
        categoryId: c.id,
        categoryName: c.name,
        recipeCount: counts.get(c.id) ?? 0,
      }));

      items.sort((a, b) => b.recipeCount - a.recipeCount);
      return items;
    });
  }

  averageRatingPerCategory(): Observable<CategoryRatingStat[]> {
    return this.base.network(() => {
      const db = this.dbService.require();

      const recipeById = new Map(db.recipes.map((r) => [r.id, r]));
      const byCategory = new Map<string, number[]>();
      const countByCategory = new Map<string, number>();

      for (const rating of db.ratings) {
        const recipe = recipeById.get(rating.recipeId);
        if (!recipe || !recipe.isPublic) continue;
        const list = byCategory.get(recipe.categoryId) ?? [];
        list.push(rating.value);
        byCategory.set(recipe.categoryId, list);
        countByCategory.set(recipe.categoryId, (countByCategory.get(recipe.categoryId) ?? 0) + 1);
      }

      const items = db.categories.map((c) => {
        const values = byCategory.get(c.id) ?? [];
        return {
          categoryId: c.id,
          categoryName: c.name,
          avgRating: avg(values),
          ratingsCount: countByCategory.get(c.id) ?? 0,
        };
      });

      items.sort((a, b) => b.avgRating - a.avgRating);
      return items;
    });
  }
}

