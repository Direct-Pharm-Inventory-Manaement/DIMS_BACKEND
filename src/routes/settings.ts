import { Router, type NextFunction, type Request, type Response } from "express";
import { z } from "zod";
import { requireAuth } from "../middleware/require-auth";
import { getSettings, getSystemInfo, updateSettings } from "../services/settings.service";

const router = Router();

router.use(requireAuth);

const updateSchema = z.object({
  systemName: z.string().trim().min(1).optional(),
  organizationName: z.string().trim().min(1).optional(),
  defaultBranch: z.string().trim().min(1).optional(),
  timezone: z.string().trim().min(1).optional(),
  dateFormat: z.string().trim().min(1).optional(),
  criticalAlertDays: z.coerce.number().int().min(1).max(365).optional(),
  highRiskDays: z.coerce.number().int().min(1).max(365).optional(),
  monitoringDays: z.coerce.number().int().min(1).max(365).optional(),
  minimumStockTrigger: z.coerce.number().int().min(0).optional(),
  predictionWindowDays: z.coerce.number().int().min(1).max(90).optional(),
  twoFactorRequired: z.coerce.boolean().optional(),
  autoLogoutMinutes: z.coerce.number().int().min(1).max(240).optional(),
});

router.get("/", async (_req: Request, res: Response, next: NextFunction) => {
  try {
    res.json(await getSettings());
  } catch (error) {
    next(error);
  }
});

router.patch("/", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const input = updateSchema.parse(req.body);
    if (
      input.criticalAlertDays !== undefined ||
      input.highRiskDays !== undefined ||
      input.monitoringDays !== undefined
    ) {
      const current = await getSettings();
      const critical = input.criticalAlertDays ?? current.criticalAlertDays;
      const high = input.highRiskDays ?? current.highRiskDays;
      const monitoring = input.monitoringDays ?? current.monitoringDays;
      if (!(critical < high && high < monitoring)) {
        res.status(400).json({
          message: "Critical Alert days must be less than High Risk days, which must be less than Monitoring days.",
        });
        return;
      }
    }
    res.json(await updateSettings(input));
  } catch (error) {
    next(error);
  }
});

router.get("/system-info", async (_req: Request, res: Response, next: NextFunction) => {
  try {
    res.json(getSystemInfo());
  } catch (error) {
    next(error);
  }
});

export default router;
