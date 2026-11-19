import assert from "node:assert/strict";
import test from "node:test";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { ROOT } from "../scripts/lib/content.mjs";

const SKIP = new Set(["node_modules", "dist", ".git"]);
const FORBIDDEN_EXTENSIONS = new Set([".php", ".sql"]);
const FORBIDDEN_DEPENDENCIES = ["express", "react", "react-dom", "next", "vue", "prisma", "mysql", "mysql2", "pg", "mongodb", "laravel"];

async function walk(directory, found = []) {
  const entries = await readdir(directory, { withFileTypes: true });
  for (const entry of entries) {
    if (SKIP.has(entry.name)) continue;
    const full = path.join(directory, entry.name);
    if (entry.isDirectory()) await walk(full, found);
    else found.push(full);
  }
  return found;
}

test("the active application has no PHP, SQL, or server dependencies", async () => {
  const files = await walk(ROOT);
  const forbidden = files.filter((file) => FORBIDDEN_EXTENSIONS.has(path.extname(file).toLowerCase()));
  assert.deepEqual(forbidden, []);

  const packageJson = JSON.parse(await readFile(path.join(ROOT, "package.json"), "utf8"));
  const dependencies = Object.keys({ ...packageJson.dependencies, ...packageJson.devDependencies });
  const present = dependencies.filter((name) => FORBIDDEN_DEPENDENCIES.includes(name));
  assert.deepEqual(present, []);

  const config = await readFile(path.join(ROOT, "admin/config.yml"), "utf8");
  assert.equal(/client_secret|access_token|ghp_|github_pat_/i.test(config), false);
  assert.equal(config.includes("clyde_portfolio"), false);
});
