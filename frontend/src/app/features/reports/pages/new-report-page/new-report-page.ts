import { Component, inject } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { ReportsApi } from '../../../../api/apis/reports-api';
import { ReportTargetType } from '../../../../api/models/report';

@Component({
  selector: 'app-new-report-page',
  standalone: false,
  templateUrl: './new-report-page.html',
  styleUrl: './new-report-page.scss',
})
export class NewReportPage {
  private readonly fb = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly reportsApi = inject(ReportsApi);

  readonly targetType = (this.route.snapshot.queryParamMap.get('targetType') as ReportTargetType | null) ?? 'recipe';
  readonly targetId = this.route.snapshot.queryParamMap.get('targetId') ?? '';

  readonly form = this.fb.nonNullable.group({
    reason: this.fb.nonNullable.control('Spam', [Validators.required]),
    details: this.fb.nonNullable.control('', [Validators.maxLength(800)]),
  });

  submitting = false;
  formError: string | null = null;

  submit(): void {
    this.formError = null;
    if (!this.targetId) {
      this.formError = 'Missing target to report.';
      return;
    }

    this.submitting = true;
    const { reason, details } = this.form.getRawValue();
    this.reportsApi
      .create({ targetType: this.targetType, targetId: this.targetId, reason, details: details.trim() || undefined })
      .subscribe({
        next: () => void this.router.navigateByUrl('/'),
        error: () => (this.submitting = false),
        complete: () => (this.submitting = false),
      });
  }
}
