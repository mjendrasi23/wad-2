import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Shell } from './layout/shell/shell';
import { Topbar } from './layout/topbar/topbar';
import { Footer } from './layout/footer/footer';
import { NotFoundPage } from './pages/not-found-page/not-found-page';
import { SharedModule } from '../shared/shared-module';



@NgModule({
  declarations: [
    Shell,
    Topbar,
    Footer,
    NotFoundPage
  ],
  imports: [
    CommonModule,
    SharedModule
  ],
  exports: [Shell]
})
export class CoreModule { }
