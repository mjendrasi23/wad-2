import { Observable } from 'rxjs';
import { PagedResult } from '../models/paging';
import { RecipeDetail, RecipeListItem, RecipesListQuery, RecipeUpsert } from '../models/recipe';

export abstract class RecipesApi {
  abstract list(query: RecipesListQuery): Observable<PagedResult<RecipeListItem>>;
  abstract listMine(query: RecipesListQuery): Observable<PagedResult<RecipeListItem>>;
  abstract getById(id: string): Observable<RecipeDetail>;
  abstract create(request: RecipeUpsert): Observable<RecipeDetail>;
  abstract update(id: string, request: RecipeUpsert): Observable<RecipeDetail>;
  abstract delete(id: string): Observable<void>;
}
