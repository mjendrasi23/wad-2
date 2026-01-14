import { Injectable } from '@angular/core';
import { defer, Observable, of, throwError } from 'rxjs';
import { delay } from 'rxjs/operators';
import { ApiError } from '../models/api-error';
import { MOCK_DEV_SIMULATE_ERRORS_KEY, MOCK_LATENCY_MAX_MS, MOCK_LATENCY_MIN_MS } from './mock-constants';

@Injectable({ providedIn: 'root' })
export class MockApiBase {
  network<T>(work: () => T): Observable<T> {
    return defer(() => {
      this.maybeThrowRandomError();
      try {
        return this.delayed(work());
      } catch (e) {
        return throwError(() => e);
      }
    });
  }

  delayed<T>(value: T): Observable<T> {
    const delayMs =
      MOCK_LATENCY_MIN_MS +
      Math.floor(Math.random() * (MOCK_LATENCY_MAX_MS - MOCK_LATENCY_MIN_MS + 1));
    return of(value).pipe(delay(delayMs));
  }

  private maybeThrowRandomError(): void {
    const enabled = localStorage.getItem(MOCK_DEV_SIMULATE_ERRORS_KEY) === 'true';
    if (!enabled) return;
    if (Math.random() < 0.12) throw new ApiError('Simulated server error.', 500, 'SIMULATED_500');
  }
}
