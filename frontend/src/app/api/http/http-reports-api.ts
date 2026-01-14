import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ReportsApi } from '../apis/reports-api';
import { PagedResult } from '../models/paging';
import { Report, ReportCreate } from '../models/report';
import { ModerationQueueQuery } from '../models/moderation';
import { HttpBaseApi } from './http-base-api';

@Injectable()
export class HttpReportsApi extends ReportsApi {
  constructor(private readonly base: HttpBaseApi) {
    super();
  }

  create(request: ReportCreate): Observable<Report> {
    return this.base.http.post<Report>(`${this.base.baseUrl}/reports`, request);
  }

  moderationQueue(query: ModerationQueueQuery): Observable<PagedResult<Report>> {
    return this.base.http.get<PagedResult<Report>>(`${this.base.baseUrl}/management/moderation`, { params: query as any });
  }

  resolve(reportId: string): Observable<Report> {
    return this.base.http.post<Report>(`${this.base.baseUrl}/management/moderation/${reportId}/resolve`, {});
  }

  remove(reportId: string): Observable<Report> {
    return this.base.http.post<Report>(`${this.base.baseUrl}/management/moderation/${reportId}/remove`, {});
  }
}

