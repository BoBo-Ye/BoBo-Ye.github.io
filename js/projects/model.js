import { parseLooseDate } from "../shared/dates.js";
import { normalizeWhitespace } from "../shared/text.js";

const DEFAULT_ITEM_KEYS = [
  "items",
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

const normalizeTag = (tag) => normalizeField(tag)
  .replace(/^\[+/, "")
  .replace(/\]+$/, "");

export const readProjectItems = (data, preferredKey = "") => {
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

export const normalizeProject = (entry) => {
  const source = entry && typeof entry === "object" ? entry : {};

  return {
    title: normalizeField(source.title),
    conference: normalizeTag(source.conference || source.tag),
    authors: normalizeAuthors(source.authors),
    time: normalizeField(source.time),
    image: normalizeField(source.image),
    description: normalizeField(source.description),
    download: normalizeField(source.download),
    url: normalizeField(source.url)
  };
};

export const getProjectSortDate = (project) => parseLooseDate(project.time);

export const sortProjects = (projects) => (
  [...projects].sort((firstProject, secondProject) => (
    getProjectSortDate(secondProject) - getProjectSortDate(firstProject)
  ))
);
