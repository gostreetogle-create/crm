import { TestBed } from '@angular/core/testing';
import { ThemeStore } from './theme.store';

describe('ThemeStore', () => {
  let store: InstanceType<typeof ThemeStore>;

  beforeEach(() => {
    localStorage.clear();
    document.documentElement.className = '';

    TestBed.configureTestingModule({});
    store = TestBed.inject(ThemeStore);
  });

  it('applyPreset updates theme and dirty flag', () => {
    store['applyPreset']('graphite');

    expect(store.theme().name).toBe('graphite');
    expect(store.preset()).toBe('graphite');
    expect(store.isDirty()).toBe(true);
  });

  it('applyThemeFromJson applies valid theme json', () => {
    const result = store['applyThemeFromJson'](
      JSON.stringify({
        name: 'custom',
        fontFamilyBase: 'Arial, sans-serif',
      })
    );

    expect(result.ok).toBe(true);
    expect(store.theme().name).toBe('custom');
    expect(store.isDirty()).toBe(true);
  });

  it('saveToStorage clears dirty flag', () => {
    store['applyPreset']('sand');
    expect(store.isDirty()).toBe(true);

    store['saveToStorage']();

    expect(store.isDirty()).toBe(false);
    expect(localStorage.getItem('crm-web.theme.tokens.v1')).toContain('"name":"sand"');
  });
});
