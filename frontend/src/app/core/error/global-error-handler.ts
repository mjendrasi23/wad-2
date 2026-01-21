import { ErrorHandler, Injectable, Injector } from '@angular/core';
import { ErrorHandlingService } from './error-handling.service';

@Injectable()
export class GlobalErrorHandler implements ErrorHandler {
  constructor(private readonly injector: Injector) {}

  handleError(error: unknown): void {
    const message = typeof (error as any)?.message === 'string' ? (error as any).message : '';
    // NG0100 is a dev-mode change detection warning that is not actionable for end users.
    // Showing it via snackbars can create an infinite notification loop.
    if (message.includes('ExpressionChangedAfterItHasBeenCheckedError') || message.startsWith('NG0100')) {
      // eslint-disable-next-line no-console
      console.error(error);
      return;
    }

    // Avoid DI cycles by resolving lazily.
    const notifier = this.injector.get(ErrorHandlingService);
    notifier.notifyError(error);
  }
}

