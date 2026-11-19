import { escapeHtml, safeUrl } from "./html.mjs";
import { renderMarkdown } from "./markdown.mjs";
import { cvIsReleased, publicEntries, untrackedPaths } from "./content.mjs";

const PUBLIC_CSP = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' https://fonts.googleapis.com",
  "img-src 'self' data:",
  "font-src 'self' https://fonts.gstatic.com",
  "connect-src 'self'",
  "form-action 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'none'",
].join("; ");

function strings(items) {
  if (!Array.isArray(items)) return [];
  return items
    .map((item) => {
      if (typeof item === "string") return item.trim();
      if (item && typeof item === "object") return String(item.text || item.name || item.label || "").trim();
      return "";
    })
    .filter(Boolean);
}

function href(url) {
  const safe = safeUrl(url);
  return safe ? escapeHtml(safe) : "";
}

function externalLink(url, label) {
  const safe = href(url);
  if (!safe) return "";
  return `<a href="${safe}" rel="noopener noreferrer">${escapeHtml(label)}</a>`;
}

function figure(src, alt, { eager = false } = {}) {
  const safe = href(src);
  if (!safe) return "";
  const loading = eager ? "eager" : "lazy";
  return `<figure class="frame"><img src="${safe}" alt="${escapeHtml(alt || "")}" loading="${loading}" decoding="async"></figure>`;
}

function groupBy(items, key) {
  const groups = new Map();
  for (const item of items) {
    const name = item[key] || "General";
    if (!groups.has(name)) groups.set(name, []);
    groups.get(name).push(item);
  }
  return groups;
}

const PRIMARY_NAV = [
  { label: "Home", href: "/" },
  { label: "About", href: "/about/" },
  { label: "Projects", href: "/projects/" },
  { label: "Skills", href: "/skills/" },
  { label: "Experience", href: "/experience/" },
  { label: "Education", href: "/education/" },
  { label: "Certificates", href: "/certificates/" },
  { label: "Contact", href: "/contact/" },
];

const CATEGORY_NAV = [
  { label: "Overview", href: "/" },
  { label: "Profile", href: "/about/" },
  { label: "Projects", href: "/projects/" },
  { label: "Systems Development", href: "/skills/#systems-development" },
  { label: "Data Management", href: "/skills/#data-management-and-databases" },
  { label: "IT Support", href: "/skills/#it-tools-and-support" },
  { label: "Digital Design", href: "/skills/#digital-design" },
  { label: "Experience", href: "/experience/" },
  { label: "Education", href: "/education/" },
  { label: "Contact", href: "/contact/" },
];

