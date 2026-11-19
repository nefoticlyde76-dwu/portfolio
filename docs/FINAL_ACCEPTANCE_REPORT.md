# Final acceptance report

Audit date: 19 November 2026. Runtime for the recorded commands: Node.js 22.23.4 and npm 10.9.9, invoked from `C:\Users\ID230176\AppData\Roaming\fnm\node-versions\v22.23.4\installation`. The default `node` on PATH remains Node.js 24.14.0. Nothing was committed, pushed, or deployed. OAuth was not completed.

## Commands

| Command | Result |
|---|---|
| `npm ci` | PASS. 22 packages, 0 audit vulnerabilities. |
| `npm run validate:content` | PASS. JSON and `admin/config.yml` accepted. |
| `npm test` | PASS. 9 tests, 0 failed. |
| `npm run build` | PASS. 16 output files in `dist/`. Public CV withheld. |
| `git diff --check` | PASS with a limit. Exit code 0. The branch has no commit, so this checks an empty index diff and does not inspect untracked files. A separate read of the source text files found no trailing whitespace and no conflict markers. `admin/decap-cms.js`, `node_modules/`, and `dist/` were excluded from that read. |

`validate:content` was missing. It now runs the same validator as `npm run validate`.

## Application restrictions

| Check | Result | Evidence |
|---|---|---|
| Static HTML, CSS, and JavaScript output | PASS | `dist` is generated files. Node is used for the build and tests. |
| No PHP, SQL, Python, Ruby, Go, Java, or .NET application code | PASS | Source scan and the security test. |
| No database client, ORM, Express, Netlify Functions, or Vercel Blob | PASS | `npm ls --omit=dev` shows bootstrap 5.3.9, bootstrap-icons 1.13.2, js-yaml 4.3.2, marked 15.0.12, and sanitize-html 2.18.2. |
| Decap is the only admin interface | PASS | `/admin/` loads the pinned Decap bundle. |
| Decap bundle contains upstream library code | PASS | `admin/decap-cms.js` is the official 3.18.0 browser build. It is not a separate application dependency. |

## Decap CMS

Seven collections: settings (profile, site, resume), projects, certificates, design, skills, experience, and education.

| Check | Result | Evidence |
|---|---|---|
| Repository `nefoticlyde76-dwu/portfolio` | PASS | `backend.repo` in `admin/config.yml`. |
| Branch `rebuild/netlify-decap` | PASS | `backend.branch`. |
| Pinned CMS 3.18.0 | PASS | `admin/decap-cms.js` was saved from the jsDelivr 3.18.0 URL. `admin/index.html` loads that local file. |
| JSON folder and file collections | PASS | Paths exist. Validator accepts every file. |
| Media folders match `public/uploads` | PASS | Global `public_folder` is `/uploads`. Collection folders use `/public/uploads/...`. |
| No committed token or client secret | PASS | Config and security test. |
| `publish_mode: editorial_workflow` | PASS | Present at the root of `config.yml`. |
| OAuth login completed | BLOCKED | `/admin/` shows **Login with GitHub**. No OAuth app exists and login was not continued. |
| Draft pull request created | NOT VERIFIED | The workflow is configured. No GitHub write was made. |

`auth_scope` is `public_repo` because the repository is public. That GitHub scope lets the signed-in account read and write public repositories that account can already access: contents, branches, and pull requests. It does not grant access to private repositories. It is also not limited to `nefoticlyde76-dwu/portfolio`. If the owner's primary GitHub account approves it, the browser token Decap stores can change other public repositories that account can push to, until the session ends or the token is revoked. A dedicated account, or a later review of GitHub's current scope model, would narrow that risk. No OAuth credentials were created.

## Editorial workflow and public visibility

Saving a draft is intended to open a pull request onto `rebuild/netlify-decap`. Publishing merges that pull request. Unpublishing is a later edit that sets `published` to false. The website build then omits the entry.

The repository is public. After a push, every file on the branch is publicly readable, including entries with `published: false`. Draft pull requests on a public repository are publicly readable too. Website publication flags do not make Git content private. The two design drafts are in `content/design/` for that reason. They do not appear on the public pages. They will be readable on GitHub once this branch is pushed.

## Content

| Check | Result | Evidence |
|---|---|---|
| Unpublished design entries absent from pages | PASS | Design page shows the empty state. The two draft titles are absent. |
| CV absent | PASS | No resume file in Git or `dist`. About says a public download is not available. |
| No patient, credential, or client records | PASS | TeleHealth uses the public homepage image and a general description. |
| National Content Reporting Automation excluded | PASS | Owner decision, 19 November 2026. The project file and activity diagram are removed. PHP, MySQL, JavaScript, and Bootstrap descriptions no longer cite that project. |
| Claims that still need the owner's confirmation | NOT VERIFIED | Listed below. They remain because they come from the earlier portfolio notes, not because a new source proved them. |

Owner confirmation still needed:

- Express is listed only under Coursework Exposure. Agile planning is not a skill. DigitalOcean is named without App Platform. The TeleHealth page records ten Agile sprints as project delivery, not as a skill.
- The biography's second paragraph is the earlier home-page sentence, "A system should be clear to use..."
- The GitHub link is the account that owns this repository.
- TeleHealth names Daily API and DomPDF from the project brief. The earlier public project note said browser video and PDF export without those product names.

## Netlify and security

| Check | Result | Evidence |
|---|---|---|
| Node 22, `npm run build`, publish `dist` | PASS | `netlify.toml`. |
| `/admin/`, clean routes, project pages, sitemap, robots, 404 | PASS | Local server returned 200 for each route. `robots.txt` disallows `/admin/`. |
| Contact form detectable by Netlify | PASS for markup | Generated `dist/contact/index.html` has `data-netlify="true"`, `name="contact"`, `form-name`, `bot-field`, and the four fields. |
| Netlify stored a submission | BLOCKED | No Netlify site. |
| Form validation | PASS | At 360px, empty fields showed "This field is required." An earlier check showed "Enter a valid email address." for `not-an-email`. |
| Unsafe HTML and `innerHTML` | PASS | Build escapes text and sanitizes Markdown. `site.js` writes errors with `textContent`. |
| Secrets in the future commit | PASS | No token, secret, CV, or patient file is in the allowlist. |

## Viewports actually measured

| Width | Where | Result |
|---|---|---|
| 1440 | Home, contact, admin | PASS. No horizontal overflow. Desktop navigation. Admin showed the GitHub login button and `noindex`. |
| 1280 | Home | PASS. No overflow. Navigation toggle hidden. |
| 1024 | Home | PASS. No overflow. Hero stacks. Toggle hidden. |
| 768 | Home | PASS. No overflow. Toggle visible. |
| 390 | Home | PASS. No overflow. Toggle visible. Portrait and full-width buttons visible. |
| 360 | Home, TeleHealth detail, certificates, design, contact | PASS. No overflow. Mobile menu opened and showed About, Projects, Experience, Design, and Contact. |

Pages opened in the browser before this removal: home, about, skills, projects, TeleHealth, certificates, design, experience, education, contact, 404, and `/admin/`. WPU is linked from the projects page. Resource failures checked on the home page: none. Certificate and TeleHealth images loaded.

## Still manual

Create the GitHub OAuth app, install it in Netlify, sign in once, run a real draft and publish, confirm the contact form in Netlify Forms, set `canonical_site_url`, and decide the items listed for owner confirmation. Do not point the CMS at `main` until that is a separate decision.
