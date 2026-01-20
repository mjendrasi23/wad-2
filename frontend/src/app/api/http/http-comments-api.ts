import { Injectable } from '@angular/core';
import { Observable, map } from 'rxjs';
import { CommentsApi } from '../apis/comments-api';
import { Comment, CommentCreate } from '../models/comment';
import { HttpBaseApi } from './http-base-api';
import { commentFromBackend } from './backend-mappers';

@Injectable()
export class HttpCommentsApi extends CommentsApi {
  constructor(private readonly base: HttpBaseApi) {
    super();
  }

  listByRecipe(recipeId: string): Observable<Comment[]> {
    return this.base.http
      .get<any[]>(`${this.base.baseUrl}/recipes/${recipeId}/comments`)
      .pipe(map((rows) => (rows || []).map(commentFromBackend)));
  }

  create(request: CommentCreate): Observable<Comment> {
    return this.base.http
      .post<any>(`${this.base.baseUrl}/recipes/${request.recipeId}/comments`, request)
      .pipe(map(commentFromBackend));
  }

  remove(commentId: string): Observable<void> {
    return this.base.http.delete<void>(`${this.base.baseUrl}/comments/${commentId}`);
  }
}

