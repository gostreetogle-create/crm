import { InjectionToken } from '@angular/core';

export type ApiConfig = {
  baseUrl: string;
  useMockRepositories: boolean;
};

export const DEFAULT_API_CONFIG: ApiConfig = {
  // Can stay empty in development if proxy/rewrite is used.
  baseUrl: '',
  // While backend is not ready we keep mock repositories enabled.
  useMockRepositories: true,
};

export const API_CONFIG = new InjectionToken<ApiConfig>('API_CONFIG');

