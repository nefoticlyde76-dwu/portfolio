import { escapeHtml, safeUrl } from "./html.mjs";
import { renderMarkdown } from "./markdown.mjs";
import { cvIsReleased, publicEntries } from "./content.mjs";

const PUBLIC_CSP = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self'",
  "img-src 'self' data:",
  "font-src 'self'",
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

function layout({ site, profile, title, description, pathname, body }) {
  const pageTitle = title ? `${title} · ${site.site_title}` : (site.seo_title || site.site_title);
  const summary = description || site.seo_description || profile.introduction || "";
  const canonicalBase = safeUrl(site.canonical_site_url);
  const canonical = canonicalBase ? `${canonicalBase.replace(/\/$/, "")}${pathname}` : "";
  const navigation = Array.isArray(site.navigation) ? site.navigation : [];
  const footerLinks = Array.isArray(site.footer_links) ? site.footer_links : [];
  const year = new Date().getFullYear();
  const email = profile.contact_email || site.contact_email || "";

  const navItems = navigation.map((item) => {
    const safe = href(item.href);
    if (!safe) return "";
    const current = item.href === pathname ? ' aria-current="page"' : "";
    return `<li><a href="${safe}"${current}>${escapeHtml(item.label || "")}</a></li>`;
  }).join("");

  const footerItems = footerLinks.map((item) => {
    const safe = href(item.href);
    if (!safe) return "";
    return `<li><a href="${safe}">${escapeHtml(item.label || "")}</a></li>`;
  }).join("");

  const social = socialLinks(profile, site).map((item) => (
    `<li><a href="${href(item.url)}" rel="noopener noreferrer">${escapeHtml(item.label)}</a></li>`
  )).join("");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="description" content="${escapeHtml(summary)}">
  <meta name="theme-color" content="#282B4A">
  <meta http-equiv="Content-Security-Policy" content="${PUBLIC_CSP}">
  <title>${escapeHtml(pageTitle)}</title>
  ${canonical ? `<link rel="canonical" href="${escapeHtml(canonical)}">` : ""}
  <link rel="icon" href="/assets/images/favicon.svg" type="image/svg+xml">
  <link rel="stylesheet" href="/assets/vendor/bootstrap/bootstrap.min.css">
  <link rel="stylesheet" href="/assets/vendor/bootstrap-icons/bootstrap-icons.css">
  <link rel="stylesheet" href="/assets/css/site.css">
</head>
<body>
  <a class="skip-link" href="#content">Skip to content</a>
  <header class="site-header">
    <nav class="navbar navbar-expand-lg shell" aria-label="Primary">
      <a class="wordmark" href="/">${escapeHtml(site.wordmark || site.site_title)}</a>
      <button class="nav-toggle navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#site-nav" aria-controls="site-nav" aria-expanded="false" aria-label="Open navigation">
        <span></span><span></span>
      </button>
      <div id="site-nav" class="collapse navbar-collapse site-nav">
        <ul class="navbar-nav">${navItems}</ul>
      </div>
    </nav>
  </header>
  <main id="content">${body}</main>
  <footer class="site-footer">
    <div class="shell footer-grid">
      <div>
        <p class="wordmark">${escapeHtml(site.wordmark || profile.name || "")}</p>
        <p>${escapeHtml(site.footer_text || "")}</p>
      </div>
      <div>
        <p class="label">Explore</p>
        <ul class="plain-list">${footerItems}</ul>
      </div>
      <div>
        <p class="label">Contact</p>
        ${email ? `<p><a href="mailto:${escapeHtml(email)}">${escapeHtml(email)}</a></p>` : `<p><a href="/contact/">Send a message</a></p>`}
        ${social ? `<ul class="plain-list social-list">${social}</ul>` : ""}
      </div>
    </div>
    <div class="shell footer-base">
      <p>© ${year} ${escapeHtml(site.copyright_text || profile.name || "")}</p>
      <p><a href="/admin/">Content manager</a></p>
    </div>
  </footer>
  <script src="/assets/vendor/bootstrap/bootstrap.bundle.min.js" defer></script>
  <script src="/assets/js/site.js" defer></script>
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

function projectRow(project) {
  const technologies = strings(project.technologies);
  return `<article class="index-row">
    <p class="meta">${projectMeta(project)}</p>
    <h2><a href="/projects/${escapeHtml(project.slug)}/">${escapeHtml(project.title)}</a></h2>
    <p>${escapeHtml(project.summary || "")}</p>
    ${technologies.length ? `<p class="meta">${technologies.map((item) => escapeHtml(item)).join(" · ")}</p>` : ""}
  </article>`;
}

export function renderSite(content) {
  const { site, profile } = content;
  const projects = publicEntries(content.projects);
  const certificates = publicEntries(content.certificates);
  const design = publicEntries(content.design).filter((item) => safeUrl(item.image));
  const skills = publicEntries(content.skills);
  const experience = publicEntries(content.experience);
  const education = publicEntries(content.education);
  const showCv = cvIsReleased(site, content.resume);
  const pages = [];

  const add = (filePath, pathname, title, description, body) => {
    pages.push({
      path: filePath,
      html: layout({ site, profile, title, description, pathname, body }),
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
      body: `<section class="shell section narrow"><p class="label">404</p><h1>This page is not available.</h1><p><a href="/">Return home</a></p></section>`,
    }),
  });
  pages.push({ path: "sitemap.xml", html: sitemap(site, pages) });
  pages.push({ path: "robots.txt", html: robots(site) });
  return pages;
}

