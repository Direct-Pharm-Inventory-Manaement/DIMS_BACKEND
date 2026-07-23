import { Router, type NextFunction, type Request, type Response } from "express";
import { z } from "zod";
import { requireAuth } from "../middleware/require-auth";
import {
  createMedicine,
  deleteMedicine,
  getFacets,
  getSummary,
  listMedicines,
  updateMedicine,
} from "../services/medicines.service";

const router = Router();

router.use(requireAuth);

const listQuerySchema = z.object({
  status: z
    .enum(["in-stock", "low-stock", "critical-expiry", "out-of-stock"])
    .optional(),
  category: z.string().min(1).optional(),
  branch: z.string().min(1).optional(),
  search: z.string().trim().min(1).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(500).default(5),
});

const medicineInputSchema = z.object({
  name: z.string().trim().min(1, "Name is required."),
  strength: z.string().trim().optional(),
  form: z.string().trim().min(1, "Form is required."),
  packaging: z.string().trim().min(1, "Packaging is required."),
  category: z.string().trim().min(1, "Category is required."),
  batchNo: z.string().trim().min(1, "Batch number is required."),
  branch: z.string().trim().min(1, "Branch is required."),
  quantity: z.number().int().min(0),
  unitPriceGhs: z.number().min(0),
  lowStockThreshold: z.number().int().min(0).optional(),
  expiryDate: z.iso.datetime({ message: "Expiry date must be an ISO date." }),
});

router.get("/", async (req: Request, res: Response, next: NextFunction) => {
  try {
    res.json(await listMedicines(listQuerySchema.parse(req.query)));
  } catch (error) {
    next(error);
  }
});

router.get("/facets", async (_req, res, next) => {
  try {
    res.json(await getFacets());
  } catch (error) {
    next(error);
  }
});

router.get("/summary", async (_req, res, next) => {
  try {
    res.json(await getSummary());
  } catch (error) {
    next(error);
  }
});

router.post("/", async (req: Request, res: Response, next: NextFunction) => {
  try {
    res.status(201).json(await createMedicine(medicineInputSchema.parse(req.body)));
  } catch (error) {
    next(error);
  }
});

router.patch("/:id", async (req: Request, res: Response, next: NextFunction) => {
  try {
    res.json(
      await updateMedicine(
        req.params.id,
        medicineInputSchema.partial().parse(req.body),
      ),
    );
  } catch (error) {
    next(error);
  }
});

router.delete("/:id", async (req: Request, res: Response, next: NextFunction) => {
  try {
    await deleteMedicine(req.params.id);
    res.status(204).end();
  } catch (error) {
    next(error);
  }
});

export default router;
