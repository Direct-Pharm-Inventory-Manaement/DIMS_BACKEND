import cors from "cors";
import express from "express";
import { env } from "./config/env";
import { errorHandler, notFoundHandler } from "./middleware/error-handler";
import authRouter from "./routes/auth";
import branchesRouter from "./routes/branches";
import expiryRiskRouter from "./routes/expiry-risk";
import healthRouter from "./routes/health";
import lowStockRouter from "./routes/low-stock";
import medicinesRouter from "./routes/medicines";
import reportsRouter from "./routes/reports";
import settingsRouter from "./routes/settings";
import transfersRouter from "./routes/transfers";
import usersRouter from "./routes/users";

const app = express();

app.use(cors({ origin: env.corsOrigin }));
app.use(express.json());

app.use("/health", healthRouter);
app.use("/auth", authRouter);
app.use("/medicines", medicinesRouter);
app.use("/expiry-risk", expiryRiskRouter);
app.use("/transfers", transfersRouter);
app.use("/low-stock", lowStockRouter);
app.use("/users", usersRouter);
app.use("/settings", settingsRouter);
app.use("/branches", branchesRouter);
app.use("/reports", reportsRouter);

app.use(notFoundHandler);
app.use(errorHandler);

export default app;
