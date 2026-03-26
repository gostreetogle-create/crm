import { Component, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { ThemeService } from '../../../core/theme/theme.service';
import { ThemeTokens } from '../../theme/theme-schema';

@Component({
  selector: 'app-theme-picker',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './theme-picker.component.html',
  styleUrl: './theme-picker.component.scss',
})
export class ThemePickerComponent implements OnDestroy {
  readonly presets!: ThemeTokens[];
  selectedName = '';
  private readonly sub = new Subscription();

  constructor(private readonly themeService: ThemeService) {
    this.presets = this.themeService.presets;
    this.selectedName = this.themeService.getCurrentTheme().name;
    this.sub.add(
      this.themeService.theme$.subscribe((theme) => {
        this.selectedName = theme.name;
      })
    );
  }

  onPresetChange(name: string): void {
    const preset = this.presets.find((p) => p.name === name);
    if (!preset) return;
    this.themeService.applyTheme(preset);
    this.selectedName = preset.name;
  }

  ngOnDestroy(): void {
    this.sub.unsubscribe();
  }
}

