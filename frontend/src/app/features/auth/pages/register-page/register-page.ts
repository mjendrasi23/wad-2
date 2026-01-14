import { Component, inject } from '@angular/core';
import { AbstractControl, FormBuilder, ValidationErrors, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { environment } from '../../../../../environments/environment';
import { AuthService } from '../../../../core/services/auth.service';

@Component({
  selector: 'app-register-page',
  standalone: false,
  templateUrl: './register-page.html',
  styleUrl: './register-page.scss',
})
export class RegisterPage {
  readonly env = environment;
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  readonly form = this.fb.group(
    {
      name: this.fb.nonNullable.control('', [Validators.required, Validators.maxLength(60)]),
      email: this.fb.nonNullable.control('', [Validators.required, Validators.email]),
      password: this.fb.nonNullable.control('', [
        Validators.required,
        Validators.minLength(8),
        Validators.pattern(/^(?=.*[A-Z])(?=.*[a-z])(?=.*\\d)(?=.*[^\\w\\s]).+$/),
      ]),
      confirmPassword: this.fb.nonNullable.control('', [Validators.required]),
    },
    { validators: [passwordMatch] }
  );

  loading = false;
  formError: string | null = null;

  submit(): void {
    this.formError = null;
    this.form.markAllAsTouched();
    if (this.form.invalid) return;
    if (!this.env.useMockApi) {
      this.formError = 'Registration is disabled when using a real backend stub.';
      return;
    }

    this.loading = true;
    const { name, email, password } = this.form.getRawValue();
    this.auth.register({ name, email, password }).subscribe((res) => {
      this.loading = false;
      if (!res.ok) {
        this.formError = res.message ?? 'Registration failed.';
        return;
      }
      void this.router.navigateByUrl('/');
    });
  }
}

function passwordMatch(control: AbstractControl): ValidationErrors | null {
  const password = control.get('password')?.value;
  const confirmPassword = control.get('confirmPassword')?.value;
  if (!password || !confirmPassword) return null;
  return password === confirmPassword ? null : { passwordMismatch: true };
}
