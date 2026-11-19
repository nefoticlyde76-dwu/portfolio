import { marked } from "marked";
import sanitizeHtml from "sanitize-html";

const SANITIZE_OPTIONS = {
  allowedTags: ["p", "br", "strong", "em", "ul", "ol", "li", "a", "blockquote", "code", "h2", "h3"],
  allowedAttributes: {
    a: ["href", "rel"],
  },
  allowedSchemes: ["http", "https", "mailto"],
  allowProtocolRelative: false,
  disallowedTagsMode: "discard",
  transformTags: {
    a: (tagName, attribs) => ({
      tagName: "a",
      attribs: {
        href: attribs.href || "",
        rel: "noopener noreferrer",
      },
    }),
  },
};

marked.setOptions({
  gfm: true,
  breaks: false,
});

export function renderMarkdown(source) {
  const text = String(source ?? "").trim();
  if (!text) return "";
  return sanitizeHtml(marked.parse(text), SANITIZE_OPTIONS);
}
