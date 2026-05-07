import { mkdir, copyFile, rm } from "node:fs/promises";
import { join } from "node:path";

const files = [
  "index.html",
  "styles.css",
  "app.js",
  "manifest.webmanifest",
  "icon.svg",
  "sw.js",
  "privacy-policy.html"
];

await rm("dist", { recursive: true, force: true });
await mkdir("dist", { recursive: true });

for (const file of files) {
  await copyFile(file, join("dist", file));
}

console.log(`Prepared ${files.length} web assets in dist/.`);
