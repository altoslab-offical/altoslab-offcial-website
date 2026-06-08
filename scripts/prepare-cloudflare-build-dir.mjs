#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const openNextDir = path.join(root, ".open-next");
const nextDevDir = path.join(root, ".next", "dev");
const stamp = new Date().toISOString().replace(/[:.]/g, "-");

function moveAside(dir, label) {
  if (!fs.existsSync(dir)) return;
  const target = path.join(root, `.${label}.previous-${stamp}`);
  fs.renameSync(dir, target);
  console.log(`Moved ${path.relative(root, dir)} to ${path.relative(root, target)}`);
}

function removeIfPresent(dir) {
  if (!fs.existsSync(dir)) return;
  fs.rmSync(dir, { recursive: true, force: true });
  console.log(`Removed ${path.relative(root, dir)}`);
}

removeIfPresent(nextDevDir);
moveAside(openNextDir, "open-next");