function homePage({ site, profile, projects, skills, experience }) {
  const featured = projects.filter((project) => project.featured).slice(0, 3);
  const selected = featured.length ? featured : projects.slice(0, 3);
  const skillNames = skills
    .filter((skill) => skill.category !== "Coursework Exposure")
    .map((skill) => skill.name)
    .filter(Boolean);
  return `<section class="shell hero">
    <div class="hero-copy">
      <p class="label">${escapeHtml(site.hero_kicker || profile.location || "")}</p>
      <h1>${escapeHtml(site.hero_heading || profile.name)}</h1>
      <p class="standfirst">${escapeHtml(profile.professional_title || "")}</p>
      <p class="lede">${escapeHtml(site.hero_summary || profile.introduction || "")}</p>
      <div class="actions">
        <a class="button button-solid" href="/projects/">View projects</a>
        <a class="button button-line" href="/contact/">Contact</a>
      </div>
    </div>
    ${profile.profile_image ? `<div class="hero-portrait">${figure(profile.profile_image, profile.profile_image_alt, { eager: true })}</div>` : ""}
  </section>
  <section class="shell section">
    <div class="section-head"><p class="label">Selected work</p><a href="/projects/">All projects</a></div>
    ${selected.map(projectRow).join("") || `<p class="empty">Published projects will appear here.</p>`}
  </section>
  <section class="shell section split">
    <div>
      <p class="label">About</p>
      <h2>A clear system is easier to trust.</h2>
      <p>${escapeHtml(profile.introduction || "")}</p>
      <p><a href="/about/">Read the profile</a></p>
    </div>
    <div>
      <p class="label">Skills</p>
      ${skillNames.length ? `<ul class="name-list">${skillNames.map((name) => `<li>${escapeHtml(name)}</li>`).join("")}</ul>` : `<p class="empty">No skills are published yet.</p>`}
      <p><a href="/skills/">Browse by area</a></p>
    </div>
  </section>
  <section class="shell section">
    <div class="section-head"><p class="label">Recent experience</p><a href="/experience/">Experience</a></div>
    ${experience.slice(0, 3).map(experienceRow).join("") || `<p class="empty">Published experience will appear here.</p>`}
  </section>`;
}

function interestSection(profile) {
  const items = Array.isArray(profile.interests) ? profile.interests.map((item) => String(item || "").trim()).filter(Boolean) : [];
  if (!items.length) return "";
  return `<section class="shell section narrow">
    <h2>Interests</h2>
    <ul class="name-list">${items.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>
  </section>`;
}

function aboutPage({ profile, education, showCv, resume }) {
  const cvHref = showCv ? href(resume.file) : "";
  return `<section class="shell section narrow page-intro">
    <p class="label">About</p>
    <h1>${escapeHtml(profile.name || "")}</h1>
    <p class="standfirst">${escapeHtml(profile.professional_title || "")}</p>
    ${profile.location ? `<p class="meta">${escapeHtml(profile.location)}</p>` : ""}
    <div class="prose">${renderMarkdown(profile.biography || profile.introduction || "")}</div>
    ${profile.availability ? `<p><strong>Availability.</strong> ${escapeHtml(profile.availability)}</p>` : ""}
  </section>
  ${interestSection(profile)}
  <section class="shell section narrow">
    <h2>Education</h2>
    ${education.map(educationRow).join("") || `<p class="empty">No education records are published yet.</p>`}
    <p><a href="/education/">Education details</a></p>
  </section>
  <section class="shell section narrow">
    <h2>CV</h2>
    ${cvHref ? `<p><a href="${cvHref}">Download the public CV</a></p>` : `<p>A public CV download is not available.</p>`}
  </section>`;
}

