import { Component, inject } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { environment } from '../../../../../environments/environment';
import { AuthService } from '../../../../core/services/auth.service';

@Component({
  selector: 'app-login-page',
  standalone: false,
  templateUrl: './login-page.html',
  styleUrl: './login-page.scss',
})
export class LoginPage {
  readonly env = environment;
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  readonly form = this.fb.nonNullable.group({
    email: this.fb.nonNullable.control('', [Validators.required, Validators.email]),
    password: this.fb.nonNullable.control('', [Validators.required]),
  });

  loading = false;
  formError: string | null = null;

  submit(): void {
    this.formError = null;
    this.form.markAllAsTouched();
    if (this.form.invalid) return;

    this.loading = true;
    const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl') ?? '/';

    this.auth.login(this.form.getRawValue()).subscribe((res) => {
      this.loading = false;
      if (!res.ok) {
        this.formError = res.message ?? 'Login failed.';
        return;
      }
      void this.router.navigateByUrl(returnUrl);
    });
  }
}
