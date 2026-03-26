import { Component, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ThemeStore } from '../../../core/theme/theme.store';
import { THEME_PRESETS } from '../../theme/theme-presets';
import { ThemeTokens } from '../../theme/theme-schema';

@Component({
  selector: 'app-theme-picker',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './theme-picker.component.html',
  styleUrl: './theme-picker.component.scss',
})
export class ThemePickerComponent {
  private readonly store = inject(ThemeStore);
  readonly presets: ThemeTokens[] = THEME_PRESETS.filter((p) => p.name === 'light' || p.name === 'dark');
  readonly selectedName = computed(() => this.store['theme']().name);

  onPresetChange(name: string): void {
    const preset = this.presets.find((p) => p.name === name);
    if (!preset) return;
    this.store['applyTheme'](preset);
  }
}

