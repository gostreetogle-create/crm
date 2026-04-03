import type { StandaloneDictionaryCreateKey } from './standalone-dictionary-create.meta';

/**
 * Перед `location.back()` из полноэкранного standalone нужно закрыть соответствующую модалку,
 * иначе остаётся «залипший» UI. См. `navigateBackFromStandaloneDictionaryCreate`.
 * Также submit сохранения должен **завершиться** (await HTTP) до `back`, иначе store и второй
 * `loadItems()` на хабе могут дать пустую таблицу — см. `docs/frontend/dictionaries-crud-playbook.md` раздел 6.
 */
export function callStandaloneCloseForKey(
  key: StandaloneDictionaryCreateKey | null,
  closers: Record<StandaloneDictionaryCreateKey, () => void>,
): void {
  if (key) closers[key]();
}
