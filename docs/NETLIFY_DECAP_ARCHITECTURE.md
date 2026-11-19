# Architecture

## What runs where

| Piece | Role |
|---|---|
| GitHub `nefoticlyde76-dwu/portfolio` | Source, JSON content, and media. Public repository. |
| Decap CMS 3.18.0 at `/admin/` | Editorial interface. Writes JSON and media back to GitHub. |
| Node.js 22 build | Validates content and writes static HTML, sitemap, and robots.txt into `dist/`. |
| Netlify | Runs `npm run build`, publishes `dist`, stores contact-form submissions, and holds the GitHub OAuth client secret. |
| Browser | HTML, CSS, Bootstrap 5, and vanilla JavaScript. |

Nothing in the request path queries a database. The build does not start a server. Netlify Functions are not used.

## Content model

Unique records live in `content/settings/`:

- `profile.json` — name, biography, portrait, location, social links, availability.
- `site.json` — titles, navigation, footer, SEO, canonical URL, and `show_cv_download`.
- `resume.json` — CV file path and `public_release_approved`.

Repeatable records are one JSON file per entry:

```text
content/projects/
content/certificates/
content/design/
content/skills/
content/experience/
content/education/
```

A public page includes an entry only when `published` is true and `visibility` is `public`. Design pieces also need an image. The build rejects malformed JSON, duplicate slugs, unsafe URLs, and missing media files.

Descriptions may contain a small Markdown subset. The build converts that Markdown and then sanitizes it. Scripts, inline HTML, and `javascript:` links are removed.

## Media

Decap saves uploads under `public/uploads/`, with collection folders for profile, projects, certificates, design, and resume. The build copies `public/` into `dist/` except `public/uploads/resume/`.

A CV is copied only when all of these are true:

1. `content/settings/site.json` has `show_cv_download: true`.
2. `content/settings/resume.json` has `public_release_approved: true`.
3. The file path stays inside `/uploads/resume/` and uses an allowed extension.

The repository is public. A CV committed to GitHub is downloadable from GitHub even when the website hides the link. Both flags default to false, and no CV file is stored.

## Decap and GitHub

`admin/config.yml` sets:

```yaml
backend:
  name: github
  repo: nefoticlyde76-dwu/portfolio
  branch: rebuild/netlify-decap
  auth_scope: public_repo
publish_mode: editorial_workflow
```

`public_repo` matches this public repository. It is enough to commit and open pull requests on this repository without requesting access to private repositories. If the repository later becomes private, the scope must be reviewed before changing it to `repo`.

`editorial_workflow` makes Decap open a pull request for a draft instead of committing straight onto the branch. Publishing merges that pull request. The target branch is `rebuild/netlify-decap`, not `main`.

The admin page loads the pinned file `admin/decap-cms.js` from Decap CMS 3.18.0. The GitHub OAuth client secret is not in the repository. Netlify stores it in the site’s OAuth provider settings. See the deployment guide.

## Static build

`scripts/build.mjs`:

1. Validates JSON and `admin/config.yml`.
2. Clears `dist/`.
3. Copies approved public files and the `admin/` directory.
4. Copies Bootstrap 5 and Bootstrap Icons from `node_modules`.
5. Renders escaped HTML pages.
6. Writes `sitemap.xml`, `robots.txt`, and `404.html`.

Clean URLs are directories with `index.html`, for example `/projects/telehealth-consultation-system/`.

## Contact

The contact page contains a real HTML form named `contact` with `data-netlify="true"`, a hidden `form-name` field, and a honeypot named `bot-field`. Netlify detects that form during deploy. Submissions stay in Netlify Forms. They are not written into GitHub.

## Security headers

`netlify.toml` sets frame, content-type, referrer, and permissions headers. Each public page carries its own Content-Security-Policy that allows only same-origin scripts and styles. `/admin/` has a separate policy because the Decap bundle needs `unsafe-eval`, inline styles, and connections to `api.github.com` and `api.netlify.com`. A single site-wide CSP header is not used, because Netlify combines matching headers and the stricter policy would also bind the CMS.

`robots.txt` disallows `/admin/`. The admin document is `noindex, nofollow`.
