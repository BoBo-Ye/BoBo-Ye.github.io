import { normalizeWhitespace } from "../shared/text.js";
import { sortProjects } from "./model.js";

const DEFAULT_FEATURED_AUTHOR = "Hengwei Ye";

const createAuthorName = (name, featuredAuthor) => {
  const author = document.createElement("span");
  author.textContent = name;

  if (normalizeWhitespace(name) === featuredAuthor) {
    author.className = "project-author-highlight";
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

const appendTitleText = (container, project) => {
  if (project.conference) {
    const tag = document.createElement("span");
    tag.className = "project-title-tag";
    tag.textContent = `[${project.conference}]`;
    container.appendChild(tag);
    container.append(" ");
  }

  container.append(project.title);
};

const createTitle = (project) => {
  const title = document.createElement("h2");
  title.className = "project-title";

  if (project.url) {
    const link = document.createElement("a");
    link.className = "project-title-link";
    link.href = project.url;
    appendTitleText(link, project);
    if (project.download) {
      link.setAttribute("download", project.download);
    } else {
      link.target = "_blank";
      link.rel = "noreferrer";
    }
    title.appendChild(link);
    return title;
  }

  appendTitleText(title, project);
  return title;
};

const createOverview = (project) => {
  if (!project.image && !project.description) {
    return null;
  }

  const overview = document.createElement("div");
  overview.className = "project-overview";

  if (project.image) {
    const figure = document.createElement("figure");
    figure.className = "project-figure";

    const image = document.createElement("img");
    image.className = "project-image";
    image.src = project.image;
    image.alt = `${project.title} preview`;
    image.loading = "lazy";
    image.decoding = "async";

    figure.appendChild(image);
    overview.appendChild(figure);
  }

  if (project.description) {
    const description = document.createElement("p");
    description.className = "project-description";
    description.textContent = project.description;
    overview.appendChild(description);
  }

  return overview;
};

const createProject = (project, options) => {
  const item = document.createElement("article");
  item.className = "project-item";

  const time = document.createElement("span");
  time.className = "project-time";
  time.textContent = project.time;

  const content = document.createElement("div");
  content.className = "project-content";
  content.appendChild(createTitle(project));

  if (options.showAuthors && project.authors.length) {
    const authors = document.createElement("p");
    authors.className = "project-authors";
    appendAuthors(authors, project.authors, options.featuredAuthor);
    content.appendChild(authors);
  }

  const overview = createOverview(project);
  if (overview) {
    content.appendChild(overview);
  }

  item.append(time, content);
  return item;
};

export const renderProjects = (projects, options = {}) => {
  const list = document.querySelector(options.listSelector || "[data-projects-list]");
  if (!list || !Array.isArray(projects)) {
    return;
  }

  const renderOptions = {
    showAuthors: options.showAuthors !== false,
    featuredAuthor: options.featuredAuthor || DEFAULT_FEATURED_AUTHOR
  };

  const fragment = document.createDocumentFragment();
  sortProjects(projects)
    .filter((project) => project.title)
    .forEach((project) => {
      fragment.appendChild(createProject(project, renderOptions));
    });

  list.replaceChildren(fragment);
};
