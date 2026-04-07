import { Route } from '@angular/router';
import { authGuard, permissionGuard } from './core/auth/public-api';
import {
  buildStandaloneDictionaryCreateChildRoutes,
  DICTIONARIES_ROUTE_PROVIDERS,
  DICTIONARIES_PUBLIC_REDIRECT_SEGMENTS,
} from '@srm/dictionaries-hub-feature';

export const appRoutes: Route[] = [
  {
    path: '',
    loadComponent: () => import('@srm/login-feature').then((m) => m.LoginPage),
  },
  {
    path: 'справочники',
    canActivate: [authGuard, permissionGuard],
    data: { permission: 'page.dictionaries' },
    providers: DICTIONARIES_ROUTE_PROVIDERS,
    loadComponent: () => import('@srm/dictionaries-hub-feature').then((m) => m.DictionariesShellComponent),
    children: [
      {
        path: '',
        pathMatch: 'full',
        loadComponent: () => import('@srm/dictionaries-hub-feature').then((m) => m.DictionariesPage),
      },
      {
        path: 'новый-материал',
        loadComponent: () => import('@srm/dictionaries-hub-feature').then((m) => m.DictionariesPage),
        data: { newMaterialPage: true },
      },
      {
        path: 'новая-характеристика-материала',
        loadComponent: () => import('@srm/dictionaries-hub-feature').then((m) => m.DictionariesPage),
        data: { newMaterialCharacteristicPage: true },
      },
      ...buildStandaloneDictionaryCreateChildRoutes(),
    ],
  },
  ...DICTIONARIES_PUBLIC_REDIRECT_SEGMENTS.map((path) => ({
    path,
    redirectTo: '/справочники',
    pathMatch: 'full' as const,
  })),
  {
    path: 'demo',
    canActivate: [authGuard, permissionGuard],
    data: { permission: 'page.demo' },
    loadComponent: () => import('@srm/ui-demo-feature').then((m) => m.UiDemoPage),
  },
  {
    path: 'коммерческое',
    canActivate: [authGuard, permissionGuard],
    data: { permission: 'page.commercialProposal' },
    loadComponent: () => import('@srm/kp-feature').then((m) => m.KpBuilderPage),
  },
  {
    path: 'preferences',
    canActivate: [authGuard, permissionGuard],
    data: { permission: 'page.preferences' },
    loadComponent: () => import('@srm/settings-feature').then((m) => m.UserPreferencesPage),
  },
  {
    path: 'settings',
    canActivate: [authGuard, permissionGuard],
    data: { permission: 'page.admin.settings' },
    loadComponent: () => import('@srm/settings-feature').then((m) => m.AdminSettingsPage),
  },
  { path: '**', redirectTo: '' },
];


