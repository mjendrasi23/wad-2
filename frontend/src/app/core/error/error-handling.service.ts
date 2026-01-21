import { HttpErrorResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ApiError } from '../../api/models/api-error';
import { NgZone } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class ErrorHandlingService {
  private lastToastAt = 0;
  private lastToastMessage: string | null = null;

  constructor(
    private readonly snackBar: MatSnackBar,
    private readonly zone: NgZone
  ) {}

  notifyError(error: unknown, fallbackMessage = 'Something went wrong. Please try again.'): void {
    const message = this.messageFrom(error) ?? fallbackMessage;

    // Prevent toast storms when the same error is raised repeatedly (e.g. dev-mode NG0100 loops).
    const now = Date.now();
    if (this.lastToastMessage === message && now - this.lastToastAt < 1500) {
      // eslint-disable-next-line no-console
      console.error(error);
      return;
    }
    this.lastToastAt = now;
    this.lastToastMessage = message;

    // Defer snackbar open to avoid ExpressionChangedAfterItHasBeenCheckedError during app bootstrap/navigation.
    this.zone.run(() => {
      setTimeout(() => {
        this.snackBar.open(message, 'Dismiss', { duration: 5000 });
      }, 0);
    });
    // Keep console output for debugging in demo mode.
    // eslint-disable-next-line no-console
    console.error(error);
  }

  messageFrom(error: unknown): string | null {
    if (error instanceof ApiError) return error.message;
    if (error instanceof HttpErrorResponse) {
      if (typeof error.error === 'string' && error.error.trim()) return error.error;
      if (typeof error.error?.message === 'string') return error.error.message;
      if (error.status === 0) return 'Network error. Check your connection.';
      return error.message || null;
    }

    if (error && typeof error === 'object' && 'message' in error && typeof (error as any).message === 'string') {
      return (error as any).message;
    }

    return null;
  }
}

