import express, { NextFunction, Request, Response } from "express";
import { config, validateConfig } from "./config";
import { sequelize } from "./db";
import { connectRedis } from "./redis";
import "./models/User";
import "./models/Follow";
import "./models/RefreshToken";
import authRoutes from "./routes/authRoutes";
import userRoutes from "./routes/userRoutes";

const app = express();
app.use(express.json({ limit: "20kb" }));

app.get("/health", (_req, res) => res.json({ status: "ok" }));
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);

app.use((error: unknown, _req: Request, res: Response, _next: NextFunction) => {
  console.error("Request failed:", error instanceof Error ? error.message : error);
  res.status(500).json({ message: "Internal server error." });
});

async function start(): Promise<void> {
  validateConfig();
  await sequelize.authenticate();
  await sequelize.sync(); // Development convenience; use migrations for production.
  await connectRedis();
  app.listen(config.port, () => console.log(`Social App API listening on http://localhost:${config.port}`));
}
start().catch((error) => {
  console.error("Startup failed:", error);
  process.exit(1);
});
