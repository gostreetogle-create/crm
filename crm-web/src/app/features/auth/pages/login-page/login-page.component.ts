import { Component, OnInit, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { SessionAuthService } from '../../../../core/auth/session-auth.service';
import { UiButtonComponent } from '../../../../shared/ui/ui-button/ui-button.component';
import { UiFormFieldComponent } from '../../../../shared/ui/ui-form-field/ui-form-field.component';

@Component({
  selector: 'app-login-page',
  standalone: true,
  imports: [ReactiveFormsModule, UiFormFieldComponent, UiButtonComponent],
  templateUrl: './login-page.component.html',
  styleUrl: './login-page.component.scss',
})
export class LoginPage implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly session = inject(SessionAuthService);

  readonly form = this.fb.nonNullable.group({
    username: ['', [Validators.required, Validators.minLength(1)]],
    password: ['', [Validators.required, Validators.minLength(1)]],
  });

  errorText = '';

  ngOnInit(): void {
    if (this.session.isAuthenticated()) {
      void this.router.navigateByUrl('/dictionaries');
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
    this.session.login(username.trim(), password);
    void this.router.navigateByUrl('/dictionaries');
  }
}
