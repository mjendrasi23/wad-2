import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { environment } from '../../../environments/environment';
import { STORAGE_KEYS } from '../storage/storage-keys';

@Injectable({ providedIn: 'root' })
export class DevToolsService {
  private readonly simulateErrorsSubject = new BehaviorSubject<boolean>(this.readSimulateErrors());
  readonly simulateErrors$ = this.simulateErrorsSubject.asObservable();

  get enabled(): boolean {
    return !environment.production && environment.useMockApi;
  }

  toggleSimulateErrors(): void {
    const next = !this.simulateErrorsSubject.value;
    localStorage.setItem(STORAGE_KEYS.devSimulateErrors, String(next));
    this.simulateErrorsSubject.next(next);
  }

  private readSimulateErrors(): boolean {
    return localStorage.getItem(STORAGE_KEYS.devSimulateErrors) === 'true';
  }
}

