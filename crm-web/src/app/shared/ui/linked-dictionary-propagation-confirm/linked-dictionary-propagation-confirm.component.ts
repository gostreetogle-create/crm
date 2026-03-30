import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { UiModal as UiModalComponent } from '../modal/public-api';
import { UiButtonComponent } from '../ui-button/ui-button.component';

export type LinkedDictionaryPropagationConfirmMode = 'update' | 'delete';

@Component({
  selector: 'app-linked-dictionary-propagation-confirm',
  standalone: true,
  imports: [CommonModule, UiModalComponent, UiButtonComponent],
  templateUrl: './linked-dictionary-propagation-confirm.component.html',
  styleUrl: './linked-dictionary-propagation-confirm.component.scss',
})
export class LinkedDictionaryPropagationConfirmComponent {
  @Input({ required: true }) mode!: LinkedDictionaryPropagationConfirmMode;
  @Input({ required: true }) entityLabel!: string;
  @Input({ required: true }) relatedCount!: number;

  @Output() local = new EventEmitter<void>();
  @Output() global = new EventEmitter<void>();
  @Output() closed = new EventEmitter<void>();

  get title(): string {
    return 'Данные связаны';
  }
}

