import { access, readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { ROOT } from "./lib/content.mjs";

const DIST = path.join(ROOT, "dist");

const REQUIRED = [
  "index.html",
  "about/index.html",
  "skills/index.html",
  "projects/index.html",
  "projects/telehealth-consultation-system/index.html",
  "certificates/index.html",
  "design/index.html",
  "experience/index.html",
  "education/index.html",
  "contact/index.html",
  "contact/success/index.html",
  "404.html",
  "sitemap.xml",
  "robots.txt",
  "admin/index.html",
  "admin/config.yml",
  "admin/decap-cms.js",
  "uploads/profile/clyde-nefoti.png",
  "uploads/projects/telehealth-consultation-homepage.png",
];

const PROHIBITED_EXTENSIONS = new Set([".php", ".sql", ".py", ".rb", ".go", ".java", ".cs"]);

async function walk(directory, found = []) {
  const entries = await readdir(directory, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(directory, entry.name);
    if (entry.isDirectory()) await walk(full, found);
    else found.push(full);
  }
  return found;
}

export async function verifyDist() {
  const errors = [];
  for (const relative of REQUIRED) {
    try {
      await access(path.join(DIST, relative));
    } catch {
      errors.push(`Missing dist/${relative}`);
    }
  }

  const contact = await readFile(path.join(DIST, "contact/index.html"), "utf8");
  for (const token of ['data-netlify="true"', 'name="contact"', 'name="form-name"', 'name="bot-field"', 'name="full-name"', 'name="email"', 'name="subject"', 'name="message"']) {
    if (!contact.includes(token)) errors.push(`Contact form is missing ${token}`);
  }

  const files = await walk(DIST);
  for (const file of files) {
    const extension = path.extname(file).toLowerCase();
    if (PROHIBITED_EXTENSIONS.has(extension)) errors.push(`Prohibited file in dist: ${path.relative(DIST, file)}`);
    const normalised = file.split(path.sep).join("/");
    if (normalised.includes("/uploads/resume/") && !normalised.endsWith(".gitkeep")) {
      errors.push(`CV file was copied into dist: ${path.relative(DIST, file)}`);
    }
  }

  const html = (await Promise.all(files.filter((file) => file.endsWith(".html")).map((file) => readFile(file, "utf8")))).join("\n");
  if (html.includes("Lodestar Studio brand identity")) errors.push("Unpublished design entry was rendered");
  if (html.includes("Eco-friendly tableware logo contest entry")) errors.push("Unpublished design entry was rendered");
  if (/National Content Reporting Automation|ncra-end-to-end-activity-diagram/i.test(html)) {
    errors.push("NCRA content was published");
  }
  if (html.includes("DigitalOcean App Platform")) errors.push("DigitalOcean App Platform was published");
  if (html.includes("Agile sprint planning") || html.includes("Agile planning")) {
    errors.push("Agile planning was published as a skill");
  }
  if (/ADD PHONE NUMBER|REFEREES|Referee 2|Referee 3/i.test(html)) {
    errors.push("A CV phone placeholder or referee section was published");
  }
  const home = await readFile(path.join(DIST, "index.html"), "utf8");
  if (home.includes("Express")) errors.push("Express was listed on the homepage");
  const skillsPage = await readFile(path.join(DIST, "skills/index.html"), "utf8");
  const [beforeCoursework, coursework = ""] = skillsPage.split("<h2>Coursework Exposure</h2>");
  if (!coursework.includes(">Express<") && !coursework.includes(">Express</span>")) {
    errors.push("Express is missing from coursework exposure");
  }
  if (beforeCoursework.includes("Express")) errors.push("Express appears outside coursework exposure");
  if (/client_secret|ghp_|github_pat_|AKIA[0-9A-Z]{16}/.test(html)) errors.push("Secret-like value found in HTML");

  const config = await readFile(path.join(DIST, "admin/config.yml"), "utf8");
  if (!config.includes("nefoticlyde76-dwu/portfolio") || !config.includes("rebuild/netlify-decap")) {
    errors.push("Published CMS config does not target the rebuild branch");
  }
  if (config.includes("clyde_portfolio")) errors.push("Published CMS config references clyde_portfolio");

  const robots = await readFile(path.join(DIST, "robots.txt"), "utf8");
  if (!robots.includes("Disallow: /admin/")) errors.push("robots.txt does not keep /admin/ out of search");

  const sitemap = await readFile(path.join(DIST, "sitemap.xml"), "utf8");
  if (!sitemap.includes("/projects/telehealth-consultation-system/")) {
    errors.push("Sitemap is missing the TeleHealth project");
  }
  if (/national-content-reporting-automation|ncra-end-to-end-activity-diagram/i.test(sitemap)) {
    errors.push("Sitemap still includes NCRA");
  }

  return errors;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  verifyDist()
    .then((errors) => {
      if (errors.length) {
        console.error(errors.map((line) => `- ${line}`).join("\n"));
        process.exitCode = 1;
        return;
      }
      console.log("dist passed verification.");
    })
    .catch((error) => {
      console.error(error.message);
      process.exitCode = 1;
    });
}
