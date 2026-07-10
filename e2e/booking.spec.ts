import { expect, test } from "@playwright/test";

function nextOpenWeekday(): string {
  const date = new Date();
  for (let i = 1; i <= 14; i++) {
    date.setDate(date.getDate() + 1);
    const day = date.getDay();
    // Salon is open every day; prefer Mon–Sat for slightly longer hours
    if (day >= 1 && day <= 6) {
      return date.toISOString().slice(0, 10);
    }
  }
  throw new Error("No open weekday found in next 14 days");
}

test.describe("Online booking", () => {
  test("enhancement multi-select returns availability slots", async ({ page, request }) => {
    const date = nextOpenWeekday();
    const party = JSON.stringify([
      {
        label: "You",
        serviceIds: ["enh-acrylic-full", "enh-acrylic-fill"],
        technicianId: "any",
      },
    ]);

    const response = await request.get(
      `/api/availability?date=${date}&technicianId=any&party=${encodeURIComponent(party)}`
    );

    expect(response.ok()).toBeTruthy();
    const body = (await response.json()) as { slots?: { time: string }[]; error?: string };
    expect(body.error).toBeUndefined();
    expect(Array.isArray(body.slots)).toBeTruthy();
  });

  test("enhancement booking flow reaches confirm step", async ({ page }) => {
    await page.goto("/book");

    await page.getByRole("checkbox", { name: /Full Set/i }).first().check();
    await page.getByRole("checkbox", { name: /Fill-In/i }).first().check();
    await page.getByRole("button", { name: "Continue" }).click();

    await page.getByRole("button", { name: /Any available technician/i }).click();
    await page.getByRole("button", { name: "Continue" }).click();

    await expect(page.getByText("Available times")).toBeVisible({ timeout: 30_000 });

    const timeButton = page.locator('[id="booking-time-slots"] button').first();
    await expect(timeButton).toBeVisible({ timeout: 30_000 });
    await timeButton.click();
    await page.getByRole("button", { name: "Continue" }).click();

    await page.getByLabel(/^Name/i).fill("Test Guest");
    await page.getByLabel(/^Phone number/i).fill("5551234567");
    await page.getByRole("button", { name: "Continue" }).click();

    await expect(page.getByRole("heading", { name: "Confirm appointment" })).toBeVisible();
    await expect(page.getByRole("listitem").filter({ hasText: /Acrylic/i }).first()).toBeVisible();
  });

  test("party booking supports per-guest technician preferences in API", async ({ request }) => {
    const date = nextOpenWeekday();
    const party = JSON.stringify([
      {
        label: "You",
        serviceIds: ["mani-classic"],
        technicianId: "any",
      },
      {
        label: "Friend",
        serviceIds: ["pedi-classic"],
        technicianId: "any",
      },
    ]);

    const response = await request.get(
      `/api/availability?date=${date}&technicianId=any&party=${encodeURIComponent(party)}`
    );

    expect(response.ok()).toBeTruthy();
    const body = (await response.json()) as { slots?: unknown[] };
    expect(Array.isArray(body.slots)).toBeTruthy();
  });

  test("invalid parent enhancement id is rejected by appointments API", async ({ request }) => {
    const date = nextOpenWeekday();
    const response = await request.post("/api/appointments", {
      data: {
        party: [{ label: "You", serviceIds: ["enh-acrylic"], technicianId: "any" }],
        technicianId: "any",
        date,
        time: "10:00",
        customer: { name: "Test", phone: "5551234567" },
        smsConsent: true,
      },
    });

    expect(response.status()).toBe(400);
    const body = (await response.json()) as { error?: string };
    expect(body.error).toMatch(/specific option/i);
  });
});

test.describe("Scheduling API", () => {
  test("technicians endpoint returns roles from database", async ({ request }) => {
    const response = await request.get("/api/technicians");
    expect(response.ok()).toBeTruthy();

    const body = (await response.json()) as {
      technicians?: { id: string; name: string; role: string | null }[];
    };

    expect(body.technicians?.length).toBeGreaterThan(0);
    expect(body.technicians?.[0]).toHaveProperty("role");
  });
});
