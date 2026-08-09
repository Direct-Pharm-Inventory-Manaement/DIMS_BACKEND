import { Router, type NextFunction, type Request, type Response } from "express";
import { z } from "zod";
import { requireAuth } from "../middleware/require-auth";
import { listBranches, updateBranch } from "../services/branches.service";

const router = Router();

router.use(requireAuth);

const updateSchema = z.object({
  type: z.enum(["primary", "satellite"]).optional(),
  address: z.string().trim().min(1).optional(),
  phone: z.string().trim().min(1).optional(),
  licenseNumber: z.string().trim().min(1).optional(),
});

router.get("/", async (_req: Request, res: Response, next: NextFunction) => {
  try {
    res.json(await listBranches());
  } catch (error) {
    next(error);
  }
});

router.patch("/:id", async (req: Request, res: Response, next: NextFunction) => {
  try {
    res.json(await updateBranch(req.params.id, updateSchema.parse(req.body)));
  } catch (error) {
    next(error);
  }
});

export default router;
