import { readFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import yaml from "js-yaml";
import { ROOT, loadContent } from "./lib/content.mjs";

const REQUIRED_COLLECTIONS = ["settings", "projects", "certificates", "design", "skills", "experience", "education"];

export async function validateDecapConfig() {
  const file = path.join(ROOT, "admin/config.yml");
  const source = await readFile(file, "utf8");
  const errors = [];
  if (/client_secret|access_token|ghp_|github_pat_|BEGIN [A-Z ]*PRIVATE KEY/i.test(source)) {
    errors.push("admin/config.yml contains a secret-like value");
  }

  let config;
  try {
    config = yaml.load(source);
  } catch (error) {
    return [`admin/config.yml is not valid YAML (${error.message})`];
  }

  if (config?.backend?.name !== "github") errors.push("Decap backend must be github");
  if (config?.backend?.repo !== "nefoticlyde76-dwu/portfolio") {
    errors.push("Decap repo must be nefoticlyde76-dwu/portfolio");
  }
  if (config?.backend?.branch !== "rebuild/netlify-decap") {
    errors.push("Decap branch must be rebuild/netlify-decap");
  }
  if (config?.publish_mode !== "editorial_workflow") {
    errors.push("Decap publish_mode must be editorial_workflow");
  }
  if (config?.backend?.repo?.includes("clyde_portfolio")) {
    errors.push("Decap must not target clyde_portfolio");
  }

  const names = new Set((config?.collections || []).map((collection) => collection.name));
  for (const name of REQUIRED_COLLECTIONS) {
    if (!names.has(name)) errors.push(`Decap collection missing: ${name}`);
  }

  const settings = (config?.collections || []).find((collection) => collection.name === "settings");
  const files = new Set((settings?.files || []).map((fileEntry) => fileEntry.name));
  for (const name of ["profile", "site", "resume"]) {
    if (!files.has(name)) errors.push(`Decap settings file missing: ${name}`);
  }

  return errors;
}

export async function validateAll() {
  const content = await loadContent();
  const configErrors = await validateDecapConfig();
  return [...content.errors, ...configErrors];
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  validateAll()
    .then((errors) => {
      if (errors.length) {
        console.error(errors.map((line) => `- ${line}`).join("\n"));
        process.exitCode = 1;
        return;
      }
      console.log("Content and Decap configuration are valid.");
    })
    .catch((error) => {
      console.error(error.message);
      process.exitCode = 1;
    });
}
