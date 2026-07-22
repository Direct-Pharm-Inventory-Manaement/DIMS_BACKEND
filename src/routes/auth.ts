import { Router, type NextFunction, type Request, type Response } from "express";
import rateLimit from "express-rate-limit";
import { z } from "zod";
import {
  loginWithPassword,
  requestPasswordOtp,
  verifyPasswordOtp,
} from "../services/auth.service";

const router = Router();

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many attempts. Please try again later." },
});

const loginSchema = z.object({
  identifier: z.string().trim().min(1, "Enter your username or email address."),
  password: z.string().min(1, "Enter your password."),
});

const forgotPasswordSchema = z.object({
  email: z.string().trim().email("Enter a valid email address."),
});

const verifyOtpSchema = z.object({
  email: z.string().trim().email("Enter a valid email address."),
  otp: z.string().regex(/^\d{6}$/, "Enter the 6-digit code from your email."),
});

router.post(
  "/login",
  authLimiter,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { identifier, password } = loginSchema.parse(req.body);
      res.json(await loginWithPassword(identifier, password));
    } catch (error) {
      next(error);
    }
  },
);

router.post(
  "/forgot-password",
  authLimiter,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { email } = forgotPasswordSchema.parse(req.body);
      await requestPasswordOtp(email);
      res.json({
        message:
          "If an account exists for that email, a verification code has been sent.",
      });
    } catch (error) {
      next(error);
    }
  },
);

router.post(
  "/verify-otp",
  authLimiter,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { email, otp } = verifyOtpSchema.parse(req.body);
      res.json(await verifyPasswordOtp(email, otp));
    } catch (error) {
      next(error);
    }
  },
);

export default router;
