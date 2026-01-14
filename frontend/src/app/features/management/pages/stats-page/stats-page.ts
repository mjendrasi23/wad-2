import { Component, inject } from '@angular/core';
import { ChartConfiguration, ChartOptions } from 'chart.js';
import { map, shareReplay } from 'rxjs';
import { StatsApi } from '../../../../api/apis/stats-api';

@Component({
  selector: 'app-stats-page',
  standalone: false,
  templateUrl: './stats-page.html',
  styleUrl: './stats-page.scss',
})
export class StatsPage {
  private readonly statsApi = inject(StatsApi);

  readonly popular$ = this.statsApi.mostPopularCategories().pipe(shareReplay(1));
  readonly rating$ = this.statsApi.averageRatingPerCategory().pipe(shareReplay(1));

  readonly barOptions: ChartOptions<'bar'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
    },
    scales: {
      x: { ticks: { color: '#6b7280' } },
      y: { ticks: { color: '#6b7280' } },
    },
  };

  readonly popularChart$ = this.popular$.pipe(
    map((items) => {
      return {
        type: 'bar' as const,
        data: {
          labels: items.map((i) => i.categoryName),
          datasets: [{ data: items.map((i) => i.recipeCount), label: 'Recipes' }],
        } satisfies ChartConfiguration<'bar'>['data'],
      };
    })
  );

  readonly ratingChart$ = this.rating$.pipe(
    map((items) => {
      return {
        type: 'bar' as const,
        data: {
          labels: items.map((i) => i.categoryName),
          datasets: [{ data: items.map((i) => Number(i.avgRating.toFixed(2))), label: 'Avg rating' }],
        } satisfies ChartConfiguration<'bar'>['data'],
      };
    })
  );
}
