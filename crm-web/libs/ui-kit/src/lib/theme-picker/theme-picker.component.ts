import { Component, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideMoon, LucideSun } from '@lucide/angular';
import { ThemeStore } from '@srm/theme-core';
import { THEME_PRESETS } from '@srm/theme-core';
import { ThemeTokens } from '@srm/theme-core';

@Component({
  selector: 'app-theme-picker',
  standalone: true,
  imports: [CommonModule, LucideMoon, LucideSun],
  templateUrl: './theme-picker.component.html',
  styleUrl: './theme-picker.component.scss',
})
export class ThemePickerComponent {
  private readonly store = inject(ThemeStore);
  readonly presets: ThemeTokens[] = THEME_PRESETS.filter((p) => p.name === 'light' || p.name === 'dark');
  readonly selectedName = computed(() => this.store['theme']().name);
  readonly isDark = computed(() => this.selectedName() === 'dark');

  onPresetChange(name: string): void {
    const preset = this.presets.find((p) => p.name === name);
    if (!preset) return;
    this.store['applyTheme'](preset);
  }

  toggleTheme(): void {
    const next = this.isDark() ? 'light' : 'dark';
    this.onPresetChange(next);
  }
}




