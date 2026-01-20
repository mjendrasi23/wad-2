export type CommentStatus = 'active' | 'removed';

export interface Comment {
  id: string;
  recipeId: string;
  authorId: string;
  authorName?: string;
  body: string;
  createdAt: string;
  status: CommentStatus;
}

export interface CommentCreate {
  recipeId: string;
  body: string;
}

