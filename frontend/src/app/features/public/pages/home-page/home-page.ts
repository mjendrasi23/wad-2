import { Component, inject } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { forkJoin, map, shareReplay, startWith } from 'rxjs';
import { RecipesApi } from '../../../../api/apis/recipes-api';
import { RecipesListQuery } from '../../../../api/models/recipe';

@Component({
  selector: 'app-home-page',
  standalone: false,
  templateUrl: './home-page.html',
  styleUrl: './home-page.scss',
})
export class HomePage {
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly recipesApi = inject(RecipesApi);

  readonly searchForm = this.fb.nonNullable.group({
    q: this.fb.nonNullable.control('', [Validators.maxLength(80)]),
  });

  private readonly baseQuery: RecipesListQuery = {
    page: 1,
    pageSize: 6,
    sortBy: 'popularity',
    sortDir: 'desc',
  };

  readonly vm$ = forkJoin({
    featured: this.recipesApi.list({ ...this.baseQuery, sortBy: 'popularity', sortDir: 'desc' }),
    topRated: this.recipesApi.list({ ...this.baseQuery, sortBy: 'rating', sortDir: 'desc' }),
  }).pipe(shareReplay(1));

  readonly popularTags$ = this.vm$.pipe(
    map(({ featured, topRated }) => {
      const tags = [...featured.items, ...topRated.items].flatMap((r) => r.tags);
      const counts = new Map<string, number>();
      for (const t of tags) counts.set(t, (counts.get(t) ?? 0) + 1);
      return [...counts.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 12)
        .map(([tag]) => tag);
    }),
    startWith([] as string[])
  );

  submitSearch(): void {
    const q = this.searchForm.controls.q.value.trim();
    void this.router.navigate(['/recipes'], { queryParams: q ? { q } : {} });
  }
}
