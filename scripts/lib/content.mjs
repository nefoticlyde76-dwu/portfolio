import { execFileSync } from "node:child_process";
import { readdir, readFile, access } from "node:fs/promises";
import path from "node:path";
import { safeUrl } from "./html.mjs";

export const ROOT = path.resolve(import.meta.dirname, "../..");

export function untrackedPaths() {
  try {
    const output = execFileSync("git", ["ls-files", "--others", "--exclude-standard"], {
      cwd: ROOT,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    });
    return new Set(output.split(/\r?\n/).filter(Boolean).map((item) => item.split("\\").join("/")));
  } catch {
    return new Set();
  }
}

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const EMAIL_PATTERN = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const IMAGE_EXTENSIONS = new Set([".png", ".jpg", ".jpeg", ".webp", ".gif"]);
const FILE_EXTENSIONS = new Set([...IMAGE_EXTENSIONS, ".pdf"]);

export const FOLDER_COLLECTIONS = [
  {
    key: "projects",
    dir: "content/projects",
    required: ["title", "slug", "summary", "published", "visibility", "display_order"],
  },
  {
    key: "certificates",
    dir: "content/certificates",
    required: ["title", "issuing_organization", "published", "visibility", "display_order"],
  },
  {
    key: "design",
    dir: "content/design",
    required: ["title", "category", "published", "visibility", "display_order"],
  },
  {
    key: "skills",
    dir: "content/skills",
    required: ["name", "category", "published", "visibility", "display_order"],
  },
  {
    key: "experience",
    dir: "content/experience",
    required: ["position", "organization", "published", "visibility", "display_order"],
  },
  {
    key: "education",
    dir: "content/education",
    required: ["institution", "qualification", "published", "visibility", "display_order"],
  },
];

export function isPublic(entry) {
  return entry?.published === true && entry?.visibility === "public";
}

export function cvIsReleased(site, resume) {
  return site?.show_cv_download === true
    && resume?.public_release_approved === true
    && typeof resume?.file === "string"
    && resume.file.startsWith("/uploads/resume/")
    && FILE_EXTENSIONS.has(path.posix.extname(resume.file).toLowerCase());
}

export function publicEntries(entries) {
  return entries
    .filter(isPublic)
    .sort((a, b) => {
      const featured = Number(b.featured === true) - Number(a.featured === true);
      if (featured !== 0) return featured;
      const order = Number(a.display_order) - Number(b.display_order);
      if (order !== 0) return order;
      return String(a.title || a.name || a.position || "").localeCompare(String(b.title || b.name || b.position || ""));
    });
}

function mediaFields(entry) {
  const found = [];
  const push = (value, label) => {
    if (typeof value === "string" && value.trim()) found.push({ value: value.trim(), label });
  };
  push(entry.profile_image, "profile_image");
  push(entry.main_image, "main_image");
  push(entry.image, "image");
  push(entry.file, "file");
  push(entry.display_image, "display_image");
  push(entry.logo, "logo");
  if (Array.isArray(entry.gallery)) {
    for (const item of entry.gallery) push(item?.image, "gallery.image");
  }
  return found;
}

