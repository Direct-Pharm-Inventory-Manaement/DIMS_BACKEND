import cors from "cors";
import express from "express";
import { env } from "./config/env";
import { errorHandler, notFoundHandler } from "./middleware/error-handler";
import authRouter from "./routes/auth";
import healthRouter from "./routes/health";
import medicinesRouter from "./routes/medicines";

const app = express();

app.use(cors({ origin: env.corsOrigin }));
app.use(express.json());

app.use("/health", healthRouter);
app.use("/auth", authRouter);
app.use("/medicines", medicinesRouter);

app.use(notFoundHandler);
app.use(errorHandler);

export default app;
