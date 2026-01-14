import { Observable } from 'rxjs';
import { PagedResult } from '../models/paging';
import { Report, ReportCreate } from '../models/report';
import { ModerationQueueQuery } from '../models/moderation';

export abstract class ReportsApi {
  abstract create(request: ReportCreate): Observable<Report>;
  abstract moderationQueue(query: ModerationQueueQuery): Observable<PagedResult<Report>>;
  abstract resolve(reportId: string): Observable<Report>;
  abstract remove(reportId: string): Observable<Report>;
}

