import assert from "node:assert/strict";
import test from "node:test";
import { access, readFile } from "node:fs/promises";
import path from "node:path";
import { build } from "../scripts/build.mjs";
import { ROOT } from "../scripts/lib/content.mjs";
import { validateAll } from "../scripts/validate-content.mjs";
import { verifyDist } from "../scripts/verify-dist.mjs";

test("repository content and Decap configuration validate", async () => {
  const result = await validateAll();
  assert.deepEqual(result.errors, []);
});

test("production build withholds the CV and passes dist checks", async () => {
  const result = await build();
  assert.equal(result.cvReleased, false);
  assert.equal(result.pages.includes("projects/telehealth-consultation-system/index.html"), true);
  assert.equal(result.pages.includes("projects/wpu-enterprise-information-system/index.html"), false);
  assert.equal(result.pages.includes("projects/national-content-reporting-automation/index.html"), false);
  const errors = await verifyDist();
  assert.deepEqual(errors, []);
  await assert.rejects(access(path.join(ROOT, "dist/uploads/resume/cv.pdf")));
  const home = await readFile(path.join(ROOT, "dist/index.html"), "utf8");
  assert.equal(home.includes("Clyde Nefoti"), true);
  assert.equal(home.includes("data-netlify"), false);
  const contact = await readFile(path.join(ROOT, "dist/contact/index.html"), "utf8");
  assert.equal(contact.includes('data-netlify="true"'), true);
  const config = await readFile(path.join(ROOT, "dist/admin/config.yml"), "utf8");
  assert.equal(config.includes("repo: nefoticlyde76-dwu/portfolio"), true);
  assert.equal(config.includes("branch: rebuild/netlify-decap"), true);
});
