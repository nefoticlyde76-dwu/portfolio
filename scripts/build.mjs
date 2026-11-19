import { cp, mkdir, rm, writeFile, access } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { ROOT, cvIsReleased, loadContent } from "./lib/content.mjs";
import { renderSite } from "./lib/render.mjs";

const DIST = path.join(ROOT, "dist");

async function exists(file) {
  try {
    await access(file);
    return true;
  } catch {
    return false;
  }
}

async function copyPublic(releaseCv) {
  const source = path.join(ROOT, "public");
  await cp(source, DIST, {
    recursive: true,
    filter: (item) => {
      const relative = path.relative(source, item);
      if (!relative) return true;
      if (relative === "uploads" || relative.startsWith(`uploads${path.sep}`) === false && relative === "uploads") return true;
      const normalised = relative.split(path.sep).join("/");
      if (normalised === "uploads/resume" || normalised.startsWith("uploads/resume/")) {
        if (normalised.endsWith(".gitkeep")) return false;
        return releaseCv;
      }
      if (normalised.endsWith(".gitkeep")) return false;
      return true;
    },
  });
}

async function copyVendor() {
  const bootstrapCss = path.join(ROOT, "node_modules/bootstrap/dist/css/bootstrap.min.css");
  const bootstrapJs = path.join(ROOT, "node_modules/bootstrap/dist/js/bootstrap.bundle.min.js");
  const icons = path.join(ROOT, "node_modules/bootstrap-icons/font");
  if (!(await exists(bootstrapCss)) || !(await exists(icons))) {
    throw new Error("Bootstrap is not installed. Run npm ci before the build.");
  }
  const iconDestination = path.join(DIST, "assets/vendor/bootstrap-icons");
  await mkdir(path.join(DIST, "assets/vendor/bootstrap"), { recursive: true });
  await mkdir(path.join(iconDestination, "fonts"), { recursive: true });
  await cp(bootstrapCss, path.join(DIST, "assets/vendor/bootstrap/bootstrap.min.css"));
  await cp(bootstrapJs, path.join(DIST, "assets/vendor/bootstrap/bootstrap.bundle.min.js"));
  await cp(path.join(icons, "bootstrap-icons.css"), path.join(iconDestination, "bootstrap-icons.css"));
  await cp(path.join(icons, "fonts/bootstrap-icons.woff"), path.join(iconDestination, "fonts/bootstrap-icons.woff"));
  await cp(path.join(icons, "fonts/bootstrap-icons.woff2"), path.join(iconDestination, "fonts/bootstrap-icons.woff2"));
}

export async function build() {
  const { content, errors } = await loadContent();
  if (errors.length) {
    const error = new Error(`Content validation failed\n${errors.map((line) => `- ${line}`).join("\n")}`);
    error.errors = errors;
    throw error;
  }

  const releaseCv = cvIsReleased(content.site, content.resume);
  await rm(DIST, { recursive: true, force: true });
  await mkdir(DIST, { recursive: true });
  await copyPublic(releaseCv);
  await cp(path.join(ROOT, "admin"), path.join(DIST, "admin"), { recursive: true });
  await copyVendor();

  const pages = renderSite(content);
  for (const page of pages) {
    const destination = path.join(DIST, page.path);
    await mkdir(path.dirname(destination), { recursive: true });
    await writeFile(destination, page.html);
  }

  return {
    pages: pages.map((page) => page.path),
    cvReleased: releaseCv,
  };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  build()
    .then((result) => {
      console.log(`Built ${result.pages.length} output files in dist/`);
      console.log(result.cvReleased ? "Public CV included." : "Public CV withheld.");
    })
    .catch((error) => {
      console.error(error.message);
      process.exitCode = 1;
    });
}
