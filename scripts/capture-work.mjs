import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";

await mkdir("images/work", { recursive: true });
const browser = await chromium.launch({ channel: "chromium" });
try {
  for (const [name, url] of [
    ["eventium", "https://www.eventium.be/"],
    ["chiro", "https://www.chironegenmanneke.be/"],
    ["au-fil-du-sport", "https://www.aufildusport.be/"],
  ]) {
    if (process.argv[2] && process.argv[2] !== name) continue;
    const page = await browser.newPage({
      viewport: { width: 1440, height: 1040 },
      deviceScaleFactor: 1,
    });
    await page.goto(url, { waitUntil: "networkidle", timeout: 60000 });
    if (name === "eventium") {
      const language = page.getByRole("button", { name: /English/ });
      if (await language.count()) await language.last().click();
      await page.waitForFunction(
        () => !document.body.innerText.includes("Choose your language"),
      );
      await page.waitForLoadState("networkidle");
      await page
        .waitForFunction(() => !document.querySelector(".animate-pulse"), {
          timeout: 20000,
        })
        .catch(() => {});
    }
    if (name === "au-fil-du-sport") {
      const rejectAnalytics = page.getByRole("button", {
        name: "Refuser",
        exact: true,
      });
      if (await rejectAnalytics.count()) await rejectAnalytics.click();
    }
    await page.evaluate(async () => {
      await document.fonts.ready;
      await Promise.all(
        [...document.images]
          .filter((image) => {
            const bounds = image.getBoundingClientRect();
            return bounds.top < innerHeight && bounds.bottom > 0;
          })
          .map((image) => image.decode().catch(() => {})),
      );
    });
    await page.screenshot({
      path: `images/work/${name}.jpg`,
      type: "jpeg",
      quality: 88,
    });
    console.log(`${name}: ${await page.title()}`);
    await page.close();
  }
} finally {
  await browser.close();
}
