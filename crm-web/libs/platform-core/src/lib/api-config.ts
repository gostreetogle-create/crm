import { InjectionToken, isDevMode } from '@angular/core';

export type ApiConfig = {
  baseUrl: string;
  useMockRepositories: boolean;
};

export const DEFAULT_API_CONFIG: ApiConfig = {
  baseUrl: '',
  useMockRepositories: isDevMode(),
};

export const API_CONFIG = new InjectionToken<ApiConfig>('API_CONFIG');
