import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-forbidden-page',
  standalone: true,
  imports: [RouterLink],
  template: `
    <section class="httpState">
      <h1>403</h1>
      <p>Доступ запрещён. Обратитесь к администратору.</p>
      <a routerLink="/">На главную</a>
    </section>
  `,
  styles: [
    `
      .httpState {
        padding: 2rem;
        max-width: 28rem;
      }
      h1 {
        margin: 0 0 0.5rem;
      }
    `,
  ],
})
export class ForbiddenPage {}
