import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
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
  readonly session = inject(SessionAuthService);

  readonly devUser = DEV_BOOTSTRAP_USERNAME;
  readonly devPass = DEV_BOOTSTRAP_PASSWORD;

  readonly form = this.fb.nonNullable.group({
    username: [DEV_BOOTSTRAP_USERNAME, [Validators.required, Validators.minLength(1)]],
    password: [DEV_BOOTSTRAP_PASSWORD, [Validators.required, Validators.minLength(1)]],
  });

  errorText = '';

  submit(): void {
    this.errorText = '';
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.errorText = 'Введите логин и пароль.';
      return;
    }
    const { username, password } = this.form.getRawValue();
    const ok = this.session.login(username.trim(), password);
    if (!ok) {
      this.errorText = `Неверная пара логин/пароль. Для dev: ${this.devUser} / ${this.devPass}.`;
      return;
    }
    void this.router.navigateByUrl('/dictionaries');
  }

  logout(): void {
    this.session.logout();
    this.form.reset({
      username: DEV_BOOTSTRAP_USERNAME,
      password: DEV_BOOTSTRAP_PASSWORD,
    });
  }

  goDictionaries(): void {
    void this.router.navigateByUrl('/dictionaries');
  }
}
