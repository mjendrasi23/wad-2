import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClientModule } from '@angular/common/http';
import { environment } from '../../environments/environment';

import { AuthApi } from './apis/auth-api';
import { CategoriesApi } from './apis/categories-api';
import { CommentsApi } from './apis/comments-api';
import { FavoritesApi } from './apis/favorites-api';
import { MaintenanceApi } from './apis/maintenance-api';
import { RatingsApi } from './apis/ratings-api';
import { RecipesApi } from './apis/recipes-api';
import { ReportsApi } from './apis/reports-api';
import { StatsApi } from './apis/stats-api';
import { UsersApi } from './apis/users-api';
import { UploadsApi } from './apis/uploads-api';

import { MockAuthApi } from './mock/mock-auth-api';
import { MockCategoriesApi } from './mock/mock-categories-api';
import { MockCommentsApi } from './mock/mock-comments-api';
import { MockFavoritesApi } from './mock/mock-favorites-api';
import { MockMaintenanceApi } from './mock/mock-maintenance-api';
import { MockRatingsApi } from './mock/mock-ratings-api';
import { MockRecipesApi } from './mock/mock-recipes-api';
import { MockReportsApi } from './mock/mock-reports-api';
import { MockStatsApi } from './mock/mock-stats-api';
import { MockUsersApi } from './mock/mock-users-api';
import { MockUploadsApi } from './mock/mock-uploads-api';

import { HttpAuthApi } from './http/http-auth-api';
import { HttpCategoriesApi } from './http/http-categories-api';
import { HttpCommentsApi } from './http/http-comments-api';
import { HttpFavoritesApi } from './http/http-favorites-api';
import { HttpMaintenanceApi } from './http/http-maintenance-api';
import { HttpRatingsApi } from './http/http-ratings-api';
import { HttpRecipesApi } from './http/http-recipes-api';
import { HttpReportsApi } from './http/http-reports-api';
import { HttpStatsApi } from './http/http-stats-api';
import { HttpUsersApi } from './http/http-users-api';
import { HttpUploadsApi } from './http/http-uploads-api';



@NgModule({
  declarations: [],
  imports: [
    CommonModule,
    HttpClientModule,
  ],
  providers: [
    { provide: AuthApi, useClass: environment.useMockApi ? MockAuthApi : HttpAuthApi },
    { provide: RecipesApi, useClass: environment.useMockApi ? MockRecipesApi : HttpRecipesApi },
    { provide: CategoriesApi, useClass: environment.useMockApi ? MockCategoriesApi : HttpCategoriesApi },
    { provide: UsersApi, useClass: environment.useMockApi ? MockUsersApi : HttpUsersApi },
    { provide: FavoritesApi, useClass: environment.useMockApi ? MockFavoritesApi : HttpFavoritesApi },
    { provide: CommentsApi, useClass: environment.useMockApi ? MockCommentsApi : HttpCommentsApi },
    { provide: RatingsApi, useClass: environment.useMockApi ? MockRatingsApi : HttpRatingsApi },
    { provide: ReportsApi, useClass: environment.useMockApi ? MockReportsApi : HttpReportsApi },
    { provide: StatsApi, useClass: environment.useMockApi ? MockStatsApi : HttpStatsApi },
    { provide: MaintenanceApi, useClass: environment.useMockApi ? MockMaintenanceApi : HttpMaintenanceApi },
    { provide: UploadsApi, useClass: environment.useMockApi ? MockUploadsApi : HttpUploadsApi },
  ],
})
export class ApiModule { }
