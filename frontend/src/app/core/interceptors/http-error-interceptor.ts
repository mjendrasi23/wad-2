import { HttpEvent, HttpHandler, HttpInterceptor, HttpRequest } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, throwError } from 'rxjs';
import { ErrorHandlingService } from '../error/error-handling.service';

@Injectable()
export class HttpErrorInterceptor implements HttpInterceptor {
  constructor(private readonly errors: ErrorHandlingService) {}

  intercept(req: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
    return next.handle(req).pipe(
      catchError((err) => {
        // Auth pages show inline errors; avoid snackbar storms on invalid credentials.
        const url = String(req.url ?? '');
        const isAuthAttempt = url.includes('/auth/login') || url.includes('/auth/register');
        if (!isAuthAttempt) this.errors.notifyError(err);
        return throwError(() => err);
      })
    );
  }
}