export function validateRecord(entry, { file, required, expectSlug }) {
  const errors = [];
  const where = file || entry.slug || "record";

  for (const field of required) {
    const value = entry[field];
    if (value === undefined || value === null || value === "") {
      errors.push(`${where}: ${field} is required`);
    }
  }

  if ("published" in entry && typeof entry.published !== "boolean") {
    errors.push(`${where}: published must be true or false`);
  }
  if ("visibility" in entry && !["public", "private"].includes(entry.visibility)) {
    errors.push(`${where}: visibility must be public or private`);
  }
  if ("display_order" in entry && !Number.isInteger(entry.display_order)) {
    errors.push(`${where}: display_order must be an integer`);
  }
  if ("featured" in entry && typeof entry.featured !== "boolean") {
    errors.push(`${where}: featured must be true or false`);
  }

  if (expectSlug) {
    if (typeof entry.slug !== "string" || !SLUG_PATTERN.test(entry.slug)) {
      errors.push(`${where}: slug must use lowercase letters, numbers, and hyphens`);
    } else if (path.basename(file, ".json") !== entry.slug) {
      errors.push(`${where}: filename must match slug ${entry.slug}`);
    }
  }

  for (const field of ["external_url", "github_url", "credential_url", "linkedin", "github"]) {
    if (entry[field] && !safeUrl(entry[field])) {
      errors.push(`${where}: ${field} must be an http or https URL`);
    }
  }
  if (entry.social) {
    for (const [key, value] of Object.entries(entry.social)) {
      if (value && !safeUrl(value)) errors.push(`${where}: social.${key} must be an http or https URL`);
    }
  }
  if (Array.isArray(entry.social_links)) {
    entry.social_links.forEach((link, index) => {
      if (link?.url && !safeUrl(link.url)) errors.push(`${where}: social_links[${index}].url is not a safe URL`);
    });
  }
  if (entry.contact_email && !EMAIL_PATTERN.test(entry.contact_email)) {
    errors.push(`${where}: contact_email is not a valid email address`);
  }

  for (const media of mediaFields(entry)) {
    if (!isSafeInternalPath(media.value)) {
      errors.push(`${where}: ${media.label} must be a site path such as /uploads/...`);
      continue;
    }
    const extension = path.posix.extname(media.value).toLowerCase();
    const allowed = media.label === "file" || media.label.endsWith("file") ? FILE_EXTENSIONS : IMAGE_EXTENSIONS;
    if (media.label === "file" || media.value.startsWith("/uploads/resume/")) {
      if (!FILE_EXTENSIONS.has(extension)) errors.push(`${where}: ${media.label} uses an unsupported file type`);
    } else if (!IMAGE_EXTENSIONS.has(extension)) {
      errors.push(`${where}: ${media.label} must be a png, jpg, jpeg, webp, or gif image`);
    }
    if (!allowed.has(extension) && media.label !== "file") {
      // The branch above already records the specific error.
    }
  }

  if (entry.main_image && !String(entry.main_image_alt || "").trim()) {
    errors.push(`${where}: main_image_alt is required when a main image is set`);
  }
  if (entry.profile_image && !String(entry.profile_image_alt || "").trim()) {
    errors.push(`${where}: profile_image_alt is required when a profile image is set`);
  }
  if (Array.isArray(entry.gallery)) {
    entry.gallery.forEach((item, index) => {
      if (item?.image && !String(item.alt || "").trim()) {
        errors.push(`${where}: gallery[${index}].alt is required`);
      }
    });
  }

  return errors;
}

function isSafeInternalPath(value) {
  return typeof value === "string"
    && value.startsWith("/")
    && !value.startsWith("//")
    && !value.includes("..")
    && !value.includes("\\");
}

// Decap's media library commits a file delete on its own. The entry JSON can
// still point at that file. Drop the reference instead of failing the build,
// or Netlify keeps the previous deploy and later published edits never appear.
export function detachMissingMedia(entry, value) {
  if (!entry || typeof entry !== "object") return;
  for (const key of ["profile_image", "main_image", "image", "file", "display_image", "logo"]) {
    if (entry[key] === value) entry[key] = "";
  }
  if (Array.isArray(entry.gallery)) {
    entry.gallery = entry.gallery.filter((item) => item?.image !== value);
  }
}

async function readJson(file) {
  const source = await readFile(file, "utf8");
  try {
    return { value: JSON.parse(source), errors: [] };
  } catch (error) {
    return { value: null, errors: [`${path.relative(ROOT, file)}: malformed JSON (${error.message})`] };
  }
}

