import { Router, type NextFunction, type Request, type Response } from "express";
import { z } from "zod";
import { requireAuth } from "../middleware/require-auth";
import { listReportLog, logReport } from "../services/reports.service";

const router = Router();

router.use(requireAuth);

const listQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(10),
});

const logSchema = z.object({
  reportType: z.enum(["full-inventory", "expiry", "low-stock", "transfer-history"]),
  format: z.enum(["pdf", "csv"]),
  fileName: z.string().trim().min(1),
});

router.get("/log", async (req: Request, res: Response, next: NextFunction) => {
  try {
    res.json(await listReportLog(listQuerySchema.parse(req.query)));
  } catch (error) {
    next(error);
  }
});

router.post("/log", async (req: Request, res: Response, next: NextFunction) => {
  try {
    res.status(201).json(await logReport(logSchema.parse(req.body), req.user!.sub));
  } catch (error) {
    next(error);
  }
});

export default router;
