import assert from "node:assert/strict";
import test from "node:test";
import { cvIsReleased, detachMissingMedia, isPublic, publicEntries, validateRecord } from "../scripts/lib/content.mjs";
import { escapeHtml, safeUrl } from "../scripts/lib/html.mjs";
import { renderMarkdown } from "../scripts/lib/markdown.mjs";

test("escapes HTML text", () => {
  assert.equal(escapeHtml(`<script>"&'</script>`), "&lt;script&gt;&quot;&amp;&#39;&lt;/script&gt;");
});

test("rejects unsafe URLs", () => {
  assert.equal(safeUrl("javascript:alert(1)"), "");
  assert.equal(safeUrl("//evil.example"), "");
  assert.equal(safeUrl("/uploads/profile/clyde-nefoti.png"), "/uploads/profile/clyde-nefoti.png");
  assert.equal(safeUrl("https://mbphatelehealth.com"), "https://mbphatelehealth.com");
});

test("markdown rendering drops scripts and unsafe links", () => {
  const html = renderMarkdown("Hello <script>alert(1)</script>\n\n[bad](javascript:alert(1))\n\n[ok](https://example.com)");
  assert.equal(html.includes("<script>"), false);
  assert.equal(html.includes("javascript:"), false);
  assert.equal(html.includes("https://example.com"), true);
  assert.equal(html.includes("Hello"), true);
});

test("public entries exclude drafts and private records", () => {
  const entries = publicEntries([
    { title: "Hidden", slug: "hidden", published: false, visibility: "public", display_order: 1 },
    { title: "Private", slug: "private", published: true, visibility: "private", display_order: 1 },
    { title: "Shown", slug: "shown", published: true, visibility: "public", display_order: 2, featured: false },
  ]);
  assert.deepEqual(entries.map((entry) => entry.slug), ["shown"]);
  assert.equal(isPublic(entries[0]), true);
});

test("duplicate and malformed project records are rejected", () => {
  const errors = validateRecord(
    { title: "A", slug: "Wrong", summary: "S", published: "yes", visibility: "secret", display_order: 1.5 },
    { file: "content/projects/telehealth.json", required: ["title", "slug", "summary", "published", "visibility", "display_order"], expectSlug: true },
  );
  assert.equal(errors.length >= 3, true);
});

test("a missing upload is removed from the entry instead of blocking publish", () => {
  const entry = {
    profile_image: "/uploads/profile/clyde-nefoti.png",
    main_image: "/uploads/projects/telehealth-consultation-homepage.png",
    gallery: [{ image: "/uploads/profile/clyde-nefoti.png", alt: "Portrait" }],
  };
  detachMissingMedia(entry, "/uploads/profile/clyde-nefoti.png");
  assert.equal(entry.profile_image, "");
  assert.equal(entry.main_image, "/uploads/projects/telehealth-consultation-homepage.png");
  assert.deepEqual(entry.gallery, []);
});

test("CV stays withheld unless both approvals are true", () => {
  const resume = { file: "/uploads/resume/cv.pdf", public_release_approved: false };
  assert.equal(cvIsReleased({ show_cv_download: true }, resume), false);
  assert.equal(cvIsReleased({ show_cv_download: false }, { ...resume, public_release_approved: true }), false);
  assert.equal(cvIsReleased({ show_cv_download: true }, { ...resume, public_release_approved: true }), true);
  assert.equal(cvIsReleased({ show_cv_download: true }, { file: "/uploads/projects/secret.pdf", public_release_approved: true }), false);
});
