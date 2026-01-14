import { NgModule } from '@angular/core';

import { ProfileRoutingModule } from './profile-routing-module';
import { ProfilePage } from './pages/profile-page/profile-page';
import { FavoritesPage } from './pages/favorites-page/favorites-page';
import { SharedModule } from '../../shared/shared-module';


@NgModule({
  declarations: [
    ProfilePage,
    FavoritesPage
  ],
  imports: [
    SharedModule,
    ProfileRoutingModule
  ]
})
export class ProfileModule { }
