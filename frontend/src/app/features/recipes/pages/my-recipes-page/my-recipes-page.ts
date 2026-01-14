import { Component, inject } from '@angular/core';
import { FormBuilder } from '@angular/forms';
import { BehaviorSubject, combineLatest, debounceTime, distinctUntilChanged, map, shareReplay, startWith, switchMap } from 'rxjs';
import { RecipesApi } from '../../../../api/apis/recipes-api';
import { PagedResult } from '../../../../api/models/paging';
import { RecipeListItem, RecipeSortBy, RecipesListQuery, SortDir } from '../../../../api/models/recipe';
import { ConfirmService } from '../../../../shared/services/confirm.service';

interface MyRecipesVm {
  query: RecipesListQuery;
  loading: boolean;
  result: PagedResult<RecipeListItem> | null;
}

@Component({
  selector: 'app-my-recipes-page',
  standalone: false,
  templateUrl: './my-recipes-page.html',
  styleUrl: './my-recipes-page.scss',
})
export class MyRecipesPage {
  private readonly fb = inject(FormBuilder);
  private readonly recipesApi = inject(RecipesApi);
  private readonly confirm = inject(ConfirmService);

  readonly form = this.fb.nonNullable.group({
    textSearch: this.fb.nonNullable.control(''),
    sortBy: this.fb.nonNullable.control<RecipeSortBy>('newest'),
    sortDir: this.fb.nonNullable.control<SortDir>('desc'),
  });

  private readonly pageSubject = new BehaviorSubject<{ page: number; pageSize: number }>({ page: 1, pageSize: 12 });
  readonly page$ = this.pageSubject.asObservable();

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
        textSearch: f.textSearch || undefined,
      };
      return this.recipesApi.listMine(query).pipe(
        map((result) => ({ query, result, loading: false } satisfies MyRecipesVm)),
        startWith({ query, result: null, loading: true } satisfies MyRecipesVm)
      );
    }),
    shareReplay(1)
  );

  onPageChange(pageIndex: number, pageSize: number): void {
    this.pageSubject.next({ page: pageIndex + 1, pageSize });
  }

  deleteRecipe(id: string): void {
    this.confirm
      .open({
        title: 'Delete recipe?',
        message: 'This cannot be undone.',
        confirmText: 'Delete',
        tone: 'danger',
      })
      .subscribe((ok) => {
        if (!ok) return;
        this.recipesApi.delete(id).subscribe(() => this.pageSubject.next(this.pageSubject.value));
      });
  }
}
