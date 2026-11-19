import { spawnSync } from "node:child_process";
import path from "node:path";
import { ROOT } from "./lib/content.mjs";

const files = [
  "tests/content.test.mjs",
  "tests/security.test.mjs",
  "tests/build.test.mjs",
];

const result = spawnSync(
  process.execPath,
  ["--test", ...files.map((file) => path.join(ROOT, file))],
  { stdio: "inherit", cwd: ROOT },
);

process.exit(result.status ?? 1);
