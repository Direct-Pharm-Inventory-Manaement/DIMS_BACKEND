import { Router, type NextFunction, type Request, type Response } from "express";
import { z } from "zod";
import { requireAuth } from "../middleware/require-auth";
import {
  createUser,
  getSummary,
  listUsers,
  resetUserPassword,
  setUserStatus,
  updateUser,
} from "../services/users.service";

const router = Router();

router.use(requireAuth);

const ROLE_ENUM = z.enum(["super_admin", "administrator", "pharmacist", "store_manager", "cashier"]);

const listQuerySchema = z.object({
  search: z.string().trim().min(1).optional(),
  role: ROLE_ENUM.optional(),
  branch: z.string().min(1).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(500).default(10),
});

const createSchema = z.object({
  name: z.string().trim().min(1, "Name is required."),
  email: z.string().trim().email("Enter a valid email address."),
  username: z.string().trim().min(3, "Username must be at least 3 characters."),
  role: ROLE_ENUM,
  branch: z.string().trim().min(1, "Branch is required."),
});

const updateSchema = createSchema.partial();

const statusSchema = z.object({
  status: z.enum(["active", "suspended"]),
});

router.get("/summary", async (_req, res, next) => {
  try {
    res.json(await getSummary());
  } catch (error) {
    next(error);
  }
});

router.get("/", async (req: Request, res: Response, next: NextFunction) => {
  try {
    res.json(await listUsers(listQuerySchema.parse(req.query)));
  } catch (error) {
    next(error);
  }
});

router.post("/", async (req: Request, res: Response, next: NextFunction) => {
  try {
    res.status(201).json(await createUser(createSchema.parse(req.body)));
  } catch (error) {
    next(error);
  }
});

router.patch("/:id", async (req: Request, res: Response, next: NextFunction) => {
  try {
    res.json(await updateUser(req.params.id, updateSchema.parse(req.body)));
  } catch (error) {
    next(error);
  }
});

router.post("/:id/status", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { status } = statusSchema.parse(req.body);
    res.json(await setUserStatus(req.params.id, status));
  } catch (error) {
    next(error);
  }
});

router.post("/:id/reset-password", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const temporaryPassword = await resetUserPassword(req.params.id);
    res.json({ temporaryPassword });
  } catch (error) {
    next(error);
  }
});

export default router;
