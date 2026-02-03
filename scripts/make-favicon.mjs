import sharp from "sharp";
import { mkdirSync } from "node:fs";

mkdirSync("public", { recursive: true });

await sharp("public/icon.png")
  .resize(64, 64)
  .toFormat("png")
  .toFile("public/favicon.png");

await sharp("public/icon.png")
  .resize(32, 32)
  .toFormat("png")
  .toFile("public/favicon-32.png");

await sharp("public/icon.png")
  .resize(16, 16)
  .toFormat("png")
  .toFile("public/favicon-16.png");

await sharp("public/icon.png")
  .resize(32, 32)
  .toFormat("ico")
  .toFile("public/favicon.ico");

console.log("✅ favicon.ico generado");

