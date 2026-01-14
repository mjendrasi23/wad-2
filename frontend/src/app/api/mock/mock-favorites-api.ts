import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { FavoritesApi } from '../apis/favorites-api';
import { ApiError } from '../models/api-error';
import { PagedResult } from '../models/paging';
import { RecipeListItem, RecipesListQuery } from '../models/recipe';
import { MockApiBase } from './mock-api-base';
import { MockDbService } from './mock-db.service';
import { canExplore, currentUser, requireUser } from './mock-auth';
import { id, nowIso } from './mock-utils';

function avg(nums: number[]): number {
  if (!nums.length) return 0;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

@Injectable()
export class MockFavoritesApi extends FavoritesApi {
  constructor(
    private readonly base: MockApiBase,
    private readonly dbService: MockDbService
  ) {
    super();
  }

  listMyFavorites(query: RecipesListQuery): Observable<PagedResult<RecipeListItem>> {
    return this.base.network(() => {
      const db = this.dbService.require();
      const actor = requireUser(db.users);
      if (!canExplore(actor)) throw new ApiError('Favorites are not available for this role.', 403, 'FORBIDDEN');

      const myFavIds = new Set(db.favorites.filter((f) => f.userId === actor.id).map((f) => f.recipeId));

      const ratingByRecipeId = new Map<string, number[]>();
      for (const r of db.ratings) {
        const list = ratingByRecipeId.get(r.recipeId) ?? [];
        list.push(r.value);
        ratingByRecipeId.set(r.recipeId, list);
      }

      const favoritesCountByRecipeId = new Map<string, number>();
      for (const f of db.favorites) {
        favoritesCountByRecipeId.set(f.recipeId, (favoritesCountByRecipeId.get(f.recipeId) ?? 0) + 1);
      }

      const all = db.recipes
        .filter((r) => r.isPublic && myFavIds.has(r.id))
        .map((r) => {
          const values = ratingByRecipeId.get(r.id) ?? [];
          const favoritesCount = favoritesCountByRecipeId.get(r.id) ?? 0;
          return {
            id: r.id,
            title: r.title,
            description: r.description,
            imageUrl: r.imageUrl,
            categoryId: r.categoryId,
            tags: r.tags,
            authorId: r.authorId,
            createdAt: r.createdAt,
            views: r.views,
            avgRating: avg(values),
            ratingsCount: values.length,
            favoritesCount,
          } satisfies RecipeListItem;
        });

      const page = Math.max(1, Math.floor(query.page || 1));
      const pageSize = Math.min(50, Math.max(1, Math.floor(query.pageSize || 12)));
      const total = all.length;
      const start = (page - 1) * pageSize;
      const items = all.slice(start, start + pageSize);

      return { items, total, page, pageSize };
    });
  }

  toggle(recipeId: string): Observable<{ isFavorite: boolean }> {
    return this.base.network(() => {
      const db = this.dbService.require();
      const actor = requireUser(db.users);
      if (!canExplore(actor)) throw new ApiError('Favorites are not available for this role.', 403, 'FORBIDDEN');

      const recipe = db.recipes.find((r) => r.id === recipeId);
      if (!recipe || !recipe.isPublic) throw new ApiError('Recipe not found.', 404, 'NOT_FOUND');

      const existing = db.favorites.find((f) => f.recipeId === recipeId && f.userId === actor.id);
      if (existing) {
        this.dbService.update((d) => {
          d.favorites = d.favorites.filter((f) => f.id !== existing.id);
        });
        return { isFavorite: false };
      }

      this.dbService.update((d) => {
        d.favorites.push({
          id: id('fav', d.favorites.length + 1),
          recipeId,
          userId: actor.id,
          createdAt: nowIso(),
        });
      });

      return { isFavorite: true };
    });
  }

  isFavorite(recipeId: string): Observable<boolean> {
    return this.base.network(() => {
      const db = this.dbService.require();
      const actor = currentUser(db.users);
      if (!actor) return false;
      return db.favorites.some((f) => f.recipeId === recipeId && f.userId === actor.id);
    });
  }
}
