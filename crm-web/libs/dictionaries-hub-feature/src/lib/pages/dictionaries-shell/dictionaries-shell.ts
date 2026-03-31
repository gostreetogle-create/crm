import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

/**
 * Оболочка хаба справочников: дочерние маршруты (`''` — доска, `новый-материал` — полноэкранное создание материала).
 */
@Component({
  selector: 'app-dictionaries-shell',
  standalone: true,
  imports: [RouterOutlet],
  template: '<router-outlet />',
})
export class DictionariesShellComponent {}
