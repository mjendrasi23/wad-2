import { NgModule } from '@angular/core';

import { ManagementRoutingModule } from './management-routing-module';
import { CategoriesPage } from './pages/categories-page/categories-page';
import { ModerationPage } from './pages/moderation-page/moderation-page';
import { StatsPage } from './pages/stats-page/stats-page';
import { SharedModule } from '../../shared/shared-module';
import { CategoryDialog } from './components/category-dialog/category-dialog';
import { BaseChartDirective } from 'ng2-charts';


@NgModule({
  declarations: [
    CategoriesPage,
    ModerationPage,
    StatsPage,
    CategoryDialog
  ],
  imports: [
    SharedModule,
    BaseChartDirective,
    ManagementRoutingModule
  ]
})
export class ManagementModule { }
