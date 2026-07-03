export const escapeHtml = (value) => String(value)
  .replace(/&/g, "&amp;")
  .replace(/</g, "&lt;")
  .replace(/>/g, "&gt;")
  .replace(/"/g, "&quot;")
  .replace(/'/g, "&#39;");

export const escapeAttribute = (value) => escapeHtml(value).replace(/`/g, "&#96;");

export const normalizeWhitespace = (value) => String(value).replace(/\s+/g, " ").trim();

export const safeUrl = (url) => {
  const trimmed = String(url).trim();
  return /^\s*javascript:/i.test(trimmed) ? "#" : trimmed;
};

export const slugify = (value) => normalizeWhitespace(value)
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, "-")
  .replace(/^-+|-+$/g, "") || "post";

export const stripMarkdown = (value) => normalizeWhitespace(
  String(value)
    .replace(/`([^`]+)`/g, "$1")
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/[*_>#-]/g, "")
);
