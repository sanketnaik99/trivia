// Extend Express Request interface to include userId property
declare global {
  namespace Express {
    interface Request {
      userId?: string;
    }
  }
}

export {};