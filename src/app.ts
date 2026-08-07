import cors from "cors";
import express from "express";
import { env } from "./config/env";
import { errorHandler, notFoundHandler } from "./middleware/error-handler";
import authRouter from "./routes/auth";
import expiryRiskRouter from "./routes/expiry-risk";
import healthRouter from "./routes/health";
import medicinesRouter from "./routes/medicines";
import transfersRouter from "./routes/transfers";

const app = express();

app.use(cors({ origin: env.corsOrigin }));
app.use(express.json());

app.use("/health", healthRouter);
app.use("/auth", authRouter);
app.use("/medicines", medicinesRouter);
app.use("/expiry-risk", expiryRiskRouter);
app.use("/transfers", transfersRouter);

app.use(notFoundHandler);
app.use(errorHandler);

export default app;
