import { normalizeWhitespace } from "../shared/text.js";
import { sortPapers } from "./model.js";

const DEFAULT_FEATURED_AUTHOR = "Hengwei Ye";

const createAuthorName = (name, featuredAuthor) => {
  const author = document.createElement("span");
  author.textContent = name;

  if (normalizeWhitespace(name) === featuredAuthor) {
    author.className = "paper-author-highlight";
  }

  return author;
};

const appendAuthors = (container, authors, featuredAuthor) => {
  const names = authors.filter(Boolean);

  names.forEach((name, index) => {
    container.appendChild(createAuthorName(name, featuredAuthor));

    if (names.length === 2 && index === 0) {
      container.append(" and ");
    } else if (names.length > 2 && index < names.length - 2) {
      container.append(", ");
    } else if (names.length > 2 && index === names.length - 2) {
      container.append(", and ");
    }
  });
};

const appendTitleText = (container, paper) => {
  if (paper.conference) {
    const tag = document.createElement("span");
    tag.className = "paper-title-tag";
    tag.textContent = `[${paper.conference}]`;
    container.appendChild(tag);
    container.append(" ");
  }

  container.append(paper.title);
};

const createTitle = (paper) => {
  const title = document.createElement("h2");
  title.className = "paper-title";

  if (paper.url) {
    const link = document.createElement("a");
    link.className = "paper-title-link";
    link.href = paper.url;
    appendTitleText(link, paper);
    if (paper.download) {
      link.setAttribute("download", paper.download);
    } else {
      link.target = "_blank";
      link.rel = "noreferrer";
    }
    title.appendChild(link);
    return title;
  }

  appendTitleText(title, paper);
  return title;
};

const createOverview = (paper) => {
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
    image.alt = `${paper.title} preview`;
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

const createPaper = (paper, options) => {
  const item = document.createElement("article");
  item.className = "paper-item";

  const badge = document.createElement("span");
  badge.className = "paper-badge";
  badge.textContent = paper.badge;

  const content = document.createElement("div");
  content.className = "paper-content";
  content.appendChild(createTitle(paper));

  if (options.showAuthors && paper.authors.length) {
    const authors = document.createElement("p");
    authors.className = "paper-authors";
    appendAuthors(authors, paper.authors, options.featuredAuthor);
    content.appendChild(authors);
  }

  const overview = createOverview(paper);
  if (overview) {
    content.appendChild(overview);
  }

  item.append(badge, content);
  return item;
};

export const renderPapers = (papers, options = {}) => {
  const list = document.querySelector(options.listSelector || "[data-papers-list]");
  if (!list || !Array.isArray(papers)) {
    return;
  }

  const renderOptions = {
    showAuthors: options.showAuthors !== false,
    featuredAuthor: options.featuredAuthor || DEFAULT_FEATURED_AUTHOR
  };

  const fragment = document.createDocumentFragment();
  sortPapers(papers)
    .filter((paper) => paper.title)
    .forEach((paper) => {
      fragment.appendChild(createPaper(paper, renderOptions));
    });

  list.replaceChildren(fragment);
};
