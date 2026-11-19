# Decap CMS admin guide

The content manager is at `/admin/` on the deployed site. It is Decap CMS 3.18.0, pinned in `admin/decap-cms.js`. Login uses GitHub through Netlify’s OAuth provider. That login is not available until the deployment guide’s OAuth steps are finished.

You need write access to `nefoticlyde76-dwu/portfolio`. The CMS reads and writes branch `rebuild/netlify-decap`.

## Log in

1. Open `https://YOUR-SITE/admin/`.
2. Choose **Login with GitHub**.
3. Approve the GitHub prompt. The requested scope is `public_repo` because this repository is public.
4. You should land in the Decap collections.

Do not put a GitHub token or the OAuth client secret in the repository, the CMS config, or the browser source.

## Editorial workflow

`publish_mode` is `editorial_workflow`.

| Action in Decap | What GitHub does |
|---|---|
| Save a draft | Opens a pull request from a `cms/...` branch onto `rebuild/netlify-decap`. |
| Edit the draft | Adds another commit to that pull request. |
| Publish | Merges the pull request into `rebuild/netlify-decap`. |
| Unpublish | Edit the entry, set **Published** to false, and publish that change. The next build omits it. |

New entries default to unpublished and private. The public site shows an entry only when **Published** is on and **Visibility** is public.

Review the pull request before merging. Decap’s publish button is the merge. Do not point the CMS at `main` until that cutover is an explicit decision.

## Profile

**Site settings → Profile** edits `content/settings/profile.json`: name, title, introduction, biography, portrait, location, email, GitHub, LinkedIn, and availability. Leave email and LinkedIn empty until the real values are ready. The portrait needs alternative text.

## Projects

**Projects** edits `content/projects/*.json`.

Create a project with a title, a lowercase hyphenated slug, and a summary. The filename must match the slug. The build fails when they differ. Add the description, images, technologies, role, year, and status from source material. Leave role or year empty when they are not known. Set **Featured** only for work that should lead the home page.

To hide a project, turn **Published** off or set **Visibility** to private, then publish the workflow.

## Certificates

**Certificates** edits `content/certificates/`. Use the date printed on the certificate. A year alone is acceptable when the document has no day. Credential ID and URL stay empty when the issuer did not provide them.

## Graphic design

**Graphic design** edits `content/design/`. A piece appears on the site only when it is published, public, and has an image. The Lodestar Studio and eco-friendly tableware entries are present as unpublished private drafts because no image was available. Add the image, alternative text, and publication flags when the work is ready to show.

## Skills

**Skills** edits `content/skills/`. Each skill is its own file. Do not add percentage scores. A description is optional and should stay factual.

## Experience and education

**Experience** and **Education** are separate collections. For dates, use the period that the source actually states. Leave start and end empty when only a label such as `2023 to 2026 (Expected)` or `3 Sep 2026` is known. Do not invent a completion date.

## Site settings

**Site settings → Site** edits navigation labels, footer text, SEO, the canonical URL, and `show_cv_download`. Leave the canonical URL empty until the real `https://` domain exists. The sitemap uses that URL when it is set.

## Images

Choose an image field and upload. Decap commits the file under the collection’s media folder, for example `public/uploads/projects/`. Use a descriptive filename. Add alternative text. Prefer images that are already a reasonable size. The build checks that the path exists and that the extension is png, jpg, jpeg, webp, gif, or, for certificate and CV files, pdf.

## CV

**Site settings → Resume** can replace the public CV file. Read this before uploading anything:

- This GitHub repository is public.
- Any file committed there can be downloaded from GitHub even if the website has no download link.
- Do not upload a private or confidential CV.
- Keep `public_release_approved` false and `show_cv_download` false until the actual document has been explicitly approved for public release.
- The build copies the CV into the website only when both flags are true and the file is inside `/uploads/resume/`.

## What the CMS does not do

It does not send the contact form. Contact messages go to Netlify Forms. It does not edit the visual design, the build scripts, or deployment settings.
