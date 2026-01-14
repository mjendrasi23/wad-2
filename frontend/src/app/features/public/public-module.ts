import { NgModule } from '@angular/core';

import { PublicRoutingModule } from './public-routing-module';
import { HomePage } from './pages/home-page/home-page';
import { AuthorsPage } from './pages/authors-page/authors-page';
import { DocsPage } from './pages/docs-page/docs-page';
import { SharedModule } from '../../shared/shared-module';


@NgModule({
  declarations: [
    HomePage,
    AuthorsPage,
    DocsPage
  ],
  imports: [
    SharedModule,
    PublicRoutingModule
  ]
})
export class PublicModule { }
