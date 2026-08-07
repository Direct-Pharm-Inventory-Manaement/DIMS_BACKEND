import { Router, type NextFunction, type Request, type Response } from "express";
import { z } from "zod";
import { requireAuth } from "../middleware/require-auth";
import {
  approveTransfer,
  completeTransfer,
  createTransfer,
  getBranches,
  getSummary,
  listTransfers,
  rejectTransfer,
} from "../services/transfers.service";

const router = Router();

router.use(requireAuth);

const listQuerySchema = z.object({
  status: z.enum(["pending", "approved", "rejected", "completed"]).optional(),
  sourceBranch: z.string().min(1).optional(),
  search: z.string().trim().min(1).optional(),
  dateFrom: z.iso.date().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(500).default(10),
});

const createSchema = z.object({
  medicineId: z.string().min(1),
  destinationBranch: z.string().trim().min(1, "Destination branch is required."),
  quantity: z.number().int().positive("Quantity must be greater than zero."),
  priority: z.enum(["standard", "express", "critical"]).optional(),
  requestedDeliveryDate: z.iso.date().optional(),
  notes: z.string().trim().max(1000).optional(),
});

const rejectSchema = z.object({
  reviewNote: z.string().trim().max(500).optional().default(""),
});

router.get("/summary", async (_req, res, next) => {
  try {
    res.json(await getSummary());
  } catch (error) {
    next(error);
  }
});

router.get("/facets", async (_req, res, next) => {
  try {
    res.json({ branches: await getBranches() });
  } catch (error) {
    next(error);
  }
});

router.get("/", async (req: Request, res: Response, next: NextFunction) => {
  try {
    res.json(await listTransfers(listQuerySchema.parse(req.query)));
  } catch (error) {
    next(error);
  }
});

router.post("/", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const input = createSchema.parse(req.body);
    res.status(201).json(await createTransfer(input, req.user!.sub));
  } catch (error) {
    next(error);
  }
});

router.post("/:id/approve", async (req: Request, res: Response, next: NextFunction) => {
  try {
    res.json(await approveTransfer(req.params.id));
  } catch (error) {
    next(error);
  }
});

router.post("/:id/reject", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { reviewNote } = rejectSchema.parse(req.body);
    res.json(await rejectTransfer(req.params.id, reviewNote));
  } catch (error) {
    next(error);
  }
});

router.post("/:id/complete", async (req: Request, res: Response, next: NextFunction) => {
  try {
    res.json(await completeTransfer(req.params.id));
  } catch (error) {
    next(error);
  }
});

export default router;
