import { cp, mkdir, readFile, writeFile, readdir } from "node:fs/promises";
import { transform } from "lightningcss";

// Static output: no framework, client dependencies, or runtime server.
await mkdir("dist", { recursive: true });
for (const file of [
  "index.html",
  "about.html",
  "services.html",
  "products.html",
  "contact.html",
  "robots.txt",
  "sitemap.xml",
]) {
  await cp(file, `dist/${file}`);
}
for (const directory of ["images", "fonts", "js"]) {
  await cp(directory, `dist/${directory}`, { recursive: true });
}
await mkdir("dist/css", { recursive: true });
for (const file of await readdir("css")) {
  if (!file.endsWith(".css")) continue;
  const result = transform({
    filename: file,
    code: await readFile(`css/${file}`),
    minify: true,
  });
  await writeFile(`dist/css/${file}`, result.code);
}
console.log(
  "Built five static pages, styles, translations, fonts, and assets in dist/.",
);
