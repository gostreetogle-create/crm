import { Component, inject } from '@angular/core';
import { RouterModule } from '@angular/router';
import { SessionAuthService } from '@srm/auth-session-angular';
import { AppHeaderComponent, ThemePickerComponent, ToastContainerComponent } from '@srm/ui-kit';

@Component({
  imports: [RouterModule, ThemePickerComponent, AppHeaderComponent, ToastContainerComponent],
  selector: 'app-root',
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  protected title = 'crm-web';
  protected readonly session = inject(SessionAuthService);
}


