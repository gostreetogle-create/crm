import type { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';
import { parseKpNumber } from './kp-number.utils';

/** Запрещены буквы (в т.ч. латиница и «e» у экспоненты). */
function hasForbiddenLetters(raw: string): boolean {
  return /[a-zA-Zа-яА-ЯёЁ]/.test(raw);
}

/**
 * Количество и цена строки КП: непусто, неотрицательное число (цифры, пробелы, `,` / `.`).
 */
export function kpLineQtyOrPriceValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const raw = String(control.value ?? '').trim();
    if (raw === '') {
      return { required: true };
    }
    if (hasForbiddenLetters(raw)) {
      return { kpNotNumeric: true };
    }
    const n = parseKpNumber(raw);
    if (!Number.isFinite(n) || n < 0) {
      return { kpNotNumeric: true };
    }
    return null;
  };
}

/** Строк на лист (целое 1…99). */
export function kpRowsPerPageValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const raw = String(control.value ?? '').trim();
    if (raw === '') {
      return { required: true };
    }
    if (!/^\d+$/.test(raw)) {
      return { kpRowsPerPage: true };
    }
    const n = Number(raw);
    if (!Number.isFinite(n) || n < 1 || n > 99) {
      return { kpRowsPerPage: true };
    }
    return null;
  };
}

/** Ставка НДС, % (0…100). */
export function kpVatPercentValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const raw = String(control.value ?? '').trim();
    if (raw === '') {
      return { required: true };
    }
    if (hasForbiddenLetters(raw)) {
      return { kpNotNumeric: true };
    }
    const n = parseKpNumber(raw);
    if (!Number.isFinite(n) || n < 0 || n > 100) {
      return { kpVatPercent: true };
    }
    return null;
  };
}

/** Сумма НДС, ₽ — пусто допустимо (0); иначе неотрицательное число. */
export function kpVatAmountOptionalValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const raw = String(control.value ?? '').trim();
    if (raw === '') {
      return null;
    }
    if (hasForbiddenLetters(raw)) {
      return { kpNotNumeric: true };
    }
    const n = parseKpNumber(raw);
    if (!Number.isFinite(n) || n < 0) {
      return { kpNotNumeric: true };
    }
    return null;
  };
}

/** Максимальный размер миниатюры «Фото» в таблице КП, px (24…160). */
export function kpPhotoThumbMaxPxValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const raw = String(control.value ?? '').replace(/\s/g, '');
    if (raw === '') {
      return { required: true };
    }
    if (!/^\d+$/.test(raw)) {
      return { kpPhotoThumbPx: true };
    }
    const n = parseInt(raw, 10);
    if (!Number.isFinite(n) || n < 24 || n > 160) {
      return { kpPhotoThumbPx: true };
    }
    return null;
  };
}
