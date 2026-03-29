declare global {
  namespace Express {
    interface Request {
      auth?: {
        userId: string;
        login: string;
        roleId: string;
      };
    }
  }
}

export {};
