import { NgModule } from '@angular/core';

import { RecipesRoutingModule } from './recipes-routing-module';
import { RecipesListPage } from './pages/recipes-list-page/recipes-list-page';
import { RecipeDetailPage } from './pages/recipe-detail-page/recipe-detail-page';
import { MyRecipesPage } from './pages/my-recipes-page/my-recipes-page';
import { RecipeFormPage } from './pages/recipe-form-page/recipe-form-page';
import { SharedModule } from '../../shared/shared-module';


@NgModule({
  declarations: [
    RecipesListPage,
    RecipeDetailPage,
    MyRecipesPage,
    RecipeFormPage
  ],
  imports: [
    SharedModule,
    RecipesRoutingModule
  ]
})
export class RecipesModule { }
