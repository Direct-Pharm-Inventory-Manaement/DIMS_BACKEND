import type { NextFunction, Request, Response } from "express";
import { verifyToken, type TokenPayload } from "../utils/jwt";
import { HttpError } from "../utils/http-error";

declare module "express-serve-static-core" {
  interface Request {
    user?: TokenPayload;
  }
}

export function requireAuth(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    next(new HttpError(401, "Sign in to continue."));
    return;
  }
  try {
    req.user = verifyToken(header.slice("Bearer ".length));
    next();
  } catch {
    next(new HttpError(401, "Your session has expired. Sign in again."));
  }
}
