import { bootstrapApplication } from '@angular/platform-browser';
import { applyThemeTokensToDocument, resolveActiveThemeFromStorage } from '@srm/theme-core';
import { appConfig } from './app/app.config';
import { App } from './app/app';

/* Токены до первого рендера (без дублирования полного :root в styles.scss) */
applyThemeTokensToDocument(resolveActiveThemeFromStorage());

bootstrapApplication(App, appConfig).catch((err) => console.error(err));
