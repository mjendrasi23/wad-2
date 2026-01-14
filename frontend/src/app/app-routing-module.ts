import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { NotFoundPage } from './core/pages/not-found-page/not-found-page';
import { HomePage } from './features/public/pages/home-page/home-page';
import { AuthorsPage } from './features/public/pages/authors-page/authors-page';
import { DocsPage } from './features/public/pages/docs-page/docs-page';
import { LoginPage } from './features/auth/pages/login-page/login-page';
import { RegisterPage } from './features/auth/pages/register-page/register-page';
import { ProfilePage } from './features/profile/pages/profile-page/profile-page';
import { FavoritesPage } from './features/profile/pages/favorites-page/favorites-page';
import { NewReportPage } from './features/reports/pages/new-report-page/new-report-page';
import { RecipesListPage } from './features/recipes/pages/recipes-list-page/recipes-list-page';
import { RecipeDetailPage } from './features/recipes/pages/recipe-detail-page/recipe-detail-page';
import { MyRecipesPage } from './features/recipes/pages/my-recipes-page/my-recipes-page';
import { RecipeFormPage } from './features/recipes/pages/recipe-form-page/recipe-form-page';
import { CategoriesPage } from './features/management/pages/categories-page/categories-page';
import { ModerationPage } from './features/management/pages/moderation-page/moderation-page';
import { StatsPage } from './features/management/pages/stats-page/stats-page';
import { UsersPage } from './features/admin/pages/users-page/users-page';
import { AuthGuard } from './core/guards/auth-guard';
import { RoleGuard } from './core/guards/role-guard';

const routes: Routes = [
  { path: '', component: HomePage, pathMatch: 'full' },
  { path: 'recipes', component: RecipesListPage },
  { path: 'recipes/new', component: RecipeFormPage, canActivate: [AuthGuard, RoleGuard], data: { roles: ['creator'] } },
  { path: 'recipes/:id/edit', component: RecipeFormPage, canActivate: [AuthGuard, RoleGuard], data: { roles: ['creator'] } },
  { path: 'recipes/:id', component: RecipeDetailPage },
  { path: 'my-recipes', component: MyRecipesPage, canActivate: [AuthGuard, RoleGuard], data: { roles: ['creator'] } },
  { path: 'favorites', component: FavoritesPage, canActivate: [AuthGuard, RoleGuard], data: { roles: ['explorer', 'creator'] } },
  { path: 'profile', component: ProfilePage, canActivate: [AuthGuard] },
  { path: 'reports/new', component: NewReportPage, canActivate: [AuthGuard, RoleGuard], data: { roles: ['explorer', 'creator'] } },
  { path: 'management/categories', component: CategoriesPage, canActivate: [AuthGuard, RoleGuard], data: { roles: ['manager', 'admin'] } },
  { path: 'management/moderation', component: ModerationPage, canActivate: [AuthGuard, RoleGuard], data: { roles: ['manager', 'admin'] } },
  { path: 'management/stats', component: StatsPage, canActivate: [AuthGuard, RoleGuard], data: { roles: ['manager', 'admin'] } },
  { path: 'admin/users', component: UsersPage, canActivate: [AuthGuard, RoleGuard], data: { roles: ['admin'] } },
  { path: 'login', component: LoginPage },
  { path: 'register', component: RegisterPage },
  { path: 'authors', component: AuthorsPage },
  { path: 'docs', component: DocsPage },
  { path: '**', component: NotFoundPage },
];

@NgModule({
  imports: [
    RouterModule.forRoot(routes, {
      scrollPositionRestoration: 'enabled',
      anchorScrolling: 'enabled',
    }),
  ],
  exports: [RouterModule]
})
export class AppRoutingModule { }
