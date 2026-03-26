import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';
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
}
