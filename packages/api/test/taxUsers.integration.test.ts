import { describe, it, expect, beforeEach, afterAll } from "vitest";
import request from "supertest";
import { PrismaClient } from "@prisma/client";
import { createApp } from "../src/app.js";

const prisma = new PrismaClient();
const app = createApp(prisma);

beforeEach(async () => {
  await prisma.taxUser.deleteMany();
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe("GET /api/v1/tax-users", () => {
  it("returns an empty list when no tax users exist", async () => {
    const res = await request(app).get("/api/v1/tax-users");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ taxUsers: [] });
  });

  it("returns created tax users", async () => {
    await prisma.taxUser.create({
      data: { pan: "ABCDE1234F", dateOfBirth: new Date("1990-01-01") },
    });
    const res = await request(app).get("/api/v1/tax-users");
    expect(res.status).toBe(200);
    expect(res.body.taxUsers).toHaveLength(1);
    expect(res.body.taxUsers[0].pan).toBe("ABCDE1234F");
  });
});

describe("POST /api/v1/tax-users", () => {
  it("creates a tax user with valid data", async () => {
    const res = await request(app)
      .post("/api/v1/tax-users")
      .send({ pan: "abcde1234f", dateOfBirth: "1990-01-01" });
    expect(res.status).toBe(201);
    expect(res.body.taxUser.pan).toBe("ABCDE1234F");
  });

  it("rejects a malformed PAN with 400", async () => {
    const res = await request(app)
      .post("/api/v1/tax-users")
      .send({ pan: "invalid", dateOfBirth: "1990-01-01" });
    expect(res.status).toBe(400);
    expect(res.body.code).toBe("VALIDATION_ERROR");
  });

  it("rejects a duplicate PAN with 409", async () => {
    await request(app)
      .post("/api/v1/tax-users")
      .send({ pan: "ABCDE1234F", dateOfBirth: "1990-01-01" });
    const res = await request(app)
      .post("/api/v1/tax-users")
      .send({ pan: "ABCDE1234F", dateOfBirth: "1991-02-02" });
    expect(res.status).toBe(409);
    expect(res.body.code).toBe("DUPLICATE_PAN");
  });
});
