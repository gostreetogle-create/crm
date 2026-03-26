import { CommonModule } from '@angular/common';
import { Component, OnDestroy } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { ThemeService } from '../../../core/theme/theme.service';
import { ThemeTokens } from '../../theme/theme-schema';

@Component({
  selector: 'app-theme-studio',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './theme-studio.component.html',
  styleUrl: './theme-studio.component.scss',
})
export class ThemeStudioComponent implements OnDestroy {
  readonly presets: ThemeTokens[];
  message = 'Theme ready.';
  messageKind: 'ok' | 'error' = 'ok';
  private readonly sub = new Subscription();
  private readonly fb = new FormBuilder();
  readonly form = this.fb.nonNullable.group({
    selectedPreset: ['blueprint'],
    jsonText: [''],
  });

  constructor(private readonly themeService: ThemeService) {
    this.presets = this.themeService.presets;
    const current = this.themeService.getCurrentTheme();
    this.form.patchValue({
      selectedPreset: current.name || this.presets[0]?.name || 'blueprint',
      jsonText: this.themeService.getCurrentThemeJson(),
    });
    this.sub.add(
      this.themeService.theme$.subscribe((theme) => {
        this.form.patchValue(
          {
            selectedPreset: theme.name,
            jsonText: JSON.stringify(theme, null, 2),
          },
          { emitEvent: false }
        );
      })
    );
  }

  applyPreset(): void {
    const preset = this.presets.find((p) => p.name === this.form.controls.selectedPreset.value);
    if (!preset) return;
    this.themeService.applyTheme(preset);
    this.form.controls.jsonText.setValue(JSON.stringify(preset, null, 2));
    this.message = `Preset "${preset.name}" applied.`;
    this.messageKind = 'ok';
  }

  applyJson(): void {
    const result = this.themeService.applyThemeFromJson(this.form.controls.jsonText.value);
    if (result.ok) {
      this.message = 'Custom JSON applied.';
      this.messageKind = 'ok';
    } else {
      this.message = result.error ?? 'Unknown error';
      this.messageKind = 'error';
    }
  }

  resetToCurrent(): void {
    const current: ThemeTokens = this.themeService.getCurrentTheme();
    this.form.controls.jsonText.setValue(JSON.stringify(current, null, 2));
    this.message = 'JSON synced with current theme.';
    this.messageKind = 'ok';
  }

  ngOnDestroy(): void {
    this.sub.unsubscribe();
  }
}

