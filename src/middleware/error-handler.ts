import type { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";
import { env } from "../config/env";
import { HttpError } from "../utils/http-error";

export function notFoundHandler(_req: Request, res: Response) {
  res.status(404).json({ message: "Not found" });
}

export function errorHandler(
  error: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
) {
  if (error instanceof HttpError) {
    res.status(error.status).json({ message: error.message });
    return;
  }
  if (error instanceof ZodError) {
    const first = error.issues[0];
    res.status(400).json({
      message: first ? first.message : "Invalid request body",
    });
    return;
  }
  console.error(error);
  res.status(500).json({
    message:
      env.nodeEnv === "production"
        ? "Internal server error"
        : error instanceof Error
          ? error.message
          : "Internal server error",
  });
}
