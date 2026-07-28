export type AuthUser = {
  id: string;
  companyId: string;
<<<<<<< HEAD
  role: UserRole;
=======
  role?: string;
>>>>>>> 8161a7dc580260cea705d87c5e422d72c06da5a8
};

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

export {};
