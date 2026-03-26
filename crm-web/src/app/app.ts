import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';
import { ThemePickerComponent } from './shared/ui/theme-picker/theme-picker.component';

@Component({
  imports: [RouterModule, ThemePickerComponent],
  selector: 'app-root',
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  protected title = 'crm-web';
}
