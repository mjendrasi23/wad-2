import { NgModule } from '@angular/core';

import { AdminRoutingModule } from './admin-routing-module';
import { UsersPage } from './pages/users-page/users-page';
import { UserDetailDrawer } from './components/user-detail-drawer/user-detail-drawer';
import { SharedModule } from '../../shared/shared-module';


@NgModule({
  declarations: [
    UsersPage,
    UserDetailDrawer
  ],
  imports: [
    SharedModule,
    AdminRoutingModule
  ]
})
export class AdminModule { }
