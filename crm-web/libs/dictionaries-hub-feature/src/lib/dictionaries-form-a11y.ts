/**
 * Прокрутка к первому видимому полю с ошибкой после `markAllAsTouched` (длинные формы, бэклог #17).
 * Используется для всех модальных форм хаба в `dictionaries-page` (см. вызовы в `submit*`).
 */
export function scrollToFirstInvalidControlInForm(formId: string, doc: Document): void {
  const form = doc.getElementById(formId);
  if (!form) return;
  const invalid = form.querySelector<HTMLElement>(
    'input.ng-invalid, select.ng-invalid, textarea.ng-invalid',
  );
  if (invalid) {
    invalid.focus({ preventScroll: false });
    invalid.scrollIntoView({ block: 'center', behavior: 'smooth' });
  }
}
