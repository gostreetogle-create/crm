/**
 * @jest-environment jsdom
 */
import { scrollToFirstInvalidControlInForm } from './dictionaries-form-a11y';

describe('dictionaries-form-a11y', () => {
  it('exports scrollToFirstInvalidControlInForm', () => {
    expect(typeof scrollToFirstInvalidControlInForm).toBe('function');
  });

  it('focuses and scrolls first ng-invalid control in form', () => {
    document.body.innerHTML = `
      <form id="hub-test-form">
        <input id="first" class="ng-invalid" type="text" />
        <input id="second" class="ng-invalid" type="text" />
      </form>
    `;
    const first = document.getElementById('first') as HTMLInputElement;
    const scrollIntoViewMock = jest.fn();
    const focusMock = jest.fn();
    first.scrollIntoView = scrollIntoViewMock as unknown as typeof first.scrollIntoView;
    first.focus = focusMock as unknown as typeof first.focus;

    scrollToFirstInvalidControlInForm('hub-test-form', document);

    expect(focusMock).toHaveBeenCalledWith({ preventScroll: false });
    expect(scrollIntoViewMock).toHaveBeenCalledWith({ block: 'center', behavior: 'smooth' });
  });

  it('no-op when form id missing', () => {
    expect(() => scrollToFirstInvalidControlInForm('nonexistent-form-id', document)).not.toThrow();
  });
});
