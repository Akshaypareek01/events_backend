declare global {
  namespace Express {
    interface Request {
      userId?: string;
      adminId?: string;
      teacherId?: string;
    }
  }
}

export {};
