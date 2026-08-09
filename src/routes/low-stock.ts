import { Router, type NextFunction, type Request, type Response } from "express";
import { z } from "zod";
import { requireAuth } from "../middleware/require-auth";
import {
  getBranchRisk,
  getConsumptionVelocity,
  getRestockingRecommendations,
  getSummary,
  listPredictions,
} from "../services/low-stock.service";

const router = Router();

router.use(requireAuth);

const baseQuerySchema = z.object({
  branch: z.string().min(1).optional(),
  // No hardcoded default — omitted means "use the admin-configured default"
  // (Settings → Inventory Thresholds → Prediction Window), resolved in the service layer.
  windowDays: z.coerce.number().int().positive().max(90).optional(),
});

const listQuerySchema = baseQuerySchema.extend({
  // z.coerce.boolean() would treat the literal string "false" as truthy
  // (any non-empty string coerces to true) — parse the actual value instead.
  outOfStockOnly: z
    .string()
    .optional()
    .transform((v) => v === "true"),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(500).default(4),
});

router.get("/summary", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { branch, windowDays } = baseQuerySchema.parse(req.query);
    res.json(await getSummary(branch, windowDays));
  } catch (error) {
    next(error);
  }
});

router.get("/predictions", async (req: Request, res: Response, next: NextFunction) => {
  try {
    res.json(await listPredictions(listQuerySchema.parse(req.query)));
  } catch (error) {
    next(error);
  }
});

router.get("/branch-risk", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { windowDays } = baseQuerySchema.parse(req.query);
    res.json(await getBranchRisk(windowDays));
  } catch (error) {
    next(error);
  }
});

router.get("/restocking", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { branch, windowDays } = baseQuerySchema.parse(req.query);
    res.json(await getRestockingRecommendations(branch, windowDays));
  } catch (error) {
    next(error);
  }
});

router.get("/velocity", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { branch, windowDays } = baseQuerySchema.parse(req.query);
    res.json(await getConsumptionVelocity(branch, windowDays));
  } catch (error) {
    next(error);
  }
});

export default router;
