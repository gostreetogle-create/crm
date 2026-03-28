import { Component, inject } from '@angular/core';
import { RouterModule } from '@angular/router';
import { SessionAuthService } from './core/auth/session-auth.service';
import { AppHeaderComponent } from './shared/ui/app-header/app-header.component';
import { ThemePickerComponent } from './shared/ui/theme-picker/theme-picker.component';

@Component({
  imports: [RouterModule, ThemePickerComponent, AppHeaderComponent],
  selector: 'app-root',
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  protected title = 'crm-web';
  protected readonly session = inject(SessionAuthService);
}
