import { Observable } from 'rxjs';

export abstract class MaintenanceApi {
  abstract resetDemoData(): Observable<void>;
}

