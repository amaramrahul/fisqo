import express, { type Express } from "express";
import type { PrismaClient } from "@prisma/client";
import { createTaxUsersRouter } from "./routes/taxUsers.js";

export function createApp(prisma: PrismaClient): Express {
  const app = express();
  app.use(express.json());
  app.use("/api/v1/tax-users", createTaxUsersRouter(prisma));
  return app;
}
