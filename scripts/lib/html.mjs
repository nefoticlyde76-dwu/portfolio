const REPLACEMENTS = [
  ["&", "&amp;"],
  ["<", "&lt;"],
  [">", "&gt;"],
  ['"', "&quot;"],
  ["'", "&#39;"],
];

export function escapeHtml(value) {
  return REPLACEMENTS.reduce(
    (text, [from, to]) => text.replaceAll(from, to),
    String(value ?? ""),
  );
}

export function safeUrl(value) {
  const url = String(value ?? "").trim();
  if (!url) return "";
  if (url.startsWith("/") && !url.startsWith("//") && !url.includes("\\") && !url.includes("..")) {
    return url;
  }
  try {
    const parsed = new URL(url);
    if (parsed.protocol === "http:" || parsed.protocol === "https:" || parsed.protocol === "mailto:") {
      return url;
    }
  } catch {
    return "";
  }
  return "";
}

export function isSafeInternalPath(value) {
  const url = safeUrl(value);
  return url.startsWith("/") && !url.startsWith("//");
}
