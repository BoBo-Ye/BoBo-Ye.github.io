const scriptConfig = document.currentScript?.dataset || {};
const BIB_INDEX_PATH = scriptConfig.indexPath || "data/bibs/index.json";
const BIBS_BASE_PATH = scriptConfig.bibsBasePath || "data/bibs/";
const LIST_SELECTOR = scriptConfig.listSelector || "[data-papers-list]";
const ERROR_SELECTOR = scriptConfig.errorSelector || "[data-papers-error]";
const PAGE_LABEL = scriptConfig.pageLabel || "papers";
const SHOW_AUTHORS = scriptConfig.showAuthors !== "false";
const IGNORED_BIB_FIELDS = new Set([
  "eprint",
  "archiveprefix",
  "primaryclass"
]);
const IGNORED_ENTRY_TYPES = new Set([
  "comment",
  "preamble",
  "string"
]);
const FEATURED_AUTHOR = "Hengwei Ye";

const formatAuthors = (authors) => {
  if (!Array.isArray(authors)) {
    return "";
  }

  const names = authors.filter(Boolean);
  if (names.length <= 1) {
    return names.join("");
  }
  if (names.length === 2) {
    return names.join(" and ");
  }

  return `${names.slice(0, -1).join(", ")}, and ${names[names.length - 1]}`;
};

const createAuthorName = (name) => {
  const author = document.createElement("span");
  author.textContent = name;

  if (normalizeWhitespace(name) === FEATURED_AUTHOR) {
    author.className = "paper-author-highlight";
  }

  return author;
};

const appendAuthors = (container, authors) => {
  const names = authors.filter(Boolean);

  names.forEach((name, index) => {
    container.appendChild(createAuthorName(name));

    if (names.length === 2 && index === 0) {
      container.append(" and ");
    } else if (names.length > 2 && index < names.length - 2) {
      container.append(", ");
    } else if (names.length > 2 && index === names.length - 2) {
      container.append(", and ");
    }
  });
};

const appendTitleText = (container, titleText) => {
  const match = titleText.match(/^\s*(\[[^\]]+\])\s*(.*)$/);

  if (!match) {
    container.textContent = titleText;
    return;
  }

  const tag = document.createElement("span");
  tag.className = "paper-title-tag";
  tag.textContent = match[1];
  container.appendChild(tag);

  if (match[2]) {
    container.append(` ${match[2]}`);
  }
};

const parsePaperDate = (value) => {
  if (!value) {
    return 0;
  }

  const match = String(value).match(/(\d{4})(?:[-/](\d{1,2}))?(?:[-/](\d{1,2}))?/);
  if (!match) {
    return 0;
  }

  const year = Number(match[1]);
  const month = Math.min(Math.max(Number(match[2] || 1), 1), 12);
  const day = Math.min(Math.max(Number(match[3] || 1), 1), 31);
  return Date.UTC(year, month - 1, day);
};

const getPaperSortDate = (paper) => Math.max(
  parsePaperDate(paper.date),
  parsePaperDate(paper.badge),
  parsePaperDate(paper.venueYear),
  parsePaperDate(paper.year)
);

const formatVenue = (paper) => {
  const venueParts = [
    paper.venue,
    paper.venueShort
  ].filter(Boolean);

  if (!venueParts.length) {
    return "";
  }

  const venueYear = paper.venueYear || paper.year;
  if (venueYear) {
    venueParts.push(venueYear);
  }

  return `In ${venueParts.join(", ")}`;
};

const normalizeWhitespace = (value) => value.replace(/\s+/g, " ").trim();

const hasWrappingBraces = (value) => {
  if (!value.startsWith("{") || !value.endsWith("}")) {
    return false;
  }

  let depth = 0;
  let inQuote = false;
  let escaped = false;

  for (let index = 0; index < value.length; index += 1) {
    const char = value[index];

    if (inQuote) {
      if (escaped) {
        escaped = false;
      } else if (char === "\\") {
        escaped = true;
      } else if (char === "\"") {
        inQuote = false;
      }
      continue;
    }

    if (char === "\"") {
      inQuote = true;
    } else if (char === "{") {
      depth += 1;
    } else if (char === "}") {
      depth -= 1;
      if (depth === 0 && index < value.length - 1) {
        return false;
      }
    }
  }

  return depth === 0;
};

