import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { RecipesApi } from '../apis/recipes-api';
import { ApiError } from '../models/api-error';
import { PagedResult } from '../models/paging';
import { Recipe, RecipeDetail, RecipeListItem, RecipesListQuery, RecipeUpsert } from '../models/recipe';
import { MockApiBase } from './mock-api-base';
import { MockDbService } from './mock-db.service';
import { canCreateRecipes, currentUser, requireUser } from './mock-auth';
import { id, nowIso } from './mock-utils';

function clampPage(page: number): number {
  return Math.max(1, Math.floor(page || 1));
}

function clampPageSize(size: number): number {
  return Math.min(50, Math.max(1, Math.floor(size || 12)));
}

function normalizeText(s: string): string {
  return s.trim().toLowerCase();
}

function avg(nums: number[]): number {
  if (!nums.length) return 0;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

@Injectable()
export class MockRecipesApi extends RecipesApi {
  constructor(
    private readonly base: MockApiBase,
    private readonly dbService: MockDbService
  ) {
    super();
  }

  list(query: RecipesListQuery): Observable<PagedResult<RecipeListItem>> {
    return this.base.network(() => {
      const db = this.dbService.require();
      const actor = currentUser(db.users);

      const page = clampPage(query.page);
      const pageSize = clampPageSize(query.pageSize);

      const textSearch = query.textSearch ? normalizeText(query.textSearch) : '';
      const ingredientSearch = query.ingredientSearch ? normalizeText(query.ingredientSearch) : '';
      const tags = (query.tags ?? []).map(normalizeText).filter(Boolean);
      const minRating = query.minRating ?? 0;
      const categoryId = query.categoryId ?? '';

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

      const visible = (recipe: Recipe) => {
        if (recipe.isPublic) return true;
        if (!actor) return false;
        if (actor.role === 'admin' || actor.role === 'manager') return true;
        return actor.role === 'creator' && recipe.authorId === actor.id;
      };

      const matches = (recipe: Recipe): boolean => {
        if (!visible(recipe)) return false;
        if (categoryId && recipe.categoryId !== categoryId) return false;

        if (tags.length) {
          const recipeTags = recipe.tags.map(normalizeText);
          if (!tags.every((t) => recipeTags.includes(t))) return false;
        }

        if (textSearch) {
          const haystack = normalizeText(`${recipe.title} ${recipe.description} ${recipe.tags.join(' ')}`);
          if (!haystack.includes(textSearch)) return false;
        }

        if (ingredientSearch) {
          const haystack = normalizeText(recipe.ingredients.map((i) => i.text).join(' '));
          if (!haystack.includes(ingredientSearch)) return false;
        }

        const values = ratingByRecipeId.get(recipe.id) ?? [];
        const avgRating = avg(values);
        if (minRating && avgRating < minRating) return false;

        return true;
      };

      const items: RecipeListItem[] = db.recipes.filter(matches).map((recipe) => {
        const values = ratingByRecipeId.get(recipe.id) ?? [];
        const avgRating = avg(values);
        const ratingsCount = values.length;
        const favoritesCount = favoritesCountByRecipeId.get(recipe.id) ?? 0;

        return {
          id: recipe.id,
          title: recipe.title,
          description: recipe.description,
          imageUrl: recipe.imageUrl,
          categoryId: recipe.categoryId,
          tags: recipe.tags,
          authorId: recipe.authorId,
          createdAt: recipe.createdAt,
          views: recipe.views,
          avgRating,
          ratingsCount,
          favoritesCount,
        };
      });

      const sortDir = query.sortDir === 'asc' ? 1 : -1;
      const by = query.sortBy ?? 'newest';
      items.sort((a, b) => {
        if (by === 'rating') return sortDir * (a.avgRating - b.avgRating);
        if (by === 'popularity') {
          const ap = a.views + a.favoritesCount * 10;
          const bp = b.views + b.favoritesCount * 10;
          return sortDir * (ap - bp);
        }
        return sortDir * (new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
      });

      const total = items.length;
      const start = (page - 1) * pageSize;
      const paged = items.slice(start, start + pageSize);

      return { items: paged, total, page, pageSize };
    });
  }

  listMine(query: RecipesListQuery): Observable<PagedResult<RecipeListItem>> {
    return this.base.network(() => {
      const db = this.dbService.require();
      const actor = requireUser(db.users);
      if (!canCreateRecipes(actor)) throw new ApiError('Only creators can manage recipes.', 403, 'FORBIDDEN');

      const page = clampPage(query.page);
      const pageSize = clampPageSize(query.pageSize);

      const textSearch = query.textSearch ? normalizeText(query.textSearch) : '';
      const ingredientSearch = query.ingredientSearch ? normalizeText(query.ingredientSearch) : '';
      const tags = (query.tags ?? []).map(normalizeText).filter(Boolean);
      const minRating = query.minRating ?? 0;
      const categoryId = query.categoryId ?? '';

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

      const matches = (recipe: Recipe): boolean => {
        if (recipe.authorId !== actor.id) return false;
        if (categoryId && recipe.categoryId !== categoryId) return false;

        if (tags.length) {
          const recipeTags = recipe.tags.map(normalizeText);
          if (!tags.every((t) => recipeTags.includes(t))) return false;
        }

        if (textSearch) {
          const haystack = normalizeText(`${recipe.title} ${recipe.description} ${recipe.tags.join(' ')}`);
          if (!haystack.includes(textSearch)) return false;
        }

        if (ingredientSearch) {
          const haystack = normalizeText(recipe.ingredients.map((i) => i.text).join(' '));
          if (!haystack.includes(ingredientSearch)) return false;
        }

        const values = ratingByRecipeId.get(recipe.id) ?? [];
        const avgRating = avg(values);
        if (minRating && avgRating < minRating) return false;

        return true;
      };

      const items: RecipeListItem[] = db.recipes.filter(matches).map((recipe) => {
        const values = ratingByRecipeId.get(recipe.id) ?? [];
        const avgRating = avg(values);
        const ratingsCount = values.length;
        const favoritesCount = favoritesCountByRecipeId.get(recipe.id) ?? 0;

        return {
          id: recipe.id,
          title: recipe.title,
          description: recipe.description,
          imageUrl: recipe.imageUrl,
          categoryId: recipe.categoryId,
          tags: recipe.tags,
          authorId: recipe.authorId,
          createdAt: recipe.createdAt,
          views: recipe.views,
          avgRating,
          ratingsCount,
          favoritesCount,
        };
      });

      const sortDir = query.sortDir === 'asc' ? 1 : -1;
      const by = query.sortBy ?? 'newest';
      items.sort((a, b) => {
        if (by === 'rating') return sortDir * (a.avgRating - b.avgRating);
        if (by === 'popularity') {
          const ap = a.views + a.favoritesCount * 10;
          const bp = b.views + b.favoritesCount * 10;
          return sortDir * (ap - bp);
        }
        return sortDir * (new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
      });

      const total = items.length;
      const start = (page - 1) * pageSize;
      const paged = items.slice(start, start + pageSize);

      return { items: paged, total, page, pageSize };
    });
  }

  getById(idToGet: string): Observable<RecipeDetail> {
    return this.base.network(() => {
      const db = this.dbService.require();
      const actor = currentUser(db.users);

      const recipe = db.recipes.find((r) => r.id === idToGet);
      if (!recipe) throw new ApiError('Recipe not found.', 404, 'NOT_FOUND');

      const visible =
        recipe.isPublic ||
        (actor && (actor.role === 'admin' || actor.role === 'manager' || recipe.authorId === actor.id));
      if (!visible) throw new ApiError('Recipe not found.', 404, 'NOT_FOUND');

      const values = db.ratings.filter((r) => r.recipeId === recipe.id).map((r) => r.value);
      const avgRating = avg(values);
      const favoritesCount = db.favorites.filter((f) => f.recipeId === recipe.id).length;

      this.dbService.update((d) => {
        const found = d.recipes.find((r) => r.id === recipe.id);
        if (found) found.views += 1;
      });

      return {
        id: recipe.id,
        title: recipe.title,
        description: recipe.description,
        imageUrl: recipe.imageUrl,
        categoryId: recipe.categoryId,
        tags: recipe.tags,
        authorId: recipe.authorId,
        createdAt: recipe.createdAt,
        views: recipe.views + 1,
        avgRating,
        ratingsCount: values.length,
        favoritesCount,
        ingredients: recipe.ingredients,
        steps: recipe.steps,
        isPublic: recipe.isPublic,
      };
    });
  }

  create(request: RecipeUpsert): Observable<RecipeDetail> {
    return this.base.network(() => {
      const db = this.dbService.require();
      const actor = requireUser(db.users);
      if (!canCreateRecipes(actor)) throw new ApiError('Only creators can create recipes.', 403, 'FORBIDDEN');

      const title = request.title.trim();
      if (!title) throw new ApiError('Title is required.', 400, 'VALIDATION');
      if (!request.categoryId) throw new ApiError('Category is required.', 400, 'VALIDATION');

      const now = nowIso();
      const recipe: Recipe = {
        id: id('r', db.recipes.length + 1),
        title,
        description: request.description.trim(),
        imageUrl: request.imageUrl?.trim() || undefined,
        categoryId: request.categoryId,
        tags: (request.tags ?? []).map((t) => t.trim()).filter(Boolean),
        ingredients: request.ingredients ?? [],
        steps: request.steps ?? [],
        authorId: actor.id,
        createdAt: now,
        updatedAt: now,
        isPublic: request.isPublic,
        views: 0,
      };

      this.dbService.update((d) => {
        d.recipes.unshift(recipe);
      });

      return {
        id: recipe.id,
        title: recipe.title,
        description: recipe.description,
        imageUrl: recipe.imageUrl,
        categoryId: recipe.categoryId,
        tags: recipe.tags,
        authorId: recipe.authorId,
        createdAt: recipe.createdAt,
        views: recipe.views,
        avgRating: 0,
        ratingsCount: 0,
        favoritesCount: 0,
        ingredients: recipe.ingredients,
        steps: recipe.steps,
        isPublic: recipe.isPublic,
      };
    });
  }

  update(idToUpdate: string, request: RecipeUpsert): Observable<RecipeDetail> {
    return this.base.network(() => {
      const db = this.dbService.require();
      const actor = requireUser(db.users);
      if (!canCreateRecipes(actor)) throw new ApiError('Only creators can edit recipes.', 403, 'FORBIDDEN');

      const idx = db.recipes.findIndex((r) => r.id === idToUpdate);
      if (idx < 0) throw new ApiError('Recipe not found.', 404, 'NOT_FOUND');
      const existing = db.recipes[idx]!;
      if (existing.authorId !== actor.id) throw new ApiError('You can only edit your own recipes.', 403, 'FORBIDDEN');

      const title = request.title.trim();
      if (!title) throw new ApiError('Title is required.', 400, 'VALIDATION');

      const updated: Recipe = {
        ...existing,
        title,
        description: request.description.trim(),
        imageUrl: request.imageUrl?.trim() || undefined,
        categoryId: request.categoryId,
        tags: (request.tags ?? []).map((t) => t.trim()).filter(Boolean),
        ingredients: request.ingredients ?? [],
        steps: request.steps ?? [],
        isPublic: request.isPublic,
        updatedAt: nowIso(),
      };

      this.dbService.update((d) => {
        const i = d.recipes.findIndex((r) => r.id === idToUpdate);
        if (i >= 0) d.recipes[i] = updated;
      });

      const values = db.ratings.filter((r) => r.recipeId === updated.id).map((r) => r.value);
      const favoritesCount = db.favorites.filter((f) => f.recipeId === updated.id).length;

      return {
        id: updated.id,
        title: updated.title,
        description: updated.description,
        imageUrl: updated.imageUrl,
        categoryId: updated.categoryId,
        tags: updated.tags,
        authorId: updated.authorId,
        createdAt: updated.createdAt,
        views: updated.views,
        avgRating: avg(values),
        ratingsCount: values.length,
        favoritesCount,
        ingredients: updated.ingredients,
        steps: updated.steps,
        isPublic: updated.isPublic,
      };
    });
  }

  delete(idToDelete: string): Observable<void> {
    return this.base.network(() => {
      const db = this.dbService.require();
      const actor = requireUser(db.users);

      const recipe = db.recipes.find((r) => r.id === idToDelete);
      if (!recipe) throw new ApiError('Recipe not found.', 404, 'NOT_FOUND');

      const canDeleteAny = actor.role === 'admin' || actor.role === 'manager';
      const canDeleteOwn = actor.role === 'creator' && recipe.authorId === actor.id;

      if (!canDeleteAny && !canDeleteOwn) throw new ApiError('You do not have permission to delete this.', 403, 'FORBIDDEN');

      this.dbService.update((d) => {
        d.recipes = d.recipes.filter((r) => r.id !== idToDelete);
        d.comments = d.comments.filter((c) => c.recipeId !== idToDelete);
        d.ratings = d.ratings.filter((r) => r.recipeId !== idToDelete);
        d.favorites = d.favorites.filter((f) => f.recipeId !== idToDelete);
        d.reports = d.reports.filter((rep) => !(rep.targetType === 'recipe' && rep.targetId === idToDelete));
      });

      return undefined;
    });
  }
}
