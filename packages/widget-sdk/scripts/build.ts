import { readFile, copyFile } from "node:fs/promises";
import { resolve } from "node:path";
import { rolldown } from "rolldown";

async function main() {
  const root = resolve(import.meta.dirname, "..");
  const entry = resolve(root, "src", "sdk.ts");
  const outPath = resolve(root, "dist", "sdk.js");

  const bundle = await rolldown({
    input: entry,
  });

  await bundle.write({
    file: outPath,
    // No `name`: a named IIFE emits `var Padyna = ...`, which overwrites the
    // window.Padyna function the SDK installs with the module namespace object.
    format: "iife",
    sourcemap: true,
    minify: true,
  });

  await bundle.close();

  const output = await readFile(outPath);
  const kb = (output.byteLength / 1024).toFixed(2);
  console.log(`Built dist/sdk.js (${kb} KB)`);

  const webPublicPath = resolve(root, "..", "..", "apps", "web", "public", "sdk.js");
  await copyFile(outPath, webPublicPath);
  await copyFile(`${outPath}.map`, `${webPublicPath}.map`);
  console.log(`Synced to apps/web/public/sdk.js (+ sdk.js.map)`);

  console.log("Global API: window.Padyna");
}

void main();
