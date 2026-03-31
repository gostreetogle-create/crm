import { Component, inject } from '@angular/core';
import { RouterModule } from '@angular/router';
import { SessionAuthService } from '@srm/auth-session-angular';
import { AppHeaderComponent } from '@srm/ui-kit';
import { ThemePickerComponent } from '@srm/ui-kit';

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