const hasWrappingQuotes = (value) => {
  if (!value.startsWith("\"") || !value.endsWith("\"")) {
    return false;
  }

  let escaped = false;
  for (let index = 1; index < value.length - 1; index += 1) {
    const char = value[index];
    if (escaped) {
      escaped = false;
    } else if (char === "\\") {
      escaped = true;
    } else if (char === "\"") {
      return false;
    }
  }

  return true;
};

const unwrapBibValue = (value) => {
  let unwrapped = value.trim();
  let changed = true;

  while (changed && unwrapped.length >= 2) {
    changed = false;
    if (hasWrappingBraces(unwrapped)) {
      unwrapped = unwrapped.slice(1, -1).trim();
      changed = true;
    } else if (hasWrappingQuotes(unwrapped)) {
      unwrapped = unwrapped.slice(1, -1).trim();
      changed = true;
    }
  }

  return unwrapped;
};

const cleanBibValue = (value) => normalizeWhitespace(
  unwrapBibValue(value)
    .replace(/\\([{}&%_$#])/g, "$1")
    .replace(/[{}]/g, "")
);

const findEntryEnd = (text, start, opener, closer) => {
  let depth = 1;
  let inQuote = false;
  let escaped = false;

  for (let index = start; index < text.length; index += 1) {
    const char = text[index];

    if (inQuote) {
      if (escaped) {
        escaped = false;
      } else if (char === "\\") {
        escaped = true;
      } else if (char === "\"") {
        inQuote = false;
      }
      continue;
    }

    if (char === "\"") {
      inQuote = true;
    } else if (char === opener) {
      depth += 1;
    } else if (char === closer) {
      depth -= 1;
      if (depth === 0) {
        return index;
      }
    }
  }

  return -1;
};

const findTopLevelComma = (text) => {
  let depth = 0;
  let inQuote = false;
  let escaped = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];

    if (inQuote) {
      if (escaped) {
        escaped = false;
      } else if (char === "\\") {
        escaped = true;
      } else if (char === "\"") {
        inQuote = false;
      }
      continue;
    }

    if (char === "\"") {
      inQuote = true;
    } else if (char === "{" || char === "(") {
      depth += 1;
    } else if (char === "}" || char === ")") {
      depth = Math.max(0, depth - 1);
    } else if (char === "," && depth === 0) {
      return index;
    }
  }

  return -1;
};

const readBibFieldValue = (text, start) => {
  let depth = 0;
  let inQuote = false;
  let escaped = false;

  for (let index = start; index < text.length; index += 1) {
    const char = text[index];

    if (inQuote) {
      if (escaped) {
        escaped = false;
      } else if (char === "\\") {
        escaped = true;
      } else if (char === "\"") {
        inQuote = false;
      }
      continue;
    }

    if (char === "\"") {
      inQuote = true;
    } else if (char === "{" || char === "(") {
      depth += 1;
    } else if (char === "}" || char === ")") {
      depth = Math.max(0, depth - 1);
    } else if (char === "," && depth === 0) {
      return {
        value: text.slice(start, index),
        nextIndex: index + 1
      };
    }
  }

  return {
    value: text.slice(start),
    nextIndex: text.length
  };
};

const parseBibFields = (fieldsText) => {
  const fields = {};
  let index = 0;

  while (index < fieldsText.length) {
    while (index < fieldsText.length && /[\s,]/.test(fieldsText[index])) {
      index += 1;
    }

    const keyStart = index;
    while (index < fieldsText.length && /[^\s=,]/.test(fieldsText[index])) {
      index += 1;
    }

    const rawKey = fieldsText.slice(keyStart, index).trim();
    while (index < fieldsText.length && /\s/.test(fieldsText[index])) {
      index += 1;
    }

    if (!rawKey || fieldsText[index] !== "=") {
      break;
    }

    index += 1;
    while (index < fieldsText.length && /\s/.test(fieldsText[index])) {
      index += 1;
    }

    const { value, nextIndex } = readBibFieldValue(fieldsText, index);
    const key = rawKey.toLowerCase();
    if (!IGNORED_BIB_FIELDS.has(key)) {
      fields[key] = cleanBibValue(value);
    }
    index = nextIndex;
  }

  return fields;
};

const parseBibEntries = (bibText) => {
  const entries = [];
  let index = 0;

  while (index < bibText.length) {
    const entryStart = bibText.indexOf("@", index);
    if (entryStart === -1) {
      break;
    }

    let typeStart = entryStart + 1;
    while (typeStart < bibText.length && /\s/.test(bibText[typeStart])) {
      typeStart += 1;
    }

    let typeEnd = typeStart;
    while (typeEnd < bibText.length && /[A-Za-z]/.test(bibText[typeEnd])) {
      typeEnd += 1;
    }

    const entryType = bibText.slice(typeStart, typeEnd).toLowerCase();
    const openerIndex = bibText.slice(typeEnd).search(/[({]/);
    if (!entryType || openerIndex === -1) {
      index = typeEnd;
      continue;
    }

    const bodyStart = typeEnd + openerIndex + 1;
    const opener = bibText[bodyStart - 1];
    const closer = opener === "{" ? "}" : ")";
    const bodyEnd = findEntryEnd(bibText, bodyStart, opener, closer);
    if (bodyEnd === -1) {
      break;
    }

    const body = bibText.slice(bodyStart, bodyEnd);
    const keyEnd = findTopLevelComma(body);
    if (keyEnd !== -1 && !IGNORED_ENTRY_TYPES.has(entryType)) {
      entries.push({
        type: entryType,
        key: body.slice(0, keyEnd).trim(),
        fields: parseBibFields(body.slice(keyEnd + 1))
      });
    }

    index = bodyEnd + 1;
  }

  return entries;
};

const getFirstField = (fields, names) => {
  for (const name of names) {
    if (fields[name]) {
      return fields[name];
    }
  }

  return "";
};

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

const parseAuthors = (authorField) => {
  if (!authorField) {
    return [];
  }

  return authorField
    .split(/\s+and\s+/i)
    .map(normalizeAuthorName)
    .filter(Boolean);
};

const createPaperFromBibEntry = ({ key, fields }) => ({
  id: key || "",
  title: fields.title || "",
  authors: parseAuthors(fields.author),
  year: fields.year || "",
  date: getFirstField(fields, [
    "date",
    "publicationdate",
    "releasedate"
  ]),
  badge: getFirstField(fields, [
    "status",
    "publicationstatus",
    "badge",
    "venueshort",
    "shortvenue",
    "abbr"
  ]),
  venue: getFirstField(fields, [
    "journal",
    "booktitle",
    "conference",
    "organization",
    "school",
    "institution",
    "publisher",
    "howpublished",
    "note"
  ]),
  venueShort: getFirstField(fields, [
    "venueshort",
    "shortvenue",
    "abbr"
  ]),
  venueYear: fields.venueyear || fields.year || "",
  image: getFirstField(fields, [
    "image",
    "thumbnail",
    "preview",
    "teaser"
  ]),
  imageAlt: getFirstField(fields, [
    "imagealt",
    "alt"
  ]),
  description: getFirstField(fields, [
    "description",
    "abstract",
    "summary"
  ]),
  download: getFirstField(fields, [
    "download",
    "downloadfile",
    "filename"
  ]),
  url: fields.url || (fields.doi ? `https://doi.org/${fields.doi}` : "")
});

const normalizeBibPath = (bibPath) => {
  if (typeof bibPath !== "string") {
    return "";
  }

  const normalized = bibPath.replace(/\\/g, "/");
  return normalized.includes("/") ? normalized : `${BIBS_BASE_PATH}${normalized}`;
};

const getBibPaths = (data) => {
  const bibs = Array.isArray(data) ? data : data.bibs;
  if (!Array.isArray(bibs)) {
    return [];
  }

  return bibs
    .map((item) => normalizeBibPath(typeof item === "string" ? item : item.path))
    .filter(Boolean);
};

const createTitle = (paper) => {
  const title = document.createElement("h2");
  title.className = "paper-title";

  if (paper.url) {
    const link = document.createElement("a");
    link.className = "paper-title-link";
    link.href = paper.url;
    appendTitleText(link, paper.title);
    if (paper.download) {
      link.setAttribute("download", paper.download);
    } else {
      link.target = "_blank";
      link.rel = "noreferrer";
    }
    title.appendChild(link);
    return title;
  }

  appendTitleText(title, paper.title);
  return title;
};

const createPaperOverview = (paper) => {
  if (!paper.image && !paper.description) {
    return null;
  }

  const overview = document.createElement("div");
  overview.className = "paper-overview";

  if (paper.image) {
    const figure = document.createElement("figure");
    figure.className = "paper-figure";

    const image = document.createElement("img");
    image.className = "paper-image";
    image.src = paper.image;
    image.alt = paper.imageAlt || `${paper.title} preview`;
    image.loading = "lazy";
    image.decoding = "async";

    figure.appendChild(image);
    overview.appendChild(figure);
  }

  if (paper.description) {
    const description = document.createElement("p");
    description.className = "paper-description";
    description.textContent = paper.description;
    overview.appendChild(description);
  }

  return overview;
};

const createPaper = (paper) => {
  const item = document.createElement("article");
  item.className = "paper-item";
  if (paper.id) {
    item.id = paper.id;
  }

  const badge = document.createElement("span");
  badge.className = "paper-badge";
  badge.textContent = paper.badge || paper.venueShort || paper.year || "";

  const content = document.createElement("div");
  content.className = "paper-content";
  content.appendChild(createTitle(paper));

  const authorsText = SHOW_AUTHORS ? formatAuthors(paper.authors) : "";
  if (authorsText) {
    const authors = document.createElement("p");
    authors.className = "paper-authors";
    appendAuthors(authors, paper.authors);
    content.appendChild(authors);
  }

  const venueText = formatVenue(paper);
  if (venueText) {
    const venue = document.createElement("p");
    venue.className = "paper-venue";
    venue.textContent = venueText;
    content.appendChild(venue);
  }

  const overview = createPaperOverview(paper);
  if (overview) {
    content.appendChild(overview);
  }

  item.append(badge, content);
  return item;
};

const renderPapers = (papers) => {
  const list = document.querySelector(LIST_SELECTOR);
  if (!list || !Array.isArray(papers)) {
    return;
  }

  const fragment = document.createDocumentFragment();
  papers
    .filter((paper) => paper.title)
    .sort((firstPaper, secondPaper) => (
      getPaperSortDate(secondPaper) - getPaperSortDate(firstPaper)
    ))
    .forEach((paper) => {
      fragment.appendChild(createPaper(paper));
    });

  list.innerHTML = "";
  list.appendChild(fragment);
};

const showPapersError = () => {
  const error = document.querySelector(ERROR_SELECTOR);
  if (error) {
    error.hidden = false;
  }
};

const fetchOptions = { cache: "no-cache" };

const fetchText = (path) => fetch(path, fetchOptions).then((response) => {
  if (!response.ok) {
    throw new Error(`Unable to load ${path}.`);
  }
  return response.text();
});

fetch(BIB_INDEX_PATH, fetchOptions)
  .then((response) => {
    if (!response.ok) {
      throw new Error(`Unable to load ${PAGE_LABEL} bib index.`);
    }
    return response.json();
  })
  .then(getBibPaths)
  .then((bibPaths) => Promise.all(bibPaths.map(fetchText)))
  .then((bibTexts) => (
    bibTexts
      .flatMap(parseBibEntries)
      .map(createPaperFromBibEntry)
  ))
  .then(renderPapers)
  .catch(showPapersError);
