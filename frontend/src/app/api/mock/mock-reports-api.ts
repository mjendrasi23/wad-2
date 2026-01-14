import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ReportsApi } from '../apis/reports-api';
import { ApiError } from '../models/api-error';
import { PagedResult } from '../models/paging';
import { Report, ReportCreate } from '../models/report';
import { ModerationQueueQuery } from '../models/moderation';
import { MockApiBase } from './mock-api-base';
import { MockDbService } from './mock-db.service';
import { canExplore, requireRole, requireUser } from './mock-auth';
import { id, nowIso } from './mock-utils';

@Injectable()
export class MockReportsApi extends ReportsApi {
  constructor(
    private readonly base: MockApiBase,
    private readonly dbService: MockDbService
  ) {
    super();
  }

  create(request: ReportCreate): Observable<Report> {
    return this.base.network(() => {
      const db = this.dbService.require();
      const actor = requireUser(db.users);
      if (!canExplore(actor)) throw new ApiError('Reports are not available for this role.', 403, 'FORBIDDEN');

      if (!request.reason.trim()) throw new ApiError('Reason is required.', 400, 'VALIDATION');
      if (request.targetType === 'recipe') {
        const recipe = db.recipes.find((r) => r.id === request.targetId);
        if (!recipe || !recipe.isPublic) throw new ApiError('Recipe not found.', 404, 'NOT_FOUND');
      } else {
        const comment = db.comments.find((c) => c.id === request.targetId);
        if (!comment) throw new ApiError('Comment not found.', 404, 'NOT_FOUND');
      }

      const report: Report = {
        id: id('rep', db.reports.length + 1),
        reporterId: actor.id,
        targetType: request.targetType,
        targetId: request.targetId,
        reason: request.reason.trim(),
        details: request.details?.trim() || undefined,
        status: 'open',
        createdAt: nowIso(),
      };

      this.dbService.update((d) => d.reports.unshift(report));
      return report;
    });
  }

  moderationQueue(query: ModerationQueueQuery): Observable<PagedResult<Report>> {
    return this.base.network(() => {
      const db = this.dbService.require();
      const actor = requireUser(db.users);
      requireRole(actor, ['manager', 'admin']);

      const type = query.type;
      const status = query.status;

      let items = db.reports.slice();
      if (status) items = items.filter((r) => r.status === status);
      if (type && type !== 'report') items = items.filter((r) => r.targetType === type);

      items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      const page = Math.max(1, Math.floor(query.page || 1));
      const pageSize = Math.min(50, Math.max(1, Math.floor(query.pageSize || 10)));
      const total = items.length;
      const start = (page - 1) * pageSize;
      const paged = items.slice(start, start + pageSize);

      return { items: paged, total, page, pageSize };
    });
  }

  resolve(reportId: string): Observable<Report> {
    return this.base.network(() => {
      const db = this.dbService.require();
      const actor = requireUser(db.users);
      requireRole(actor, ['manager', 'admin']);

      const report = db.reports.find((r) => r.id === reportId);
      if (!report) throw new ApiError('Report not found.', 404, 'NOT_FOUND');

      const updated: Report = { ...report, status: 'resolved', reviewedById: actor.id, reviewedAt: nowIso() };
      this.dbService.update((d) => {
        const idx = d.reports.findIndex((r) => r.id === reportId);
        if (idx >= 0) d.reports[idx] = updated;
      });

      return updated;
    });
  }

  remove(reportId: string): Observable<Report> {
    return this.base.network(() => {
      const db = this.dbService.require();
      const actor = requireUser(db.users);
      requireRole(actor, ['manager', 'admin']);

      const report = db.reports.find((r) => r.id === reportId);
      if (!report) throw new ApiError('Report not found.', 404, 'NOT_FOUND');

      this.dbService.update((d) => {
        const rep = d.reports.find((r) => r.id === reportId);
        if (!rep) return;

        rep.status = 'removed';
        rep.reviewedById = actor.id;
        rep.reviewedAt = nowIso();

        if (rep.targetType === 'comment') {
          const c = d.comments.find((x) => x.id === rep.targetId);
          if (c) c.status = 'removed';
        }

        if (rep.targetType === 'recipe') {
          const recipe = d.recipes.find((x) => x.id === rep.targetId);
          if (recipe) recipe.isPublic = false;
        }
      });

      return this.dbService.require().reports.find((r) => r.id === reportId)!;
    });
  }
}

