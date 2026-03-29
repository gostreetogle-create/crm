import { InjectionToken } from '@angular/core';

export type ApiConfig = {
  baseUrl: string;
  useMockRepositories: boolean;
};

export const DEFAULT_API_CONFIG: ApiConfig = {
  // Can stay empty in development if proxy/rewrite is used.
  baseUrl: '',
  // Прод: nginx проксирует /api на backend. Локально без API — временно true (вход admin/admin без JWT).
  useMockRepositories: false,
};

export const API_CONFIG = new InjectionToken<ApiConfig>('API_CONFIG');

