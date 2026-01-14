import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { CommentsApi } from '../apis/comments-api';
import { Comment, CommentCreate } from '../models/comment';
import { HttpBaseApi } from './http-base-api';

@Injectable()
export class HttpCommentsApi extends CommentsApi {
  constructor(private readonly base: HttpBaseApi) {
    super();
  }

  listByRecipe(recipeId: string): Observable<Comment[]> {
    return this.base.http.get<Comment[]>(`${this.base.baseUrl}/recipes/${recipeId}/comments`);
  }

  create(request: CommentCreate): Observable<Comment> {
    return this.base.http.post<Comment>(`${this.base.baseUrl}/recipes/${request.recipeId}/comments`, request);
  }

  remove(commentId: string): Observable<void> {
    return this.base.http.delete<void>(`${this.base.baseUrl}/comments/${commentId}`);
  }
}

