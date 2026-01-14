import { Component, inject } from '@angular/core';
import { FormBuilder } from '@angular/forms';
import { BehaviorSubject, combineLatest, debounceTime, distinctUntilChanged, map, shareReplay, startWith, switchMap } from 'rxjs';
import { ReportsApi } from '../../../../api/apis/reports-api';
import { PagedResult } from '../../../../api/models/paging';
import { ModerationItemType, ModerationQueueQuery } from '../../../../api/models/moderation';
import { Report, ReportStatus } from '../../../../api/models/report';
import { ConfirmService } from '../../../../shared/services/confirm.service';

interface ModerationVm {
  query: ModerationQueueQuery;
  loading: boolean;
  result: PagedResult<Report> | null;
}

@Component({
  selector: 'app-moderation-page',
  standalone: false,
  templateUrl: './moderation-page.html',
  styleUrl: './moderation-page.scss',
})
export class ModerationPage {
  private readonly fb = inject(FormBuilder);
  private readonly reportsApi = inject(ReportsApi);
  private readonly confirm = inject(ConfirmService);

  readonly form = this.fb.nonNullable.group({
    type: this.fb.nonNullable.control<ModerationItemType | ''>(''),
    status: this.fb.nonNullable.control<ReportStatus | ''>(''),
  });

  private readonly pageSubject = new BehaviorSubject<{ page: number; pageSize: number }>({ page: 1, pageSize: 10 });

  readonly vm$ = combineLatest([
    this.form.valueChanges.pipe(startWith(this.form.getRawValue()), debounceTime(100), distinctUntilChanged((a, b) => JSON.stringify(a) === JSON.stringify(b))),
    this.pageSubject,
  ]).pipe(
    switchMap(([f, p]) => {
      const query: ModerationQueueQuery = {
        page: p.page,
        pageSize: p.pageSize,
        type: (f.type || undefined) as ModerationItemType | undefined,
        status: (f.status || undefined) as ReportStatus | undefined,
      };
      return this.reportsApi.moderationQueue(query).pipe(
        map((result) => ({ query, result, loading: false } satisfies ModerationVm)),
        startWith({ query, result: null, loading: true } satisfies ModerationVm)
      );
    }),
    shareReplay(1)
  );

  onPageChange(pageIndex: number, pageSize: number): void {
    this.pageSubject.next({ page: pageIndex + 1, pageSize });
  }

  resolve(report: Report): void {
    this.reportsApi.resolve(report.id).subscribe(() => this.pageSubject.next(this.pageSubject.value));
  }

  remove(report: Report): void {
    this.confirm
      .open({
        title: 'Remove content?',
        message: 'This will mark the report as removed and hide the target content.',
        confirmText: 'Remove',
        tone: 'danger',
      })
      .subscribe((ok) => {
        if (!ok) return;
        this.reportsApi.remove(report.id).subscribe(() => this.pageSubject.next(this.pageSubject.value));
      });
  }
}
