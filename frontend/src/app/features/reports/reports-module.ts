import { NgModule } from '@angular/core';

import { ReportsRoutingModule } from './reports-routing-module';
import { NewReportPage } from './pages/new-report-page/new-report-page';
import { SharedModule } from '../../shared/shared-module';


@NgModule({
  declarations: [
    NewReportPage
  ],
  imports: [
    SharedModule,
    ReportsRoutingModule
  ]
})
export class ReportsModule { }
