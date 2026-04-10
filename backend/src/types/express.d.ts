declare global {
  namespace Express {
    interface Request {
      /** Корреляция запроса с логами (middleware `request-context`). */
      requestId?: string;
      /** Структурные логи запроса (stderr JSON, не `console.log`). */
      log?: {
        info: (meta: Record<string, unknown>) => void;
        warn: (meta: Record<string, unknown>) => void;
        error: (meta: Record<string, unknown>) => void;
      };
      auth?: {
        userId: string;
        login: string;
        roleId: string;
        roleCode?: string;
        isSystemRole?: boolean;
      };
    }
  }
}

export {};
