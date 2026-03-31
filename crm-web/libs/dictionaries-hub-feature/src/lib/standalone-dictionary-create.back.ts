import type { StandaloneDictionaryCreateKey } from './standalone-dictionary-create.meta';

/**
 * Перед `location.back()` из полноэкранного standalone нужно закрыть соответствующую модалку,
 * иначе остаётся «залипший» UI. См. `navigateBackFromStandaloneDictionaryCreate`.
 */
export function callStandaloneCloseForKey(
  key: StandaloneDictionaryCreateKey | null,
  closers: Record<StandaloneDictionaryCreateKey, () => void>,
): void {
  if (key) closers[key]();
}
