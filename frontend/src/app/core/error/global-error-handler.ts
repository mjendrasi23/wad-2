import { ErrorHandler, Injectable, Injector } from '@angular/core';
import { ErrorHandlingService } from './error-handling.service';

@Injectable()
export class GlobalErrorHandler implements ErrorHandler {
  constructor(private readonly injector: Injector) {}

  handleError(error: unknown): void {
    // Avoid DI cycles by resolving lazily.
    const notifier = this.injector.get(ErrorHandlingService);
    notifier.notifyError(error);
  }
}

