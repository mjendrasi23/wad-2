import { Observable } from 'rxjs';
import { PagedResult } from '../models/paging';
import { RecipeListItem, RecipesListQuery } from '../models/recipe';

export abstract class FavoritesApi {
  abstract listMyFavorites(query: RecipesListQuery): Observable<PagedResult<RecipeListItem>>;
  abstract toggle(recipeId: string): Observable<{ isFavorite: boolean }>;
  abstract isFavorite(recipeId: string): Observable<boolean>;
}

