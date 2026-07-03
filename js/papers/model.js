import { parseLooseDate } from "../shared/dates.js";
import { normalizeWhitespace } from "../shared/text.js";

const DEFAULT_ITEM_KEYS = [
  "items",
  "papers",
  "projects"
];

const normalizeField = (value) => (value ? String(value).trim() : "");

const normalizeAuthorName = (name) => {
  const normalized = normalizeWhitespace(name);
  if (!normalized.includes(",")) {
    return normalized;
  }

  const [lastName, ...givenNames] = normalized
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
  return givenNames.length ? `${givenNames.join(" ")} ${lastName}` : lastName;
};

const normalizeAuthors = (authors) => {
  if (Array.isArray(authors)) {
    return authors.map(normalizeAuthorName).filter(Boolean);
  }

  if (typeof authors === "string") {
    return authors
      .split(/\s+and\s+/i)
      .map(normalizeAuthorName)
      .filter(Boolean);
  }

  return [];
};

const normalizeConference = (conference) => normalizeField(conference)
  .replace(/^\[+/, "")
  .replace(/\]+$/, "");

export const readPaperItems = (data, preferredKey = "") => {
  if (Array.isArray(data)) {
    return data;
  }

  if (!data || typeof data !== "object") {
    return [];
  }

  const keys = [
    preferredKey,
    ...DEFAULT_ITEM_KEYS
  ].filter(Boolean);

  for (const key of keys) {
    if (Array.isArray(data[key])) {
      return data[key];
    }
  }

  return [];
};

export const normalizePaper = (entry) => {
  const source = entry && typeof entry === "object" ? entry : {};

  return {
    title: normalizeField(source.title),
    conference: normalizeConference(source.conference),
    authors: normalizeAuthors(source.authors),
    badge: normalizeField(source.badge),
    image: normalizeField(source.image),
    description: normalizeField(source.description),
    download: normalizeField(source.download),
    url: normalizeField(source.url)
  };
};

export const getPaperSortDate = (paper) => parseLooseDate(paper.badge);

export const sortPapers = (papers) => (
  [...papers].sort((firstPaper, secondPaper) => (
    getPaperSortDate(secondPaper) - getPaperSortDate(firstPaper)
  ))
);
