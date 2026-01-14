import { NgModule } from '@angular/core';

import { AuthRoutingModule } from './auth-routing-module';
import { LoginPage } from './pages/login-page/login-page';
import { RegisterPage } from './pages/register-page/register-page';
import { SharedModule } from '../../shared/shared-module';


@NgModule({
  declarations: [
    LoginPage,
    RegisterPage
  ],
  imports: [
    SharedModule,
    AuthRoutingModule
  ]
})
export class AuthModule { }
