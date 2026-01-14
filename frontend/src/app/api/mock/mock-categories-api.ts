import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { CategoriesApi, CategoryUpsert } from '../apis/categories-api';
import { ApiError } from '../models/api-error';
import { Category } from '../models/category';
import { MockApiBase } from './mock-api-base';
import { MockDbService } from './mock-db.service';
import { id, nowIso } from './mock-utils';
import { requireRole, requireUser } from './mock-auth';

@Injectable()
export class MockCategoriesApi extends CategoriesApi {
  constructor(
    private readonly base: MockApiBase,
    private readonly dbService: MockDbService
  ) {
    super();
  }

  list(): Observable<Category[]> {
    return this.base.network(() => this.dbService.require().categories.slice());
  }

  create(request: CategoryUpsert): Observable<Category> {
    return this.base.network(() => {
      const db = this.dbService.require();
      const actor = requireUser(db.users);
      requireRole(actor, ['manager', 'admin']);

      const name = request.name.trim();
      if (!name) throw new ApiError('Category name is required.', 400, 'VALIDATION');
      if (db.categories.some((c) => c.name.toLowerCase() === name.toLowerCase())) {
        throw new ApiError('A category with that name already exists.', 409, 'DUPLICATE');
      }

      const category: Category = {
        id: id('c', db.categories.length + 1),
        name,
        description: request.description.trim(),
        imageUrl: request.imageUrl?.trim() || undefined,
        createdAt: nowIso(),
      };

      this.dbService.update((d) => d.categories.unshift(category));
      return category;
    });
  }

  update(idToUpdate: string, request: CategoryUpsert): Observable<Category> {
    return this.base.network(() => {
      const db = this.dbService.require();
      const actor = requireUser(db.users);
      requireRole(actor, ['manager', 'admin']);

      const idx = db.categories.findIndex((c) => c.id === idToUpdate);
      if (idx < 0) throw new ApiError('Category not found.', 404, 'NOT_FOUND');

      const name = request.name.trim();
      if (!name) throw new ApiError('Category name is required.', 400, 'VALIDATION');

      if (db.categories.some((c) => c.id !== idToUpdate && c.name.toLowerCase() === name.toLowerCase())) {
        throw new ApiError('A category with that name already exists.', 409, 'DUPLICATE');
      }

      const updated: Category = {
        ...db.categories[idx]!,
        name,
        description: request.description.trim(),
        imageUrl: request.imageUrl?.trim() || undefined,
      };

      this.dbService.update((d) => {
        d.categories[idx] = updated;
      });

      return updated;
    });
  }

  delete(idToDelete: string): Observable<void> {
    return this.base.network(() => {
      const db = this.dbService.require();
      const actor = requireUser(db.users);
      requireRole(actor, ['manager', 'admin']);

      if (db.recipes.some((r) => r.categoryId === idToDelete)) {
        throw new ApiError('This category is used by existing recipes.', 409, 'CATEGORY_IN_USE');
      }

      const next = this.dbService.update((d) => {
        d.categories = d.categories.filter((c) => c.id !== idToDelete);
      });

      if (next.categories.length === db.categories.length) throw new ApiError('Category not found.', 404, 'NOT_FOUND');
      return undefined;
    });
  }
}

