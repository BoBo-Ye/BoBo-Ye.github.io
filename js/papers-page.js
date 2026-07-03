import { fetchJson } from "./shared/data.js";
import { showElement } from "./shared/dom.js";
import {
  normalizePaper,
  readPaperItems
} from "./papers/model.js";
import { renderPapers } from "./papers/render.js";

const scriptConfig = document.querySelector("script[data-papers-page]")?.dataset || {};
const indexPath = scriptConfig.indexPath || "data/papers/index.json";
const itemKey = scriptConfig.itemsKey || "items";
const listSelector = scriptConfig.listSelector || "[data-papers-list]";
const errorSelector = scriptConfig.errorSelector || "[data-papers-error]";
const pageLabel = scriptConfig.pageLabel || "papers";
const showAuthors = scriptConfig.showAuthors !== "false";
const featuredAuthor = scriptConfig.featuredAuthor || "Hengwei Ye";

fetchJson(indexPath, `Unable to load ${pageLabel} data.`)
  .then((data) => {
    const items = readPaperItems(data, itemKey);
    if (!items.length) {
      throw new Error(`No ${pageLabel} found.`);
    }

    return items.map(normalizePaper);
  })
  .then((papers) => renderPapers(papers, {
    listSelector,
    showAuthors,
    featuredAuthor
  }))
  .catch((error) => {
    console.error(error);
    showElement(errorSelector);
  });
