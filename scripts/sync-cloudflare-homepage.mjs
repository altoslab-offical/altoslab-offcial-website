import { copyFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const source = path.join(root, "index.html");
const destination = path.join(root, "public", "altoslab-homepage.html");

await mkdir(path.dirname(destination), { recursive: true });
await copyFile(source, destination);

console.log(`Synced Cloudflare homepage asset: ${path.relative(root, destination)}`);
