import { Observable } from 'rxjs';
import { Comment, CommentCreate } from '../models/comment';

export abstract class CommentsApi {
  abstract listByRecipe(recipeId: string): Observable<Comment[]>;
  abstract create(request: CommentCreate): Observable<Comment>;
  abstract remove(commentId: string): Observable<void>;
}

