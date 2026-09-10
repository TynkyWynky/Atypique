import assert from "node:assert/strict";
import { mkdir, readFile } from "node:fs/promises";
import { chromium } from "playwright";
import AxeBuilder from "@axe-core/playwright";
import { serve } from "./serve.mjs";

const server = await serve("dist", 0);
const origin = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch();
const context = await browser.newContext({
  locale: "en-GB",
  reducedMotion: "reduce",
});
const errors = [];
const pages = ["index", "about", "services", "products", "contact"];
const widths = [320, 390, 768, 1024, 1440, 1920];
await mkdir("artifacts", { recursive: true });
// Exercise the UI without sending analytics or contact messages to external services.
await context.route(
  /googletagmanager\.com|google-analytics\.com|plausible\.io/,
  (route) => route.fulfill({ status: 200, body: "" }),
);
const page = await context.newPage();
page.on("pageerror", (error) => errors.push(error.message));
page.on("response", (response) => {
  if (response.url().startsWith(origin) && response.status() >= 400)
    errors.push(`${response.status()} ${response.url()}`);
});

try {
  for (const name of pages) {
    for (const language of ["en", "fr", "nl"]) {
      await page.setViewportSize({ width: 1440, height: 1000 });
      await page.goto(`${origin}/${name}.html?lang=${language}`);
      await page.evaluate(async () => {
        await document.fonts.ready;
        await Promise.all(
          [...document.images].map((image) => {
            image.loading = "eager";
            return image.decode();
          }),
        );
      });
      assert.equal(await page.locator("html").getAttribute("lang"), language);
      assert.equal(await page.locator("h1").count(), 1);
      assert.equal(
        await page.locator('.language-links a[aria-current="true"]').count(),
        2,
      );
      const missing = await page.evaluate(() => {
        const dictionary =
          window.SPECIALEKE_I18N.locales[document.documentElement.lang];
        return [...document.querySelectorAll("*")].flatMap((element) =>
          [...element.attributes]
            .filter((attribute) => attribute.name.startsWith("data-i18n"))
            .filter(
              (attribute) =>
                typeof attribute.value
                  .split(".")
                  .reduce((value, part) => value?.[part], dictionary) !==
                "string",
            )
            .map((attribute) => attribute.value),
        );
      });
      assert.deepEqual(
        missing,
        [],
        `${name}/${language}: missing translations`,
      );
      const metadata = await page.evaluate(() => ({
        title: document.title,
        canonical: document.querySelector('link[rel="canonical"]').href,
        og: document.querySelector('meta[property="og:url"]').content,
        image: document.querySelector('meta[property="og:image"]').content,
        schema: JSON.parse(
          document.getElementById("dynamic-structured-data").textContent,
        ),
      }));
      assert.ok(metadata.title.includes("Specialeke"));
      assert.equal(metadata.canonical, metadata.og);
      assert.ok(metadata.image.endsWith("/images/SpecialekeLogo.png"));
      assert.ok(
        metadata.schema["@graph"].some(
          (item) => item.email === "atypique.professional@gmail.com",
        ),
      );
      const expectedPath = name === "index" ? "/" : `/${name}.html`;
      assert.equal(
        metadata.canonical,
        `https://specialeke.com${expectedPath}${language === "en" ? "" : "?lang=" + language}`,
      );
      const desktopAxe = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
        .analyze();
      assert.deepEqual(
        desktopAxe.violations.map((item) => ({
          id: item.id,
          nodes: item.nodes.map((node) => node.target),
        })),
        [],
        `${name}/${language}: desktop accessibility`,
      );

      for (const width of widths) {
        await page.setViewportSize({ width, height: 960 });
        const overflow = await page.evaluate(() => ({
          width: innerWidth,
          document: document.documentElement.scrollWidth,
          elements: [...document.querySelectorAll("main *")]
            .filter((element) => {
              const rect = element.getBoundingClientRect();
              return (
                rect.width > 0 &&
                (rect.right > innerWidth + 1 || rect.left < -1) &&
                !element.closest(".wordmark, .honeypot")
              );
            })
            .map((element) => `${element.tagName}.${element.className}`),
        }));
        assert.ok(
          overflow.document <= width + 1,
          `${name}/${language}@${width}: ${JSON.stringify(overflow)}`,
        );
        if (width === 390) {
          const mobileAxe = await new AxeBuilder({ page })
            .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
            .analyze();
          assert.deepEqual(
            mobileAxe.violations.map((item) => ({
              id: item.id,
              nodes: item.nodes.map((node) => node.target),
            })),
            [],
            `${name}/${language}: mobile accessibility`,
          );
        }
        if (language === "en" && [390, 1440].includes(width)) {
          await page.screenshot({
            path: `artifacts/${name}-${width}.png`,
            fullPage: true,
          });
        }
      }
      console.log(
        `PASS ${name}/${language}: six viewport widths, metadata, translations, images, desktop/mobile accessibility`,
      );
    }
  }

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${origin}/?lang=en`);
  await page.locator(".hamburger").click();
  assert.equal(
    await page.locator(".hamburger").getAttribute("aria-expanded"),
    "true",
  );
  assert.equal(
    await page
      .locator("#navLinks a")
      .first()
      .evaluate((element) => element === document.activeElement),
    true,
  );
  await page.keyboard.press("Escape");
  assert.equal(
    await page.locator(".hamburger").getAttribute("aria-expanded"),
    "false",
  );
  assert.equal(
    await page
      .locator(".hamburger")
      .evaluate((element) => element === document.activeElement),
    true,
  );
  await page.locator(".hamburger").click();
  await page.locator('#navLinks a[href*="products"]').click();
  assert.ok(page.url().includes("products.html?lang=en"));

  await page.goto(`${origin}/products.html?lang=fr#chiro-negenmanneke`);
  await page.locator('.navbar [data-locale="nl"]').click();
  assert.ok(
    page.url().endsWith("?lang=nl#chiro-negenmanneke"),
    "Language switching must preserve project anchors",
  );
  await page.reload();
  assert.equal(await page.locator("html").getAttribute("lang"), "nl");
  const deepLink = page.url();
  await page.goto(origin + "/");
  await page.goto(deepLink);
  await page.evaluate(() => document.fonts.ready);
  assert.ok(
    await page
      .locator("#chiro-negenmanneke")
      .evaluate(
        (element) => Math.abs(element.getBoundingClientRect().top) < 100,
      ),
  );

  await page.goto(`${origin}/contact.html?lang=en`);
  await page.locator("#submitBtn").click();
  assert.equal(
    await page.locator("#name").getAttribute("aria-invalid"),
    "true",
  );
  await page.locator("#name").fill("Test Person");
  await page.locator("#email").fill("bad-email");
  await page.locator("#submitBtn").click();
  assert.equal(
    await page.locator("#email").getAttribute("aria-invalid"),
    "true",
  );
  await page.locator("#email").fill("test@example.com");
  await page.locator("#message").fill("short");
  await page.locator("#submitBtn").click();
  assert.equal(
    await page.locator("#message").getAttribute("aria-invalid"),
    "true",
  );
  await page
    .locator("#message")
    .fill("This is an automated local test of the contact form.");
  let submissions = 0;
  let posted;
  await page.route(origin + "/", async (route) => {
    if (route.request().method() !== "POST") return route.continue();
    submissions += 1;
    posted = new URLSearchParams(route.request().postData());
    await route.fulfill({ status: 200, body: "OK" });
  });
  await page.locator("#submitBtn").click();
  await page.locator("#formStatus.success").waitFor();
  assert.equal(submissions, 1);
  assert.equal(posted.get("form-name"), "contact");
  assert.equal(posted.get("email"), "test@example.com");
  assert.equal(posted.get("bot-field"), "");
  assert.equal(await page.locator("#message").inputValue(), "");
  await page.unroute(origin + "/");
  await page.route(origin + "/", (route) =>
    route.request().method() === "POST" ? route.abort() : route.continue(),
  );
  await page.locator("#name").fill("Test Person");
  await page.locator("#email").fill("test@example.com");
  await page
    .locator("#message")
    .fill("This is a local test for a failed form delivery.");
  await page.locator("#submitBtn").click();
  await page.locator("#formStatus.error").waitFor();
  assert.ok(
    (await page.locator("#formStatus").innerText()).includes(
      "atypique.professional@gmail.com",
    ),
  );
  assert.ok((await page.locator("#message").inputValue()).length > 20);
  assert.equal(await page.locator("#submitBtn").isEnabled(), true);
  await page.locator('.navbar [data-locale="fr"]').click();
  assert.ok(
    (await page.locator("#formStatus").innerText()).includes(
      "atypique.professional@gmail.com",
    ),
  );
  await page.locator("#bot-field").evaluate((element) => {
    element.value = "spam";
  });
  await page.locator("#submitBtn").click();
  assert.equal(await page.locator("#submitBtn").isEnabled(), true);
  console.log(
    "PASS navigation, Escape/focus, locale persistence, deep links, validation, honeypot, mocked form success/failure",
  );

  // Links and fragments are checked against the actual production documents.
  const visited = new Map();
  for (const name of pages)
    visited.set(`/${name}.html`, await readFile(`dist/${name}.html`, "utf8"));
  visited.set("/", visited.get("/index.html"));
  for (const [path, html] of visited) {
    for (const match of html.matchAll(/(?:href|src)="([^"#][^"]*)"/g)) {
      const url = new URL(match[1], origin + path);
      if (url.origin !== origin) continue;
      const response = await fetch(url);
      assert.equal(
        response.status,
        200,
        `Broken asset or link: ${path} -> ${url.pathname}`,
      );
      if (url.hash && visited.has(url.pathname))
        assert.ok(
          visited.get(url.pathname).includes(`id="${url.hash.slice(1)}"`),
          `Missing fragment ${url}`,
        );
    }
  }
  const noJs = await browser.newContext({
    javaScriptEnabled: false,
    viewport: { width: 390, height: 844 },
  });
  const fallback = await noJs.newPage();
  await fallback.goto(origin + "/");
  assert.equal(await fallback.locator("#navLinks").isVisible(), true);
  assert.ok((await fallback.locator("h1").innerText()).includes("DIGITAL"));
  await noJs.close();
  const restricted = await browser.newContext({ locale: "fr-BE" });
  await restricted.addInitScript(() =>
    Object.defineProperty(window, "localStorage", {
      get() {
        throw new Error("Storage unavailable");
      },
    }),
  );
  const privatePage = await restricted.newPage();
  await privatePage.goto(origin + "/?lang=en");
  assert.equal(await privatePage.locator("html").getAttribute("lang"), "en");
  await privatePage.locator('#navLinks a[href*="about"]').click();
  assert.equal(await privatePage.locator("html").getAttribute("lang"), "en");
  await restricted.close();
  assert.deepEqual(errors, [], "Browser errors or missing production assets");
  console.log(
    "PASS production links/assets, no-JavaScript navigation, unavailable storage, and zero browser errors",
  );
} finally {
  await browser.close();
  await new Promise((resolve) => server.close(resolve));
}
