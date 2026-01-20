import { ErrorHandler, NgModule, provideBrowserGlobalErrorListeners } from '@angular/core';
import { HTTP_INTERCEPTORS } from '@angular/common/http';
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';

import { AppRoutingModule } from './app-routing-module';
import { App } from './app';
import { CoreModule } from './core/core-module';
import { SharedModule } from './shared/shared-module';
import { ApiModule } from './api/api-module';
import { PublicModule } from './features/public/public-module';
import { AuthModule } from './features/auth/auth-module';
import { ProfileModule } from './features/profile/profile-module';
import { RecipesModule } from './features/recipes/recipes-module';
import { ReportsModule } from './features/reports/reports-module';
import { ManagementModule } from './features/management/management-module';
import { AdminModule } from './features/admin/admin-module';
import { GlobalErrorHandler } from './core/error/global-error-handler';
import { AuthTokenInterceptor } from './core/interceptors/auth-token-interceptor';
import { HttpErrorInterceptor } from './core/interceptors/http-error-interceptor';
import { CredentialsInterceptor } from './core/interceptors/credentials-interceptor';
import { provideCharts, withDefaultRegisterables } from 'ng2-charts';

@NgModule({
  declarations: [
    App
  ],
  imports: [
    BrowserModule,
    BrowserAnimationsModule,
    CoreModule,
    SharedModule,
    ApiModule,
    PublicModule,
    AuthModule,
    ProfileModule,
    RecipesModule,
    ReportsModule,
    ManagementModule,
    AdminModule,
    AppRoutingModule
  ],
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideCharts(withDefaultRegisterables()),
    { provide: ErrorHandler, useClass: GlobalErrorHandler },
    { provide: HTTP_INTERCEPTORS, useClass: CredentialsInterceptor, multi: true },
    { provide: HTTP_INTERCEPTORS, useClass: AuthTokenInterceptor, multi: true },
    { provide: HTTP_INTERCEPTORS, useClass: HttpErrorInterceptor, multi: true },
  ],
  bootstrap: [App]
})
export class AppModule { }
