import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'app-ui-editor-shell',
  standalone: true,
  templateUrl: './ui-editor-shell.component.html',
  styleUrl: './ui-editor-shell.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UiEditorShellComponent {}

