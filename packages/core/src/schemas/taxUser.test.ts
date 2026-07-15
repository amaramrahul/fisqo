import { describe, it, expect } from "vitest";
import { panSchema, dateOfBirthSchema, createTaxUserSchema } from "./taxUser.js";

describe("panSchema", () => {
  it("accepts a valid PAN", () => {
    expect(panSchema.parse("ABCDE1234F")).toBe("ABCDE1234F");
  });

  it("normalises lowercase input to uppercase", () => {
    expect(panSchema.parse("abcde1234f")).toBe("ABCDE1234F");
  });

  it("rejects a malformed PAN", () => {
    expect(() => panSchema.parse("12345ABCDE")).toThrow();
  });

  it("rejects a PAN with the wrong length", () => {
    expect(() => panSchema.parse("ABCDE123F")).toThrow();
  });
});

describe("dateOfBirthSchema", () => {
  it("accepts a valid past date", () => {
    expect(dateOfBirthSchema.parse("1990-05-14")).toBe("1990-05-14");
  });

  it("rejects an empty value", () => {
    expect(() => dateOfBirthSchema.parse("")).toThrow();
  });

  it("rejects a future date", () => {
    const future = new Date();
    future.setFullYear(future.getFullYear() + 1);
    expect(() => dateOfBirthSchema.parse(future.toISOString())).toThrow();
  });
});

describe("createTaxUserSchema", () => {
  it("accepts a valid payload", () => {
    const result = createTaxUserSchema.parse({
      pan: "ABCDE1234F",
      dateOfBirth: "1990-05-14",
    });
    expect(result).toEqual({ pan: "ABCDE1234F", dateOfBirth: "1990-05-14" });
  });
});
