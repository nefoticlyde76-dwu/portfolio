# Netlify deployment

This rebuild has not created a Netlify site, has not pushed the branch, and has not deployed. The steps below are the manual setup still required.

## 1. Repository

Connect Netlify to:

```text
https://github.com/nefoticlyde76-dwu/portfolio
```

Do not connect `clyde_portfolio`.

`netlify.toml` already sets:

| Setting | Value |
|---|---|
| Base directory | Repository root |
| Build command | `npm run build` |
| Publish directory | `dist` |
| Node version | 22 |
| Functions | None |

For the first site, set the production branch only after `rebuild/netlify-decap` has been reviewed. Until then, deploy that branch as a preview or staging branch. Do not make `main` the CMS publish target yet. `main` currently has no commits.

## 2. GitHub OAuth application

Decap’s GitHub backend needs Netlify to complete OAuth. The client secret stays in Netlify, never in Git.

1. GitHub → Settings → Developer settings → OAuth Apps → New OAuth App.
2. Homepage URL: the Netlify site URL, for example `https://YOUR-SITE.netlify.app`.
3. Authorization callback URL: `https://api.netlify.com/auth/done`.
4. Copy the Client ID. Generate a Client Secret and copy it once.

## 3. Netlify OAuth provider

1. Netlify → Project configuration → Security → OAuth.
2. Authentication providers → Install provider → GitHub.
3. Paste the Client ID and Client Secret. Save.

Official reference: [OAuth provider tokens](https://docs.netlify.com/manage/security/secure-access-to-sites/oauth-provider-tokens/).

This is the GitHub backend, not Git Gateway and not Netlify Identity. Identity is not required for this setup.

After this is saved, open `/admin/` and sign in with a GitHub account that can write to `nefoticlyde76-dwu/portfolio`. The CMS config asks for the `public_repo` scope. Do not mark login as working until that sign-in succeeds on the deployed site.

## 4. Contact form

The form is static HTML in `dist/contact/index.html`:

- Form name: `contact`
- `data-netlify="true"`
- Hidden input `form-name`
- Honeypot `bot-field`
- Fields: full name, email, subject, message
- Success page: `/contact/success/`

In Netlify → Forms, confirm form detection is enabled. After the first deploy that contains the form, the `contact` form should appear. It will not appear from a local preview.

To email yourself on submission: Forms → the `contact` form → Form notifications → Add notification → Email notification. Without that, messages stay in the Netlify Forms dashboard only.

## 5. Domain and canonical URL

When the domain is final, set `canonical_site_url` in `content/settings/site.json` to the `https://` origin. The sitemap and `robots.txt` then use absolute URLs. Until that field is set, the sitemap lists root-relative paths and `robots.txt` does not advertise a sitemap URL.

Add the domain in Netlify → Domain management. HTTPS is provided by Netlify.

## 6. Production cutover

1. Review `rebuild/netlify-decap`.
2. Confirm OAuth login, a draft pull request, a publish, and an unpublish on the staging site.
3. Confirm the contact form arrives in Netlify Forms.
4. Decide whether `main` becomes the production branch.
5. Only then change `backend.branch` if production should receive CMS publishes. That change needs its own review.

## 7. What not to add

Do not add a database, Netlify Functions, Netlify Blobs, or a custom authentication server for this portfolio.
