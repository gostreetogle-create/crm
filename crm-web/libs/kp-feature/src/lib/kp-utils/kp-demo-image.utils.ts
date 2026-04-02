/**
 * Demo-URL генерация для фото (picsum.photos).
 * Поведение должно оставаться идентичным текущим форматам seed/размеров.
 */
export function picsumImageUrl(seed: string, width: number, height: number): string {
  return `https://picsum.photos/seed/${seed}/${width}/${height}`;
}