function skillsPage(skills) {
  const groups = groupBy(skills, "category");
  const body = [...groups.entries()].map(([category, items]) => `<section class="skill-group">
    <h2>${escapeHtml(category)}</h2>
    <ul class="name-list">
      ${items.map((skill) => `<li><span>${escapeHtml(skill.name)}</span>${skill.description ? `<small>${escapeHtml(skill.description)}</small>` : ""}</li>`).join("")}
    </ul>
  </section>`).join("");
  return `<section class="shell section page-intro">
    <p class="label">Skills</p>
    <h1>Capabilities</h1>
    <p class="lede">Names only, without proficiency scores. Coursework exposure is listed separately from the professional skills.</p>
    ${body || `<p class="empty">No skills are published yet.</p>`}
  </section>`;
}

function projectsPage(projects) {
  return `<section class="shell section page-intro">
    <p class="label">Projects</p>
    <h1>Selected projects</h1>
    <p class="lede">Software, systems, and academic work with a published record.</p>
    ${projects.map(projectRow).join("") || `<p class="empty">No projects are published yet.</p>`}
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
    <p class="label">Project</p>
    <h1>${escapeHtml(project.title)}</h1>
    <p class="lede">${escapeHtml(project.summary || "")}</p>
    ${facts.length ? `<dl class="facts">${facts.map(([label, value]) => `<div><dt>${escapeHtml(label)}</dt><dd>${escapeHtml(value)}</dd></div>`).join("")}</dl>` : ""}
    ${figure(project.main_image, project.main_image_alt)}
    <div class="prose">${renderMarkdown(project.description || "")}</div>
    ${technologies.length ? `<h2>Technology</h2><ul class="name-list">${technologies.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>` : ""}
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
    <p class="label">Certificates</p>
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
    <p class="label">Graphic design</p>
    <h1>Design work</h1>
    <p class="lede">Published pieces with an image. Drafts stay out of this page.</p>
    ${rows || `<p class="empty">Published graphic design will appear here once a piece has an image and is marked public.</p>`}
  </section>`;
}

function experienceRow(item) {
  const period = item.period_label || [item.start_date, item.end_date || "Present"].filter(Boolean).join(" – ");
  return `<article class="index-row">
    <p class="meta">${escapeHtml(period)}</p>
    <h2>${escapeHtml(item.position || "")}</h2>
    <p class="standfirst">${escapeHtml(item.organization || "")}</p>
    <div class="prose">${renderMarkdown(item.description || "")}</div>
    ${strings(item.responsibilities).length ? `<ul>${strings(item.responsibilities).map((line) => `<li>${escapeHtml(line)}</li>`).join("")}</ul>` : ""}
    ${strings(item.achievements).length ? `<ul>${strings(item.achievements).map((line) => `<li>${escapeHtml(line)}</li>`).join("")}</ul>` : ""}
  </article>`;
}

function experiencePage(experience, education) {
  return `<section class="shell section page-intro">
    <p class="label">Experience</p>
    <h1>Experience</h1>
    ${experience.map(experienceRow).join("") || `<p class="empty">No experience is published yet.</p>`}
    <h2>Education</h2>
    ${education.map(educationRow).join("") || ""}
    <p><a href="/education/">Education page</a></p>
  </section>`;
}

function educationRow(item) {
  return `<article class="index-row">
    <p class="meta">${escapeHtml(item.dates || "")}</p>
    <h2>${escapeHtml(item.qualification || "")}</h2>
    <p class="standfirst">${escapeHtml(item.institution || "")}${item.program ? ` · ${escapeHtml(item.program)}` : ""}</p>
    <div class="prose">${renderMarkdown(item.description || "")}</div>
  </article>`;
}

function educationPage(education) {
  return `<section class="shell section page-intro">
    <p class="label">Education</p>
    <h1>Education</h1>
    ${education.map(educationRow).join("") || `<p class="empty">No education records are published yet.</p>`}
  </section>`;
}

function contactPage(profile, site) {
  const email = profile.contact_email || site.contact_email || "";
  return `<section class="shell section contact-layout">
    <div class="page-intro">
      <p class="label">Contact</p>
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
    <p class="label">Contact</p>
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

function robots(site) {
  const base = safeUrl(site.canonical_site_url).replace(/\/$/, "");
  const sitemapLine = base ? `\nSitemap: ${base}/sitemap.xml\n` : "\n";
  return `User-agent: *\nAllow: /\nDisallow: /admin/${sitemapLine}`;
}
