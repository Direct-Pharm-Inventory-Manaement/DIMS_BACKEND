import { Router, type NextFunction, type Request, type Response } from "express";
import { z } from "zod";
import { requireAuth } from "../middleware/require-auth";
import {
  createAction,
  getDistribution,
  getManufacturers,
  getRecentActions,
  getSummary,
  getTrend,
  listAtRisk,
} from "../services/expiry-risk.service";

const router = Router();

router.use(requireAuth);

const listQuerySchema = z.object({
  riskTier: z.enum(["critical", "warning", "advisory"]).optional(),
  manufacturer: z.string().min(1).optional(),
  stockCategory: z.enum(["essential", "cold-chain", "restricted"]).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(500).default(5),
});

const actionSchema = z.object({
  medicineId: z.string().min(1),
  type: z.enum(["clearance", "transfer", "review"]),
});

router.get("/summary", async (_req, res, next) => {
  try {
    res.json(await getSummary());
  } catch (error) {
    next(error);
  }
});

router.get("/medicines", async (req: Request, res: Response, next: NextFunction) => {
  try {
    res.json(await listAtRisk(listQuerySchema.parse(req.query)));
  } catch (error) {
    next(error);
  }
});

router.get("/trend", async (_req, res, next) => {
  try {
    res.json(await getTrend());
  } catch (error) {
    next(error);
  }
});

router.get("/distribution", async (_req, res, next) => {
  try {
    res.json(await getDistribution());
  } catch (error) {
    next(error);
  }
});

router.get("/actions/recent", async (_req, res, next) => {
  try {
    res.json(await getRecentActions());
  } catch (error) {
    next(error);
  }
});

router.post("/actions", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { medicineId, type } = actionSchema.parse(req.body);
    res.status(201).json(await createAction(medicineId, type));
  } catch (error) {
    next(error);
  }
});

router.get("/manufacturers", async (_req, res, next) => {
  try {
    res.json({ manufacturers: await getManufacturers() });
  } catch (error) {
    next(error);
  }
});

export default router;
