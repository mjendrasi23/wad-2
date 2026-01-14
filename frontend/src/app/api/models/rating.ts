export interface Rating {
  id: string;
  recipeId: string;
  userId: string;
  value: number;
  createdAt: string;
}

export interface RatingSummary {
  recipeId: string;
  avgRating: number;
  count: number;
  myRating?: number;
}

