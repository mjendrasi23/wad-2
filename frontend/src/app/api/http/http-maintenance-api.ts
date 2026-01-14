import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { MaintenanceApi } from '../apis/maintenance-api';
import { HttpBaseApi } from './http-base-api';

@Injectable()
export class HttpMaintenanceApi extends MaintenanceApi {
  constructor(private readonly base: HttpBaseApi) {
    super();
  }

  resetDemoData(): Observable<void> {
    // In a real backend, this should likely be removed or admin-gated.
    return this.base.http.post<void>(`${this.base.baseUrl}/maintenance/reset-demo`, {});
  }
}

