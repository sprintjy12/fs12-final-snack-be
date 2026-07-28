export type AuthUser = {
  id: string;
  companyId: string;
  role?: string;
};

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

export {};
