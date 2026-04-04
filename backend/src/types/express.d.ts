declare global {
  namespace Express {
    interface Request {
      /** Корреляция запроса с логами (middleware `request-context`). */
      requestId?: string;
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
