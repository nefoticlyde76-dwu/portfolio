import assert from "node:assert/strict";
import test from "node:test";
import vm from "node:vm";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { ROOT } from "../scripts/lib/content.mjs";

function json(status, value) {
  return new Response(JSON.stringify(value), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function emptyJson(status) {
  return new Response("", {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

async function loadGuard(fetchImpl) {
  const context = {
    globalThis: null,
    fetch: fetchImpl,
    Response,
    URL,
    JSON,
    setTimeout,
    clearTimeout,
    encodeURIComponent,
    __githubFetchRetryDelay: 0,
  };
  context.globalThis = context;
  const source = await readFile(path.join(ROOT, "admin/github-fetch.js"), "utf8");
  vm.runInNewContext(source, context);
  return context.fetch;
}

test("an empty GitHub pull response is retried once", async () => {
  const calls = [];
  const guarded = await loadGuard(async (input) => {
    const url = String(input);
    calls.push(url);
    if (url.includes("?")) return json(200, []);
    if (calls.filter((item) => !item.includes("?")).length === 1) return emptyJson(201);
    return json(201, { number: 9, html_url: "https://github.com/example/pull/9" });
  });

  const response = await guarded("https://api.github.com/repos/nefoticlyde76-dwu/portfolio/pulls", {
    method: "POST",
    body: JSON.stringify({ head: "nefoticlyde76-dwu:cms/certificates/dasa-certificate-of-participation" }),
  });
  assert.equal(calls.length, 3);
  assert.deepEqual(await response.json(), { number: 9, html_url: "https://github.com/example/pull/9" });
});

test("a pull that GitHub created despite an empty body is reused", async () => {
  const calls = [];
  const guarded = await loadGuard(async (input) => {
    calls.push(String(input));
    if (calls.length === 1) return emptyJson(201);
    return json(200, [{ number: 8, title: "Update Certificates" }]);
  });

  const response = await guarded("https://api.github.com/repos/nefoticlyde76-dwu/portfolio/pulls", {
    method: "POST",
    headers: { Authorization: "token test" },
    body: JSON.stringify({ head: "nefoticlyde76-dwu:cms/certificates/dasa-certificate-of-participation" }),
  });
  assert.equal(calls.length, 2);
  assert.match(calls[1], /head=nefoticlyde76-dwu%3Acms%2Fcertificates%2Fdasa-certificate-of-participation/);
  assert.equal((await response.json()).number, 8);
});

test("valid GitHub JSON and other websites are left unchanged", async () => {
  const guarded = await loadGuard(async (input) => {
    if (String(input).includes("api.github.com")) return json(200, { sha: "abc" });
    return new Response("page", { status: 200, headers: { "Content-Type": "text/html" } });
  });
  assert.equal((await (await guarded("https://api.github.com/repos/a/b")).json()).sha, "abc");
  assert.equal(await (await guarded("https://example.com")).text(), "page");
});
