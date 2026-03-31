import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-not-found-page',
  standalone: true,
  imports: [RouterLink],
  template: `
    <section class="httpState">
      <h1>404</h1>
      <p>Страница не найдена.</p>
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
export class NotFoundPage {}
