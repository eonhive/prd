import { rm } from "node:fs/promises";
import { join } from "node:path";

const targets = [
  "coverage",
  "examples/dist",
  "node_modules",
  "packages/prd-types/dist",
  "packages/prd-validator/dist",
  "packages/prd-packager/dist",
  "packages/prd-cli/dist",
  "packages/prd-viewer-core/dist",
  "apps/prd-viewer-web/dist"
];

for (const target of targets) {
  await rm(join(process.cwd(), target), { recursive: true, force: true });
}
