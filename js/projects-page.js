import { fetchJson } from "./shared/data.js";
import { showElement } from "./shared/dom.js";
import {
  normalizeProject,
  readProjectItems
} from "./projects/model.js";
import { renderProjects } from "./projects/render.js";

const scriptConfig = document.querySelector("script[data-projects-page]")?.dataset || {};
const indexPath = scriptConfig.indexPath || "data/projects/index.json";
const itemKey = scriptConfig.itemsKey || "items";
const listSelector = scriptConfig.listSelector || "[data-projects-list]";
const errorSelector = scriptConfig.errorSelector || "[data-projects-error]";
const pageLabel = scriptConfig.pageLabel || "projects";
const showAuthors = scriptConfig.showAuthors !== "false";
const featuredAuthor = scriptConfig.featuredAuthor || "Hengwei Ye";

fetchJson(indexPath, `Unable to load ${pageLabel} data.`)
  .then((data) => {
    const items = readProjectItems(data, itemKey);
    if (!items.length) {
      throw new Error(`No ${pageLabel} found.`);
    }

    return items.map(normalizeProject);
  })
  .then((projects) => renderProjects(projects, {
    listSelector,
    showAuthors,
    featuredAuthor
  }))
  .catch((error) => {
    console.error(error);
    showElement(errorSelector);
  });
