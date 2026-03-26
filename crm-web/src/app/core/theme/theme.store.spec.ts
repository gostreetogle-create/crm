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
    store['applyPreset']('dark');

    expect(store.theme().name).toBe('dark');
    expect(store.preset()).toBe('dark');
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
    // ThemeStore нормализует любые темы в light/dark
    expect(store.theme().name).toBe('light');
    expect(store.isDirty()).toBe(true);
  });

  it('saveToStorage clears dirty flag', () => {
    store['applyPreset']('light');
    expect(store.isDirty()).toBe(true);

    store['saveToStorage']();

    expect(store.isDirty()).toBe(false);
    expect(localStorage.getItem('crm-web.theme.tokens.v1')).toContain('"name":"light"');
  });
});
