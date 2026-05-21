import { test, expect } from "@playwright/test";

test("public home exposes discover CTA", async ({ page }) => {
  await page.goto("/");
  const skip = page.getByRole("button", { name: "Пропустить" });
  if (await skip.isVisible()) {
    await skip.click();
  }
  await expect(page.getByRole("button", { name: "Открыть публичный каталог" })).toBeVisible();
});
