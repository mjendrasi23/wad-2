import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { MaintenanceApi } from '../apis/maintenance-api';
import { MockApiBase } from './mock-api-base';
import { MockDbService } from './mock-db.service';

@Injectable()
export class MockMaintenanceApi extends MaintenanceApi {
  constructor(
    private readonly base: MockApiBase,
    private readonly dbService: MockDbService
  ) {
    super();
  }

  resetDemoData(): Observable<void> {
    return this.base.network(() => {
      this.dbService.reset();
      return undefined;
    });
  }
}

