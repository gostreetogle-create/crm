import { CommonModule } from '@angular/common';
import { Component, effect, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { ThemeStore } from '../../../core/theme/theme.store';
import { THEME_PRESETS } from '../../theme/theme-presets';
import { ThemeTokens } from '../../theme/theme-schema';

@Component({
  selector: 'app-theme-studio',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './theme-studio.component.html',
  styleUrl: './theme-studio.component.scss',
})
export class ThemeStudioComponent {
  private readonly store = inject(ThemeStore);
  readonly presets: ThemeTokens[];
  message = 'Theme ready.';
  messageKind: 'ok' | 'error' = 'ok';
  private readonly fb = new FormBuilder();
  readonly form = this.fb.nonNullable.group({
    selectedPreset: ['light'],
    jsonText: [''],
  });

  constructor() {
    this.presets = THEME_PRESETS.filter((p) => p.name === 'light' || p.name === 'dark');
    const current = this.store['getCurrentTheme']();
    this.form.patchValue({
      selectedPreset: current.name || this.presets[0]?.name || 'light',
      jsonText: this.store['getCurrentThemeJson'](),
    });
    effect(() => {
      const theme = this.store['theme']();
      this.form.patchValue(
        {
          selectedPreset: theme.name,
          jsonText: JSON.stringify(theme, null, 2),
        },
        { emitEvent: false }
      );
    });
  }

  applyPreset(): void {
    const preset = this.presets.find((p) => p.name === this.form.controls.selectedPreset.value);
    if (!preset) return;
    this.store['applyTheme'](preset);
    this.form.controls.jsonText.setValue(JSON.stringify(preset, null, 2));
    this.message = `Preset "${preset.name}" applied.`;
    this.messageKind = 'ok';
  }

  applyJson(): void {
    const result = this.store['applyThemeFromJson'](this.form.controls.jsonText.value);
    if (result.ok) {
      this.message = 'Custom JSON applied.';
      this.messageKind = 'ok';
    } else {
      this.message = result.error ?? 'Unknown error';
      this.messageKind = 'error';
    }
  }

  resetToCurrent(): void {
    const current: ThemeTokens = this.store['getCurrentTheme']();
    this.form.controls.jsonText.setValue(JSON.stringify(current, null, 2));
    this.message = 'JSON synced with current theme.';
    this.messageKind = 'ok';
  }
}

