import { test, expect } from "@playwright/test";

test("view empty dashboard, add a tax user, and reject a duplicate PAN", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.getByText(/Add a tax user to get started/i)).toBeVisible();

  await page.getByRole("button", { name: "Add new tax user" }).click();
  await page.getByLabel("PAN").fill("abcde1234f");
  await page.getByLabel("Date of Birth").fill("1990-05-14");
  await page.getByRole("button", { name: "Save" }).click();

  await expect(page.getByTestId("tax-user-section")).toHaveText("ABCDE1234F");

  await page.getByRole("button", { name: "Add new tax user" }).click();
  await page.getByLabel("PAN").fill("ABCDE1234F");
  await page.getByLabel("Date of Birth").fill("1991-06-15");
  await page.getByRole("button", { name: "Save" }).click();

  await expect(page.getByRole("alert")).toHaveText(
    "A tax user with this PAN already exists."
  );
});
