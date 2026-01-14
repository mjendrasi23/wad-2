import { Observable } from 'rxjs';
import { Category } from '../models/category';

export interface CategoryUpsert {
  name: string;
  description: string;
  imageUrl?: string;
}

export abstract class CategoriesApi {
  abstract list(): Observable<Category[]>;
  abstract create(request: CategoryUpsert): Observable<Category>;
  abstract update(id: string, request: CategoryUpsert): Observable<Category>;
  abstract delete(id: string): Observable<void>;
}

