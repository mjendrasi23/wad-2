import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { CommentsApi } from '../apis/comments-api';
import { ApiError } from '../models/api-error';
import { Comment, CommentCreate } from '../models/comment';
import { MockApiBase } from './mock-api-base';
import { MockDbService } from './mock-db.service';
import { canExplore, currentUser, requireUser } from './mock-auth';
import { id, nowIso } from './mock-utils';

@Injectable()
export class MockCommentsApi extends CommentsApi {
  constructor(
    private readonly base: MockApiBase,
    private readonly dbService: MockDbService
  ) {
    super();
  }

  listByRecipe(recipeId: string): Observable<Comment[]> {
    return this.base.network(() => {
      const db = this.dbService.require();
      const actor = currentUser(db.users);

      const recipe = db.recipes.find((r) => r.id === recipeId);
      if (!recipe) throw new ApiError('Recipe not found.', 404, 'NOT_FOUND');

      const visible =
        recipe.isPublic ||
        (actor && (actor.role === 'admin' || actor.role === 'manager' || recipe.authorId === actor.id));
      if (!visible) throw new ApiError('Recipe not found.', 404, 'NOT_FOUND');

      return db.comments
        .filter((c) => c.recipeId === recipeId)
        .slice()
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    });
  }

  create(request: CommentCreate): Observable<Comment> {
    return this.base.network(() => {
      const db = this.dbService.require();
      const actor = requireUser(db.users);
      if (!canExplore(actor)) throw new ApiError('Comments are not available for this role.', 403, 'FORBIDDEN');

      const recipe = db.recipes.find((r) => r.id === request.recipeId);
      if (!recipe || !recipe.isPublic) throw new ApiError('Recipe not found.', 404, 'NOT_FOUND');

      const body = request.body.trim();
      if (!body) throw new ApiError('Comment cannot be empty.', 400, 'VALIDATION');

      const comment: Comment = {
        id: id('com', db.comments.length + 1),
        recipeId: request.recipeId,
        authorId: actor.id,
        body,
        createdAt: nowIso(),
        status: 'active',
      };

      this.dbService.update((d) => d.comments.unshift(comment));
      return comment;
    });
  }

  remove(commentId: string): Observable<void> {
    return this.base.network(() => {
      const db = this.dbService.require();
      const actor = requireUser(db.users);

      const comment = db.comments.find((c) => c.id === commentId);
      if (!comment) throw new ApiError('Comment not found.', 404, 'NOT_FOUND');

      const recipe = db.recipes.find((r) => r.id === comment.recipeId);
      if (!recipe) throw new ApiError('Comment not found.', 404, 'NOT_FOUND');

      const canModerate = actor.role === 'admin' || actor.role === 'manager';
      const canRemoveOwn = comment.authorId === actor.id;
      const canRemoveOnOwnRecipe = actor.role === 'creator' && recipe.authorId === actor.id;

      if (!canModerate && !canRemoveOwn && !canRemoveOnOwnRecipe) {
        throw new ApiError('You do not have permission to remove this comment.', 403, 'FORBIDDEN');
      }

      this.dbService.update((d) => {
        const c = d.comments.find((x) => x.id === commentId);
        if (c) c.status = 'removed';
      });

      return undefined;
    });
  }
}

