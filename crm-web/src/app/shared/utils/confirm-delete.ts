export function confirmDeleteAction(entityLabel = 'запись'): boolean {
  return window.confirm(`Удалить ${entityLabel}?`);
}

