import { Component, DestroyRef, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  DEV_BOOTSTRAP_PASSWORD,
  DEV_BOOTSTRAP_USERNAME,
  SessionAuthService,
} from '../../../../core/auth/session-auth.service';
import { UiButtonComponent } from '../../../../shared/ui/ui-button/ui-button.component';
import { UiFormFieldComponent } from '../../../../shared/ui/ui-form-field/ui-form-field.component';

@Component({
  selector: 'app-login-page',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, UiFormFieldComponent, UiButtonComponent],
  templateUrl: './login-page.component.html',
  styleUrl: './login-page.component.scss',
})
export class LoginPage {
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);
  readonly session = inject(SessionAuthService);

  readonly devUser = DEV_BOOTSTRAP_USERNAME;
  readonly devPass = DEV_BOOTSTRAP_PASSWORD;

  readonly form = this.fb.nonNullable.group({
    username: ['', [Validators.required, Validators.minLength(1)]],
    password: ['', [Validators.required, Validators.minLength(1)]],
  });

  errorText = '';

  constructor() {
    // `permissionGuard` может редиректить на `/` с `?accessDenied=...` после успешного логина.
    // Поэтому реагируем на смену query-params, а не только на snapshot в конструкторе.
    this.route.queryParamMap
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((p) => {
        const accessDenied = p.get('accessDenied');
        this.errorText = accessDenied
          ? 'У вас нет прав для открытия этой страницы. Попросите администратора настроить матрицу.'
          : '';
      });

    if (this.session.useMockAuth()) {
      this.form.patchValue({
        username: DEV_BOOTSTRAP_USERNAME,
        password: DEV_BOOTSTRAP_PASSWORD,
      });
    }
  }

  submit(): void {
    this.errorText = '';
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.errorText = 'Введите логин и пароль.';
      return;
    }
    const { username, password } = this.form.getRawValue();
    this.session.login(username.trim(), password).subscribe((ok) => {
      if (!ok) {
        this.errorText = this.session.useMockAuth()
          ? `Неверная пара логин/пароль. Для dev: ${this.devUser} / ${this.devPass}.`
          : 'Неверная пара логин/пароль. Учётную запись создаёт администратор в «Справочники» → «Пользователи».';
        return;
      }
      void this.router.navigateByUrl('/справочники');
    });
  }

  logout(): void {
    this.session.logout();
    if (this.session.useMockAuth()) {
      this.form.reset({
        username: DEV_BOOTSTRAP_USERNAME,
        password: DEV_BOOTSTRAP_PASSWORD,
      });
    } else {
      this.form.reset({ username: '', password: '' });
    }
  }
}
