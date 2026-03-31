import { HUB_BOARD_DICTIONARY_ROW_DEFS } from './dictionaries-hub-board.config';
import { resolveHubBoardQuickCreate } from './dictionaries-hub-quick-create.registry';

describe('dictionaries-hub-quick-create.registry', () => {
  it('every hub board row has a quick-create target', () => {
    for (const row of HUB_BOARD_DICTIONARY_ROW_DEFS) {
      expect(resolveHubBoardQuickCreate(row.key)).toBeDefined();
    }
  });

  it('resolveHubBoardQuickCreate returns standalone for workTypes', () => {
    expect(resolveHubBoardQuickCreate('workTypes')).toEqual({ kind: 'standalone', key: 'workTypes' });
  });

  it('resolveHubBoardQuickCreate returns undefined for unknown key', () => {
    expect(resolveHubBoardQuickCreate('unknown')).toBeUndefined();
  });
});
