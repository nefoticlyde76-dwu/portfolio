# Clyde Nefoti — portfolio

Static portfolio for Clyde Nefoti. GitHub stores the source and content. Decap CMS edits that content. Netlify builds `dist` and hosts the site. There is no database, PHP runtime, or application server.

```text
Decap at /admin/  →  commit or pull request on GitHub  →  Netlify runs npm run build  →  static site
```

The CMS is configured for repository `nefoticlyde76-dwu/portfolio` and branch `rebuild/netlify-decap`.

## Local commands

Requires Node.js 22. The machine used for this rebuild had Node.js 24, which can run the same scripts.

```text
npm ci
npm run validate
npm test
npm run build
npm run verify
```

`npm run build` writes the site to `dist/`. Open `dist/index.html` through a static server. The contact form and CMS login need a Netlify site before they can be accepted end to end.

## Layout

```text
admin/          Decap CMS 3.18.0 and config.yml
content/        JSON edited by the CMS
public/         CSS, JavaScript, and approved media
scripts/        Validation and static build
tests/          Content, security, and build checks
docs/           Architecture, admin, deployment, and acceptance notes
```

## Read next

- [Architecture](docs/NETLIFY_DECAP_ARCHITECTURE.md)
- [CMS admin guide](docs/DECAP_CMS_ADMIN_GUIDE.md)
- [Netlify deployment](docs/NETLIFY_DEPLOYMENT_GUIDE.md)
- [Implementation report](docs/REBUILD_IMPLEMENTATION_REPORT.md)
- [Acceptance report](docs/FINAL_ACCEPTANCE_REPORT.md)
