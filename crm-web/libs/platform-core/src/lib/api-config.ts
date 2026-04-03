import { InjectionToken } from '@angular/core';

export type ApiConfig = {
  baseUrl: string;
};

export const DEFAULT_API_CONFIG: ApiConfig = {
  baseUrl: '',
};

export const API_CONFIG = new InjectionToken<ApiConfig>('API_CONFIG');