function slugify(value) {
  return String(value || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function isCurrent(pathname, href) {
  if (href.includes("#")) return false;
  if (href === "/") return pathname === "/";
  return pathname === href;
}

function navList(items, pathname) {
  return items.map((item) => {
    const current = isCurrent(pathname, item.href) ? ' aria-current="page"' : "";
    return `<li><a href="${escapeHtml(item.href)}"${current}>${escapeHtml(item.label)}</a></li>`;
  }).join("");
}

function categoryNav(pathname) {
  return `<nav class="category-strip" aria-label="Browse">
    <ul>${navList(CATEGORY_NAV, pathname)}</ul>
  </nav>`;
}

function searchDialog() {
  return `<div class="search-layer" data-search-layer hidden>
    <div class="search-panel" role="dialog" aria-modal="true" aria-labelledby="search-title">
      <p id="search-title" class="visually-hidden">Search the portfolio</p>
      <label class="search-field">
        <span class="visually-hidden">Search projects, skills, experience, and education</span>
        <input type="search" data-search-input placeholder="Search projects, skills, experience…" autocomplete="off" enterkeyhint="search" role="combobox" aria-autocomplete="list" aria-controls="search-results" aria-expanded="true">
        <button type="button" data-search-clear>Clear</button>
        <kbd>Esc</kbd>
      </label>
      <ul class="search-results" id="search-results" data-search-results role="listbox" aria-label="Search results"></ul>
      <p class="search-hint" data-search-status>Type to search the published portfolio.</p>
    </div>
  </div>`;
}

function layout({ site, profile, title, description, pathname, body, projects = [] }) {
  const pageTitle = title ? `${title} · ${site.site_title}` : (site.seo_title || site.site_title);
  const summary = description || site.seo_description || profile.introduction || "";
  const canonicalBase = safeUrl(site.canonical_site_url);
  const canonical = canonicalBase ? `${canonicalBase.replace(/\/$/, "")}${pathname}` : "";
  const footerLinks = Array.isArray(site.footer_links) ? site.footer_links : [];
  const year = new Date().getFullYear();
  const email = profile.contact_email || site.contact_email || "";
  const github = socialLinks(profile, site).find((item) => /github/i.test(item.label));
  const footerItems = footerLinks.map((item) => {
    const safe = href(item.href);
    if (!safe) return "";
    return `<li><a href="${safe}">${escapeHtml(item.label || "")}</a></li>`;
  }).join("");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="description" content="${escapeHtml(summary)}">
  <meta name="theme-color" content="#0a0a0a">
  <meta http-equiv="Content-Security-Policy" content="${PUBLIC_CSP}">
  <title>${escapeHtml(pageTitle)}</title>
  ${canonical ? `<link rel="canonical" href="${escapeHtml(canonical)}">` : ""}
  <link rel="icon" href="/assets/images/favicon.svg" type="image/svg+xml">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@500;600&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap">
  <link rel="stylesheet" href="/assets/vendor/bootstrap/bootstrap.min.css">
  <link rel="stylesheet" href="/assets/vendor/bootstrap-icons/bootstrap-icons.css">
  <link rel="stylesheet" href="/assets/css/site.css?v=3">
</head>
<body>
  <a class="skip-link" href="#content">Skip to content</a>
  <header class="site-header">
    <div class="shell header-bar">
      <a class="wordmark" href="/"><span>${escapeHtml(site.wordmark || site.site_title)}</span><span class="wordmark-tag">~/portfolio</span></a>
      <nav class="desktop-nav" aria-label="Primary">
        <ul>${navList(PRIMARY_NAV, pathname)}</ul>
      </nav>
      <div class="header-tools">
        <button type="button" class="search-launch" data-search-open>
          <span>Search</span>
          <kbd>Ctrl K</kbd>
        </button>
        ${github ? `<a class="icon-link" href="${href(github.url)}" rel="noopener noreferrer">GitHub</a>` : ""}
        <button type="button" class="nav-toggle" data-menu-toggle aria-expanded="false" aria-controls="mobile-nav" aria-label="Open navigation">
          <span></span><span></span>
        </button>
      </div>
    </div>
  </header>
  <div id="mobile-nav" class="mobile-nav" data-mobile-nav hidden>
    <nav aria-label="Mobile">
      <ul>${navList(PRIMARY_NAV, pathname)}</ul>
    </nav>
  </div>
  ${searchDialog()}
  <main id="content">${body}</main>
  <footer class="site-footer">
    <div class="shell footer-grid">
      <div>
        <a class="wordmark" href="/">${escapeHtml(site.wordmark || profile.name || "")}</a>
        <p>${escapeHtml(site.footer_text || "")}</p>
      </div>
      <div>
        <p class="label">Explore</p>
        <ul class="plain-list">${navList(PRIMARY_NAV, "")}</ul>
      </div>
      <div>
        <p class="label">Projects</p>
        <ul class="plain-list">${projects.slice(0, 4).map((project) => `<li><a href="/projects/${escapeHtml(project.slug)}/">${escapeHtml(project.title)}</a></li>`).join("")}</ul>
      </div>
      <div>
        <p class="label">Also</p>
        <ul class="plain-list">${footerItems}</ul>
      </div>
      <div>
        <p class="label">Contact</p>
        ${email ? `<p><a href="mailto:${escapeHtml(email)}">${escapeHtml(email)}</a></p>` : `<p><a href="/contact/">Send a message</a></p>`}
        ${github ? `<p><a href="${href(github.url)}" rel="noopener noreferrer">GitHub</a></p>` : ""}
      </div>
    </div>
    <div class="shell footer-base">
      <p>© ${year} ${escapeHtml(site.copyright_text || profile.name || "")}</p>
      <p><a href="/admin/">Content manager</a></p>
    </div>
  </footer>
  <script src="/assets/js/search-index.js?v=3" defer></script>
  <script src="/assets/js/site.js?v=3" defer></script>
</body>
</html>`;
}

function socialLinks(profile, site) {
  const links = [];
  const push = (label, url) => {
    if (safeUrl(url)) links.push({ label, url });
  };
  push("GitHub", profile.social?.github);
  push("LinkedIn", profile.social?.linkedin);
  if (Array.isArray(site.social_links)) {
    for (const item of site.social_links) push(item.label || "Link", item.url);
  }
  const seen = new Set();
  return links.filter((item) => {
    if (seen.has(item.url)) return false;
    seen.add(item.url);
    return true;
  });
}

function projectMeta(project) {
  return [project.year, project.category, project.status].filter(Boolean).map((item) => escapeHtml(item)).join(" · ");
}

function brandHeading(value) {
  const parts = String(value || "").trim().split(/\s+/).filter(Boolean);
  if (parts.length < 2) return escapeHtml(value || "");
  const last = parts.pop();
  return `${escapeHtml(parts.join(" "))} <span class="brand">${escapeHtml(last)}</span>`;
}

function projectCard(project, { featured = false } = {}) {
  const technologies = strings(project.technologies);
  const detail = `/projects/${escapeHtml(project.slug)}/`;
  return `<article class="work-card${featured ? " work-card-featured" : ""}">
    ${figure(project.main_image, project.main_image_alt || project.title)}
    <div class="work-copy">
      <p class="meta">${projectMeta(project)}</p>
      <h2><a href="${detail}">${escapeHtml(project.title)}</a></h2>
      <p>${escapeHtml(project.summary || "")}</p>
      ${technologies.length ? `<ul class="tag-list">${technologies.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>` : ""}
      <p class="card-links">
        <a href="${detail}">Open ${escapeHtml(project.title)}</a>
        ${externalLink(project.github_url, "GitHub repository")}
      </p>
    </div>
  </article>`;
}

function interestList(profile) {
  const items = Array.isArray(profile.interests) ? profile.interests.map((item) => String(item || "").trim()).filter(Boolean) : [];
  if (!items.length) return "";
  return `<ul class="tag-list">${items.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>`;
}

export function renderSite(content) {
  const { site, profile } = content;
  const projects = publicEntries(content.projects);
  const localOnly = untrackedPaths();
  const certificates = publicEntries(content.certificates).filter((item) => !localOnly.has(`content/certificates/${item.slug}.json`));
  const design = publicEntries(content.design).filter((item) => safeUrl(item.image) && !localOnly.has(`content/design/${item.slug}.json`));
  const skills = publicEntries(content.skills);
  const experience = publicEntries(content.experience);
  const education = publicEntries(content.education);
  const showCv = cvIsReleased(site, content.resume);
  const pages = [];

  const add = (filePath, pathname, title, description, body) => {
    pages.push({
      path: filePath,
      html: layout({ site, profile, title, description, pathname, body, projects }),
    });
  };

  add("index.html", "/", "", site.seo_description, homePage({ site, profile, projects, skills, experience }));
  add("about/index.html", "/about/", "About", profile.introduction, aboutPage({ profile, education, showCv, resume: content.resume }));
  add("skills/index.html", "/skills/", "Skills", "Skills published by Clyde Nefoti.", skillsPage(skills));
  add("projects/index.html", "/projects/", "Projects", "Selected software and systems projects.", projectsPage(projects));
  for (const project of projects) {
    add(
      `projects/${project.slug}/index.html`,
      `/projects/${project.slug}/`,
      project.title,
      project.summary,
      projectPage(project),
    );
  }
  add("certificates/index.html", "/certificates/", "Certificates", "Certificates and participation records.", certificatesPage(certificates));
  add("design/index.html", "/design/", "Graphic design", "Published graphic design work.", designPage(design));
  add("experience/index.html", "/experience/", "Experience", "Placements, independent work, and leadership.", experiencePage(experience, education));
  add("education/index.html", "/education/", "Education", "Education recorded for this portfolio.", educationPage(education));
  add("contact/index.html", "/contact/", "Contact", "Contact Clyde Nefoti.", contactPage(profile, site));
  add("contact/success/index.html", "/contact/success/", "Message sent", "The contact form was submitted.", successPage());
  pages.push({
    path: "404.html",
    html: layout({
      site,
      profile,
      title: "Page not found",
      description: "The requested page is not available.",
      pathname: "/404.html",
      body: `<section class="shell section narrow"><p class="eyebrow">404</p><h1>This page is not available.</h1><p><a href="/">Return home</a></p></section>`,
    }),
  });
  pages.push({ path: "sitemap.xml", html: sitemap(site, pages) });
  pages.push({ path: "robots.txt", html: robots(site) });
  return pages;
}

function homePage({ site, profile, projects, skills, experience }) {
  const featured = projects.filter((project) => project.featured);
  const rest = projects.filter((project) => !project.featured);
  const ordered = [...featured, ...rest];
  const skillNames = skills
    .filter((skill) => skill.category !== "Coursework Exposure")
    .map((skill) => skill.name)
    .filter(Boolean)
    .slice(0, 12);
  const facts = [
    profile.location,
    profile.professional_title,
  ].filter(Boolean);
  return `<section class="shell hero">
    <div class="hero-copy">
      <p class="status-pill"><span class="status-dot" aria-hidden="true"></span>${escapeHtml(site.hero_kicker || "Portfolio")}</p>
      <h1>${brandHeading(site.hero_heading || profile.name)}</h1>
      <p class="standfirst">${escapeHtml(profile.introduction || "")}</p>
      <p class="lede">${escapeHtml(site.hero_summary || "")}</p>
      <button type="button" class="hero-search" data-search-open>
        <span>Search projects, skills, experience</span>
        <kbd>Ctrl K</kbd>
      </button>
      <div class="hero-chips">
        <a href="/projects/">Projects</a>
        <a href="/skills/">Skills</a>
        <a href="/experience/">Experience</a>
        <a href="/education/">Education</a>
        <a href="/contact/">Contact</a>
      </div>
      <div class="actions">
        <a class="button button-solid" href="/projects/">Explore projects</a>
        <a class="button button-line" href="/contact/">Contact Clyde</a>
      </div>
    </div>
    <aside class="hero-aside">
      ${profile.profile_image ? figure(profile.profile_image, profile.profile_image_alt, { eager: true }) : ""}
      ${facts.length ? `<ul class="meta-list">${facts.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>` : ""}
    </aside>
  </section>
  ${categoryNav("/")}
  <section class="shell section">
    <div class="section-head"><p class="eyebrow">Selected work</p><a href="/projects/">All projects</a></div>
    <div class="work-grid">${ordered.slice(0, 2).map((project) => projectCard(project, { featured: Boolean(project.featured) })).join("") || `<p class="empty">Published projects will appear here.</p>`}</div>
  </section>
  <section class="shell section split">
    <div>
      <p class="eyebrow">Profile</p>
      <h2>Professional interests</h2>
      ${interestList(profile) || `<p class="empty">Published interests will appear here.</p>`}
      <p><a href="/about/">Read the profile</a></p>
    </div>
    <div>
      <p class="eyebrow">Technical focus</p>
      ${skillNames.length ? `<ul class="tag-list">${skillNames.map((name) => `<li>${escapeHtml(name)}</li>`).join("")}</ul>` : `<p class="empty">No skills are published yet.</p>`}
      <p><a href="/skills/">Browse the skills library</a></p>
    </div>
  </section>
  <section class="shell section">
    <div class="section-head"><p class="eyebrow">Experience</p><a href="/experience/">Full record</a></div>
    <div class="listing">${experience.slice(0, 3).map(experienceRow).join("") || `<p class="empty">Published experience will appear here.</p>`}</div>
  </section>`;
}

function aboutPage({ profile, education, showCv, resume }) {
  const cvHref = showCv ? href(resume.file) : "";
  const email = profile.contact_email || "";
  const github = safeUrl(profile.social?.github);
  return `${categoryNav("/about/")}
  <section class="shell section page-intro">
    <p class="eyebrow">Profile</p>
    <h1>${escapeHtml(profile.name || "")}</h1>
    <p class="standfirst">${escapeHtml(profile.professional_title || "")}</p>
  </section>
  <section class="shell profile-layout">
    <div class="profile-portrait">
      ${profile.profile_image ? figure(profile.profile_image, profile.profile_image_alt) : ""}
      <ul class="meta-list">
        ${profile.location ? `<li>${escapeHtml(profile.location)}</li>` : ""}
        ${email ? `<li><a href="mailto:${escapeHtml(email)}">${escapeHtml(email)}</a></li>` : ""}
        ${github ? `<li><a href="${href(github)}" rel="noopener noreferrer">GitHub</a></li>` : ""}
        ${profile.availability ? `<li>${escapeHtml(profile.availability)}</li>` : ""}
      </ul>
    </div>
    <div>
      <h2>Professional summary</h2>
      <div class="prose">${renderMarkdown(profile.biography || profile.introduction || "")}</div>
      <h2>Professional interests</h2>
      ${interestList(profile) || `<p class="empty">No interests are published yet.</p>`}
      <h2>Technical focus</h2>
      <p><a href="/skills/">Browse the skills library</a></p>
    </div>
  </section>
  <section class="shell section">
    <h2>Education</h2>
    <div class="listing">${education.map(educationRow).join("") || `<p class="empty">No education records are published yet.</p>`}</div>
    <p><a href="/education/">Education details</a></p>
  </section>
  <section class="shell section">
    <h2>CV</h2>
    ${cvHref ? `<p><a href="${cvHref}">Download the public CV</a></p>` : `<p>A public CV download is not available.</p>`}
  </section>`;
}

function skillsPage(skills) {
  const groups = groupBy(skills, "category");
  const body = [...groups.entries()].map(([category, items]) => `<section class="skill-group" id="${escapeHtml(slugify(category))}">
    <h2>${escapeHtml(category)}</h2>
    <p class="meta">${items.length} published ${items.length === 1 ? "item" : "items"}</p>
    <ul class="skill-library">
      ${items.map((skill) => `<li><span>${escapeHtml(skill.name)}</span>${skill.description ? `<small>${escapeHtml(skill.description)}</small>` : ""}</li>`).join("")}
    </ul>
  </section>`).join("");
  return `${categoryNav("/skills/")}
  <section class="shell section page-intro">
    <p class="eyebrow">Skills</p>
    <h1>Technical knowledge library</h1>
    <p class="lede">Grouped by the published skill categories. Coursework exposure stays separate from the professional skills.</p>
    ${body || `<p class="empty">No skills are published yet.</p>`}
  </section>`;
}

function projectsPage(projects) {
  const featured = projects.filter((project) => project.featured);
  const rest = projects.filter((project) => !project.featured);
  return `${categoryNav("/projects/")}
  <section class="shell section page-intro">
    <p class="eyebrow">Projects</p>
    <h1>Selected projects</h1>
    <p class="lede">A curated record of published software and systems work.</p>
    <div class="work-grid">
      ${featured.map((project) => projectCard(project, { featured: true })).join("")}
      ${rest.map((project) => projectCard(project)).join("")}
    </div>
    ${projects.length ? "" : `<p class="empty">No projects are published yet.</p>`}
  </section>`;
}

function projectPage(project) {
  const technologies = strings(project.technologies);
  const gallery = Array.isArray(project.gallery) ? project.gallery : [];
  const facts = [
    ["Role", project.role],
    ["Year", project.year],
    ["Status", project.status],
    ["Category", project.category],
  ].filter(([, value]) => String(value || "").trim());
  return `<article class="shell section project-detail">
    <p class="eyebrow">Project</p>
    <h1>${escapeHtml(project.title)}</h1>
    <p class="lede">${escapeHtml(project.summary || "")}</p>
    ${facts.length ? `<dl class="facts">${facts.map(([label, value]) => `<div><dt>${escapeHtml(label)}</dt><dd>${escapeHtml(value)}</dd></div>`).join("")}</dl>` : ""}
    ${figure(project.main_image, project.main_image_alt)}
    <div class="prose">${renderMarkdown(project.description || "")}</div>
    ${technologies.length ? `<h2>Technology</h2><ul class="tag-list">${technologies.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>` : ""}
    ${strings(project.features).length ? `<h2>What it includes</h2><ul>${strings(project.features).map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>` : ""}
    ${gallery.length ? `<div class="gallery">${gallery.map((item) => figure(item.image, item.alt)).join("")}</div>` : ""}
    <p class="actions">
      ${externalLink(project.external_url, "Visit the project")}
      ${externalLink(project.github_url, "View the repository")}
    </p>
    <p><a href="/projects/">Back to projects</a></p>
  </article>`;
}

function certificatesPage(certificates) {
  const rows = certificates.map((item) => `<article class="record">
    ${figure(item.display_image || (String(item.file || "").match(/\.(png|jpe?g|webp|gif)$/i) ? item.file : ""), item.title)}
    <div>
      <h2>${escapeHtml(item.title)}</h2>
      <p class="meta">${escapeHtml(item.issuing_organization || "")}${item.date ? ` · ${escapeHtml(item.date)}` : ""}</p>
      ${item.credential_id ? `<p class="meta">Credential ${escapeHtml(item.credential_id)}</p>` : ""}
      <div class="prose">${renderMarkdown(item.description || "")}</div>
      ${externalLink(item.credential_url, "Verify this credential")}
      ${href(item.file) ? `<p><a href="${href(item.file)}">Open the certificate file</a></p>` : ""}
    </div>
  </article>`).join("");
  return `<section class="shell section page-intro">
    <p class="eyebrow">Certificates</p>
    <h1>Certificates</h1>
    ${rows || `<p class="empty">No certificates are published yet.</p>`}
  </section>`;
}

function designPage(design) {
  const rows = design.map((item) => `<article class="record">
    ${figure(item.image, item.image_alt || item.title)}
    <div>
      <p class="meta">${escapeHtml([item.category, item.year].filter(Boolean).join(" · "))}</p>
      <h2>${escapeHtml(item.title)}</h2>
      <div class="prose">${renderMarkdown(item.description || "")}</div>
      ${Array.isArray(item.gallery) ? `<div class="gallery">${item.gallery.map((image) => figure(image.image, image.alt)).join("")}</div>` : ""}
    </div>
  </article>`).join("");
  return `<section class="shell section page-intro">
    <p class="eyebrow">Graphic design</p>
    <h1>Design work</h1>
    <p class="lede">Published pieces with an image. Drafts stay out of this page.</p>
    ${rows || `<p class="empty">Published graphic design will appear here once a piece has an image and is marked public.</p>`}
  </section>`;
}

function experienceRow(item) {
  const period = item.period_label || [item.start_date, item.end_date || "Present"].filter(Boolean).join(" – ");
  return `<article class="timeline-item">
    <p class="meta">${escapeHtml(period)}</p>
    <h2>${escapeHtml(item.position || "")}</h2>
    <p class="standfirst">${escapeHtml(item.organization || "")}</p>
    <div class="prose">${renderMarkdown(item.description || "")}</div>
    ${strings(item.responsibilities).length ? `<ul>${strings(item.responsibilities).map((line) => `<li>${escapeHtml(line)}</li>`).join("")}</ul>` : ""}
    ${strings(item.achievements).length ? `<ul>${strings(item.achievements).map((line) => `<li>${escapeHtml(line)}</li>`).join("")}</ul>` : ""}
  </article>`;
}

function experiencePage(experience, education) {
  return `${categoryNav("/experience/")}
  <section class="shell section page-intro">
    <p class="eyebrow">Experience</p>
    <h1>Experience and leadership</h1>
    <div class="listing">${experience.map(experienceRow).join("") || `<p class="empty">No experience is published yet.</p>`}</div>
    <h2>Education</h2>
    <div class="listing">${education.map(educationRow).join("") || ""}</div>
    <p><a href="/education/">Education page</a></p>
  </section>`;
}

function educationRow(item) {
  return `<article class="timeline-item">
    <p class="meta">${escapeHtml(item.dates || "")}</p>
    <h2>${escapeHtml(item.qualification || "")}</h2>
    <p class="standfirst">${escapeHtml(item.institution || "")}${item.program ? ` · ${escapeHtml(item.program)}` : ""}</p>
    <div class="prose">${renderMarkdown(item.description || "")}</div>
  </article>`;
}

function educationPage(education) {
  return `${categoryNav("/education/")}
  <section class="shell section page-intro">
    <p class="eyebrow">Education</p>
    <h1>Education</h1>
    <div class="listing">${education.map(educationRow).join("") || `<p class="empty">No education records are published yet.</p>`}</div>
  </section>`;
}

function contactPage(profile, site) {
  const email = profile.contact_email || site.contact_email || "";
  return `${categoryNav("/contact/")}
  <section class="shell section contact-layout">
    <div class="page-intro">
      <p class="eyebrow">Contact</p>
      <h1>Start a conversation</h1>
      <p class="lede">Send a note about a project, placement, or collaboration. Messages are delivered through Netlify Forms.</p>
      ${email ? `<p><a href="mailto:${escapeHtml(email)}">${escapeHtml(email)}</a></p>` : ""}
      ${profile.location ? `<p class="meta">${escapeHtml(profile.location)}</p>` : ""}
    </div>
    <form class="contact-form" name="contact" method="POST" action="/contact/success/" data-netlify="true" data-contact-form netlify-honeypot="bot-field" novalidate>
      <input type="hidden" name="form-name" value="contact">
      <p class="honeypot" aria-hidden="true">
        <label>Leave this field empty<input name="bot-field" tabindex="-1" autocomplete="off"></label>
      </p>
      <div class="field">
        <label for="full-name">Full name</label>
        <input id="full-name" name="full-name" type="text" autocomplete="name" required maxlength="120" aria-describedby="full-name-error">
        <p class="field-error" id="full-name-error"></p>
      </div>
      <div class="field">
        <label for="email">Email</label>
        <input id="email" name="email" type="email" autocomplete="email" required maxlength="160" aria-describedby="email-error">
        <p class="field-error" id="email-error"></p>
      </div>
      <div class="field">
        <label for="subject">Subject</label>
        <input id="subject" name="subject" type="text" required maxlength="160" aria-describedby="subject-error">
        <p class="field-error" id="subject-error"></p>
      </div>
      <div class="field">
        <label for="message">Message</label>
        <textarea id="message" name="message" rows="7" required maxlength="5000" aria-describedby="message-error"></textarea>
        <p class="field-error" id="message-error"></p>
      </div>
      <button class="button button-solid" type="submit">Send message</button>
      <p class="form-status" id="form-status" role="status"></p>
    </form>
  </section>`;
}

function successPage() {
  return `<section class="shell section narrow page-intro">
    <p class="eyebrow">Contact</p>
    <h1>Message sent</h1>
    <p class="lede">Thank you. The note is with the site inbox and is not stored in the portfolio repository.</p>
    <p><a href="/">Return home</a></p>
  </section>`;
}

function sitemap(site, pages) {
  const base = safeUrl(site.canonical_site_url).replace(/\/$/, "");
  const locs = pages
    .map((page) => page.path)
    .filter((file) => file.endsWith(".html") && file !== "404.html")
    .map((file) => {
      if (file === "index.html") return "/";
      return `/${file.replace(/index\.html$/, "")}`;
    });
  const body = locs.map((loc) => {
    const value = base ? `${base}${loc}` : loc;
    return `  <url><loc>${escapeHtml(value)}</loc></url>`;
  }).join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>\n`;
}

export function buildSearchIndex(content) {
  const profile = content.profile || {};
  const items = [];
  const add = (type, title, url, text) => {
    const name = String(title || "").trim();
    const path = String(url || "").trim();
    if (!name || !path) return;
    items.push({
      type,
      title: name,
      url: path,
      text: String(text || "").replace(/\s+/g, " ").trim(),
    });
  };

  add(
    "Profile",
    profile.name,
    "/about/",
    [profile.professional_title, profile.introduction, profile.location, profile.biography, ...strings(profile.interests)].filter(Boolean).join(" "),
  );

  for (const project of publicEntries(content.projects)) {
    add(
      "Project",
      project.title,
      `/projects/${project.slug}/`,
      [project.summary, project.description, project.category, project.year, project.role, ...strings(project.technologies)].filter(Boolean).join(" "),
    );
  }
  for (const skill of publicEntries(content.skills)) {
    add("Skill", skill.name, `/skills/#${slugify(skill.category)}`, [skill.category, skill.description].filter(Boolean).join(" "));
  }
  for (const item of publicEntries(content.experience)) {
    add(
      "Experience",
      item.position,
      "/experience/",
      [item.organization, item.period_label, item.description, ...strings(item.responsibilities)].filter(Boolean).join(" "),
    );
  }
  for (const item of publicEntries(content.education)) {
    add(
      "Education",
      item.qualification,
      "/education/",
      [item.institution, item.program, item.dates, item.description].filter(Boolean).join(" "),
    );
  }
  return items;
}

function robots(site) {
  const base = safeUrl(site.canonical_site_url).replace(/\/$/, "");
  const sitemapLine = base ? `\nSitemap: ${base}/sitemap.xml\n` : "\n";
  return `User-agent: *\nAllow: /\nDisallow: /admin/${sitemapLine}`;
}
