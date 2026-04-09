import { ThemeTokens } from './theme-schema';

/**
 * Пишет ThemeTokens в inline-стили корневого элемента (все --* из ThemeStore).
 * Единственная точка синхронизации токенов → CSS variables.
 */
export function applyThemeTokensToDocument(
  theme: ThemeTokens,
  target: HTMLElement = document.documentElement,
): void {
  const root = target.style;
  root.setProperty('--font-family-base', theme.fontFamilyBase);
  root.setProperty('--font-size-base', theme.fontSizeBase);
  root.setProperty('--font-size-label', theme.fontSizeLabel);
  root.setProperty('--font-size-small', theme.fontSizeSmall);
  root.setProperty('--font-size-card-title', theme.fontSizeCardTitle);
  root.setProperty('--font-size-page-title', theme.fontSizePageTitle);
  root.setProperty('--text-primary', theme.textPrimary);
  root.setProperty('--text-muted', theme.textMuted);
  root.setProperty('--font-size-control', theme.fontSizeBase);
  root.setProperty('--text-form-label', theme.textMuted);
  root.setProperty('--bg-base', theme.bgBase);
  root.setProperty('--page-shell-bg-bottom', theme.pageShellBgBottom);
  root.setProperty('--bg-gradient-a', theme.bgGradientA);
  root.setProperty('--bg-gradient-b', theme.bgGradientB);
  root.setProperty('--surface', theme.surface);
  root.setProperty('--surface-soft', theme.surfaceSoft);
  root.setProperty('--border-color', theme.borderColor);
  root.setProperty('--shadow-color', theme.shadowColor);
  root.setProperty('--accent', theme.accent);
  root.setProperty('--success', theme.success);
  root.setProperty('--icon-affirm', theme.iconAffirm);
  root.setProperty('--icon-accent', theme.iconAccent);
  root.setProperty('--icon-muted', theme.iconMuted);
  root.setProperty('--icon-warning', theme.iconWarning);
  root.setProperty('--icon-danger', theme.iconDanger);
  root.setProperty('--danger', theme.danger);
  root.setProperty('--warning', theme.warning);
  root.setProperty('--ui-input-padding-y', theme.uiInputPaddingY);
  root.setProperty('--ui-input-padding-x', theme.uiInputPaddingX);
  root.setProperty('--ui-button-padding-y', theme.uiButtonPaddingY);
  root.setProperty('--ui-button-padding-x', theme.uiButtonPaddingX);
  root.setProperty('--ui-button-primary-bg', theme.uiButtonPrimaryBg);
  root.setProperty('--ui-button-primary-text', theme.uiButtonPrimaryText);
  root.setProperty('--ui-button-primary-border-color', theme.uiButtonPrimaryBorderColor);
  root.setProperty('--ui-button-soft-bg', theme.uiButtonSoftBg);
  root.setProperty('--ui-button-soft-text', theme.uiButtonSoftText);
  root.setProperty('--ui-button-soft-border-color', theme.uiButtonSoftBorderColor);
  root.setProperty('--ui-card-padding', theme.uiCardPadding);
  root.setProperty('--ui-card-margin-top', theme.uiCardMarginTop);
  root.setProperty('--ui-card-title-margin-bottom', theme.uiCardTitleMarginBottom);
  root.setProperty('--ui-fact-padding-y', theme.uiFactPaddingY);
  root.setProperty('--ui-fact-padding-x', theme.uiFactPaddingX);
  root.setProperty('--ui-fact-label-font-size', theme.uiFactLabelFontSize);
  root.setProperty('--ui-table-head-padding-y', theme.uiTableHeadPaddingY);
  root.setProperty('--ui-table-head-padding-x', theme.uiTableHeadPaddingX);
  root.setProperty('--ui-table-cell-padding-y', theme.uiTableCellPaddingY);
  root.setProperty('--ui-table-cell-padding-x', theme.uiTableCellPaddingX);
  root.setProperty('--ui-table-head-font-size', theme.uiTableHeadFontSize);
  root.setProperty('--ui-table-cell-font-size', theme.uiTableCellFontSize);
  root.setProperty('--ui-modal-backdrop-padding', theme.uiModalBackdropPadding);
  root.setProperty('--ui-modal-header-padding-y', theme.uiModalHeaderPaddingY);
  root.setProperty('--ui-modal-header-padding-x', theme.uiModalHeaderPaddingX);
  root.setProperty('--ui-modal-title-font-size', theme.uiModalTitleFontSize);
  root.setProperty('--ui-modal-content-padding', theme.uiModalContentPadding);
  root.setProperty('--ui-modal-actions-padding-top', theme.uiModalActionsPaddingTop);
  root.setProperty('--ui-modal-actions-padding-x', theme.uiModalActionsPaddingX);
  root.setProperty('--ui-modal-actions-padding-bottom', theme.uiModalActionsPaddingBottom);
  root.setProperty('--ui-app-header-padding-y', theme.uiAppHeaderPaddingY);
  root.setProperty('--ui-app-header-padding-x', theme.uiAppHeaderPaddingX);
  root.setProperty('--ui-nav-gap', theme.uiNavGap);
  root.setProperty('--ui-nav-link-padding-y', theme.uiNavLinkPaddingY);
  root.setProperty('--ui-nav-link-padding-x', theme.uiNavLinkPaddingX);
  root.setProperty('--ui-page-shell-padding-top', theme.uiPageShellPaddingTop);
  root.setProperty('--ui-page-shell-padding-x', theme.uiPageShellPaddingX);
  root.setProperty('--ui-page-shell-padding-bottom', theme.uiPageShellPaddingBottom);
  root.setProperty('--ui-space-1', theme.uiSpace1);
  root.setProperty('--ui-space-2', theme.uiSpace2);
  root.setProperty('--ui-space-3', theme.uiSpace3);
  root.setProperty('--ui-space-4', theme.uiSpace4);
  root.setProperty('--ui-row-action-btn-radius', theme.uiRowActionBtnRadius);
  root.setProperty('--ui-shadow-card-offset-y', theme.uiShadowCardOffsetY);
  root.setProperty('--ui-shadow-card-blur', theme.uiShadowCardBlur);
  root.setProperty('--ui-shadow-card-thin-offset-y', theme.uiShadowCardThinOffsetY);
  root.setProperty('--ui-space-0p5', theme.uiSpace0p5);
  root.setProperty('--ui-space-7', theme.uiSpace7);
  root.setProperty('--ui-space-14', theme.uiSpace14);
  root.setProperty('--ui-space-10', theme.uiSpace10);
  root.setProperty('--ui-backdrop-blur-md', theme.uiBackdropBlurMd);
  root.setProperty('--ui-backdrop-blur-sm', theme.uiBackdropBlurSm);
  root.setProperty('--ui-control-min-height', theme.uiControlMinHeight);
  root.setProperty('--ui-theme-picker-min-width', theme.uiThemePickerMinWidth);
  root.setProperty('--ui-crud-actions-col-width', theme.uiCrudActionsColWidth);
  root.setProperty('--ui-crud-card-label-width', theme.uiCrudCardLabelWidth);
  root.setProperty('--ui-modal-shadow-offset-y', theme.uiModalShadowOffsetY);
  root.setProperty('--ui-modal-shadow-blur', theme.uiModalShadowBlur);
  root.setProperty('--radius-card', theme.radiusCard);
  root.setProperty('--radius-pill', theme.radiusPill);

  /* Кириллица и локаль документа (браузерный выбор шрифтов / переносы). */
  if (typeof document !== 'undefined') {
    document.documentElement.lang = 'ru';
  }
}
