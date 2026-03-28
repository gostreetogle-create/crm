import { Component, Input } from '@angular/core';

/**
 * Сетка полей формы для модалок и карточек.
 * На всю ширину: добавьте класс `uiFormGrid__full` на прямой дочерний элемент.
 */
@Component({
  selector: 'ui-form-grid',
  standalone: true,
  template: '<ng-content />',
  styleUrl: './ui-form-grid.component.scss',
  host: {
    class: 'uiFormGrid',
    '[class.uiFormGrid--cols2]': 'columns === 2',
    '[class.uiFormGrid--cols3]': 'columns === 3',
  },
})
export class UiFormGridComponent {
  @Input() columns: 2 | 3 = 2;
}