async function readFolder(collection) {
  const directory = path.join(ROOT, collection.dir);
  let names = [];
  try {
    names = await readdir(directory);
  } catch {
    return { entries: [], errors: [`${collection.dir}: folder is missing`] };
  }

  const entries = [];
  const errors = [];
  for (const name of names.filter((item) => item.endsWith(".json")).sort()) {
    const file = path.join(directory, name);
    const parsed = await readJson(file);
    errors.push(...parsed.errors);
    if (!parsed.value || Array.isArray(parsed.value) || typeof parsed.value !== "object") {
      if (parsed.value) errors.push(`${collection.dir}/${name}: must be a JSON object`);
      continue;
    }
    const relative = path.posix.join(collection.dir, name);
    const filenameSlug = path.basename(name, ".json");
    if (!SLUG_PATTERN.test(filenameSlug)) {
      errors.push(`${relative}: filename must use lowercase letters, numbers, and hyphens`);
    }
    if (collection.key === "skills") parsed.value.slug = filenameSlug;
    errors.push(...validateRecord(parsed.value, {
      file: relative,
      required: collection.required,
      expectSlug: collection.key !== "skills",
    }));
    entries.push(parsed.value);
  }

  const slugs = entries.map((entry) => entry.slug).filter(Boolean);
  const seen = new Set();
  for (const slug of slugs) {
    if (seen.has(slug)) errors.push(`${collection.dir}: duplicate slug ${slug}`);
    seen.add(slug);
  }

  return { entries, errors };
}

export async function loadContent() {
  const errors = [];
  const warnings = [];
  const content = {};

  const profile = await readJson(path.join(ROOT, "content/settings/profile.json"));
  const site = await readJson(path.join(ROOT, "content/settings/site.json"));
  const resume = await readJson(path.join(ROOT, "content/settings/resume.json"));
  errors.push(...profile.errors, ...site.errors, ...resume.errors);

  if (profile.value) {
    errors.push(...validateRecord(profile.value, {
      file: "content/settings/profile.json",
      required: ["name", "professional_title", "introduction", "published"],
      expectSlug: false,
    }));
  }
  if (site.value) {
    errors.push(...validateRecord(site.value, {
      file: "content/settings/site.json",
      required: ["site_title", "show_cv_download"],
      expectSlug: false,
    }));
    if (typeof site.value.show_cv_download !== "boolean") {
      errors.push("content/settings/site.json: show_cv_download must be true or false");
    }
    if (site.value.canonical_site_url && !safeUrl(site.value.canonical_site_url).startsWith("https://")) {
      errors.push("content/settings/site.json: canonical_site_url must be an https URL or empty");
    }
  }
  if (resume.value && typeof resume.value.public_release_approved !== "boolean") {
    errors.push("content/settings/resume.json: public_release_approved must be true or false");
  }
  if (resume.value?.file && !String(resume.value.file).startsWith("/uploads/resume/")) {
    errors.push("content/settings/resume.json: file must stay inside /uploads/resume/");
  }

  content.profile = profile.value;
  content.site = site.value;
  content.resume = resume.value;

  for (const collection of FOLDER_COLLECTIONS) {
    const loaded = await readFolder(collection);
    content[collection.key] = loaded.entries;
    errors.push(...loaded.errors);
  }

  const mediaOwners = [
    profile.value,
    site.value,
    resume.value,
    ...FOLDER_COLLECTIONS.flatMap((collection) => content[collection.key] || []),
  ].filter(Boolean);

  const approvedCv = resume.value?.file && cvIsReleased(site.value, resume.value) ? resume.value.file : "";

  for (const entry of mediaOwners) {
    for (const media of mediaFields(entry)) {
      if (!isSafeInternalPath(media.value)) continue;
      const relative = media.value.replace(/^\/+/, "");
      try {
        await access(path.join(ROOT, "public", relative));
      } catch {
        if (media.value === approvedCv) continue;
        warnings.push(`${media.label}: missing media file public/${relative}; omitted so the rest of the published content can deploy`);
        detachMissingMedia(entry, media.value);
      }
    }
  }

  if (approvedCv) {
    try {
      await access(path.join(ROOT, "public", approvedCv.replace(/^\/+/, "")));
    } catch {
      errors.push("content/settings/resume.json: approved CV file is missing");
    }
  }

  return { content, errors, warnings };
}
