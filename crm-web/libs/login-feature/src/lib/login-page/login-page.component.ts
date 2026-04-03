import { Component, DestroyRef, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { UiButtonComponent, UiFormFieldComponent } from '@srm/ui-kit';
import { SessionAuthService } from '@srm/auth-session-angular';

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

  readonly form = this.fb.nonNullable.group({
    username: ['', [Validators.required, Validators.minLength(1)]],
    password: ['', [Validators.required, Validators.minLength(1)]],
  });

  errorText = '';

  constructor() {
    this.route.queryParamMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((p) => {
      const accessDenied = p.get('accessDenied');
      this.errorText = accessDenied
        ? 'У вас нет прав для открытия этой страницы. Попросите администратора настроить матрицу.'
        : '';
    });
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
        this.errorText =
          'Неверная пара логин/пароль. Учётную запись создаёт администратор в «Справочники» → «Пользователи».';
        return;
      }
      this.errorText = '';
      void this.router.navigateByUrl('/справочники');
    });
  }

  logout(): void {
    this.session.logout();
    this.form.reset({ username: '', password: '' });
  }
}
