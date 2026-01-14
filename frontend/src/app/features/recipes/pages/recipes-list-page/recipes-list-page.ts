import { Component, inject } from '@angular/core';
import { FormBuilder } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { BehaviorSubject, combineLatest, debounceTime, distinctUntilChanged, map, shareReplay, startWith, switchMap } from 'rxjs';
import { CategoriesApi } from '../../../../api/apis/categories-api';
import { RecipesApi } from '../../../../api/apis/recipes-api';
import { Category } from '../../../../api/models/category';
import { PagedResult } from '../../../../api/models/paging';
import { RecipeListItem, RecipeSortBy, RecipesListQuery, SortDir } from '../../../../api/models/recipe';

export interface RecipesListVm {
  query: RecipesListQuery;
  loading: boolean;
  result: PagedResult<RecipeListItem> | null;
}

@Component({
  selector: 'app-recipes-list-page',
  standalone: false,
  templateUrl: './recipes-list-page.html',
  styleUrl: './recipes-list-page.scss',
})
export class RecipesListPage {
  private readonly fb = inject(FormBuilder);
  private readonly recipesApi = inject(RecipesApi);
  private readonly categoriesApi = inject(CategoriesApi);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  view: 'grid' | 'table' = 'grid';

  readonly form = this.fb.nonNullable.group({
    sortBy: this.fb.nonNullable.control<RecipeSortBy>('newest'),
    sortDir: this.fb.nonNullable.control<SortDir>('desc'),
    categoryId: this.fb.nonNullable.control<string>(''),
    minRating: this.fb.nonNullable.control<number>(0),
    textSearch: this.fb.nonNullable.control<string>(''),
    ingredientSearch: this.fb.nonNullable.control<string>(''),
    tags: this.fb.nonNullable.control<string>(''),
  });

  private readonly pageSubject = new BehaviorSubject<{ page: number; pageSize: number }>({ page: 1, pageSize: 12 });
  readonly page$ = this.pageSubject.asObservable();

  readonly categories$ = this.categoriesApi.list().pipe(shareReplay(1));
  readonly categoriesById$ = this.categories$.pipe(
    map((cats) => new Map(cats.map((c) => [c.id, c]))),
    shareReplay(1)
  );

  readonly vm$ = combineLatest([
    this.form.valueChanges.pipe(
      startWith(this.form.getRawValue()),
      debounceTime(150),
      map(() => this.form.getRawValue()),
      distinctUntilChanged((a, b) => JSON.stringify(a) === JSON.stringify(b))
    ),
    this.page$,
  ]).pipe(
    switchMap(([f, p]) => {
      const query: RecipesListQuery = {
        page: p.page,
        pageSize: p.pageSize,
        sortBy: f.sortBy,
        sortDir: f.sortDir,
        categoryId: f.categoryId || undefined,
        tags: parseTags(f.tags),
        ingredientSearch: f.ingredientSearch || undefined,
        minRating: f.minRating || undefined,
        textSearch: f.textSearch || undefined,
      };

      return this.recipesApi.list(query).pipe(
        map((result) => ({ query, result, loading: false } satisfies RecipesListVm)),
        startWith({ query, result: null, loading: true } satisfies RecipesListVm)
      );
    }),
    shareReplay(1)
  );

  constructor() {
    const qp = this.route.snapshot.queryParamMap;
    const q = qp.get('q') ?? '';
    const categoryId = qp.get('categoryId') ?? '';
    const tags = qp.get('tags') ?? '';

    if (q || categoryId || tags) {
      this.form.patchValue({ textSearch: q, categoryId, tags }, { emitEvent: false });
    }
  }

  onPageChange(pageIndex: number, pageSize: number): void {
    this.pageSubject.next({ page: pageIndex + 1, pageSize });
  }

  clear(): void {
    this.form.reset({
      sortBy: 'newest',
      sortDir: 'desc',
      categoryId: '',
      minRating: 0,
      textSearch: '',
      ingredientSearch: '',
      tags: '',
    });
    void this.router.navigate([], { queryParams: {}, queryParamsHandling: '' });
  }
}

function parseTags(input: string): string[] | undefined {
  const tags = input
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean);
  return tags.length ? tags : undefined;
}
