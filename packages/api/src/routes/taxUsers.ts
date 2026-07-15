import { Router } from "express";
import type { PrismaClient } from "@prisma/client";
import { createTaxUserSchema } from "@fisqo/core";

export function createTaxUsersRouter(prisma: PrismaClient): Router {
  const router = Router();

  router.get("/", async (_req, res) => {
    const taxUsers = await prisma.taxUser.findMany({
      orderBy: { createdAt: "asc" },
    });
    res.json({
      taxUsers: taxUsers.map((u) => ({
        id: u.id,
        pan: u.pan,
        dateOfBirth: u.dateOfBirth.toISOString(),
      })),
    });
  });

  router.post("/", async (req, res) => {
    const parsed = createTaxUserSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        code: "VALIDATION_ERROR",
        message: "Invalid tax user data.",
        details: parsed.error.flatten(),
      });
      return;
    }

    try {
      const taxUser = await prisma.taxUser.create({
        data: {
          pan: parsed.data.pan,
          dateOfBirth: new Date(parsed.data.dateOfBirth),
        },
      });
      res.status(201).json({
        taxUser: {
          id: taxUser.id,
          pan: taxUser.pan,
          dateOfBirth: taxUser.dateOfBirth.toISOString(),
        },
      });
    } catch (err) {
      if (
        typeof err === "object" &&
        err !== null &&
        "code" in err &&
        (err as { code: string }).code === "P2002"
      ) {
        res.status(409).json({
          code: "DUPLICATE_PAN",
          message: "A tax user with this PAN already exists.",
        });
        return;
      }
      throw err;
    }
  });

  return router;
}
