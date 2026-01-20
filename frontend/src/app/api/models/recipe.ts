export interface RecipeIngredient {
  text: string;
}

export interface ImageCrop {
  originX: number;
  originY: number;
  zoom: number;
}

export interface Recipe {
  id: string;
  title: string;
  description: string;
  imageUrl?: string;
  imageCrop?: ImageCrop;
  categoryId: string;
  tags: string[];
  ingredients: RecipeIngredient[];
  steps: string[];
  authorId: string;
  createdAt: string;
  updatedAt: string;
  isPublic: boolean;
  views: number;
}

export interface RecipeListItem {
  id: string;
  title: string;
  description: string;
  imageUrl?: string;
  imageCrop?: ImageCrop;
  categoryId: string;
  tags: string[];
  authorId: string;
  createdAt: string;
  views: number;
  avgRating: number;
  ratingsCount: number;
  favoritesCount: number;
}

export interface RecipeDetail extends RecipeListItem {
  ingredients: RecipeIngredient[];
  steps: string[];
  isPublic: boolean;
}

export interface RecipeUpsert {
  title: string;
  description: string;
  imageUrl?: string;
  imageCrop?: ImageCrop;
  categoryId: string;
  tags: string[];
  ingredients: RecipeIngredient[];
  steps: string[];
  isPublic: boolean;
}

export type RecipeSortBy = 'rating' | 'newest' | 'popularity';
export type SortDir = 'asc' | 'desc';

export interface RecipesListQuery {
  page: number;
  pageSize: number;
  sortBy: RecipeSortBy;
  sortDir: SortDir;
  categoryId?: string;
  tags?: string[];
  ingredientSearch?: string;
  minRating?: number;
  textSearch?: string;
}
