import cors from "cors";
import express from "express";
import { env } from "./config/env";
import healthRouter from "./routes/health";

const app = express();

app.use(cors({ origin: env.corsOrigin }));
app.use(express.json());

app.use("/health", healthRouter);

export default app;
