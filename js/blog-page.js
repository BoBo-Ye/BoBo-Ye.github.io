import {
  fetchJson,
  fetchText,
  normalizeDataPath
} from "./shared/data.js";
import {
  formatDate,
  parseDateValue
} from "./shared/dates.js";
import {
  escapeAttribute,
  escapeHtml,
  slugify
} from "./shared/text.js";
import {
  getFirstHeading,
  getFirstParagraph,
  markdownToHtml
} from "./blog/markdown.js";
import { showElement } from "./shared/dom.js";

const BLOG_INDEX_PATH = "data/blogs/index.json";
const BLOGS_BASE_PATH = "data/blogs/";
const BLOG_STATUSES = [
  { value: "completed", label: "Completed" },
  { value: "writing", label: "Writing" },
  { value: "todo", label: "TODO" }
];
const BLOG_STATUS_VALUES = BLOG_STATUSES.map((status) => status.value);

const readIndexPosts = (data) => {
  const posts = Array.isArray(data) ? data : data.posts;
  if (!Array.isArray(posts)) {
    return [];
  }

  return posts
    .map((post) => (typeof post === "string" ? { file: post } : post))
    .filter((post) => post && post.file)
    .map((post) => ({
      ...post,
      path: normalizeDataPath(post.file, BLOGS_BASE_PATH)
    }))
    .filter((post) => post.path);
};

const parseFrontMatterValue = (value) => {
  const trimmed = value.trim();

  if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
    return trimmed
      .slice(1, -1)
      .split(",")
      .map((item) => item.trim().replace(/^["']|["']$/g, ""))
      .filter(Boolean);
  }

  return trimmed.replace(/^["']|["']$/g, "");
};

const parseFrontMatter = (markdown) => {
  const normalized = markdown.replace(/\r\n?/g, "\n");
  const match = normalized.match(/^---\n([\s\S]*?)\n---\n?/);

  if (!match) {
    return {
      metadata: {},
      content: normalized
    };
  }

  const metadata = {};
  match[1].split("\n").forEach((line) => {
    const divider = line.indexOf(":");
    if (divider === -1) {
      return;
    }

    const key = line.slice(0, divider).trim();
    const value = line.slice(divider + 1).trim();
    if (key) {
      metadata[key] = parseFrontMatterValue(value);
    }
  });

  return {
    metadata,
    content: normalized.slice(match[0].length)
  };
};

const createPost = (config, markdown) => {
  const { metadata, content } = parseFrontMatter(markdown);
  const fileName = config.file.split(/[\\/]/).pop().replace(/\.[^.]+$/, "");
  const title = config.title || metadata.title || getFirstHeading(content) || fileName;
  const tags = normalizeStringList(config.tags || metadata.tags);
  const status = normalizeStatus(config.status || metadata.status);

  return {
    slug: config.slug || metadata.slug || slugify(title),
    title,
    date: config.date || metadata.date || "",
    summary: config.summary || metadata.summary || getFirstParagraph(content),
    tags,
    status,
    path: config.path,
    content
  };
};

const normalizeStringList = (value) => {
  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean);
  }

  if (!value) {
    return [];
  }

  return String(value)
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
};

const normalizeStatus = (value) => {
  const status = String(value || "completed").trim();
  const normalized = status.toLowerCase();
  const aliases = {
    complete: "completed",
    done: "completed",
    doing: "writing",
    draft: "writing",
    wip: "writing",
    "to-do": "todo"
  };

  return BLOG_STATUS_VALUES.includes(normalized)
    ? normalized
    : aliases[normalized] || "completed";
};

const getSelectedSlug = () => {
  const params = new URLSearchParams(window.location.search);
  return params.get("post") || window.location.hash.replace(/^#/, "");
};

const createTagMarkup = (tags) => {
  if (!Array.isArray(tags) || !tags.length) {
    return "";
  }

  return `<div class="blog-tags">${tags.map((tag) => (
    `<span class="blog-tag">${escapeHtml(tag)}</span>`
  )).join("")}</div>`;
};

const countBy = (items, getValues) => items.reduce((counts, item) => {
  const values = getValues(item);
  values.forEach((value) => {
    counts.set(value, (counts.get(value) || 0) + 1);
  });
  return counts;
}, new Map());

const sortFacetEntries = (entries) => entries.sort((first, second) => {
  if (second[1] !== first[1]) {
    return second[1] - first[1];
  }

  return first[0].localeCompare(second[0]);
});

const createFilterChipMarkup = (tag) => (
  `<button class="blog-filter-chip" type="button" data-blog-filter="tag" data-blog-filter-value="${escapeAttribute(tag)}" aria-pressed="false">${escapeHtml(tag)}</button>`
);

const getStatusLabel = (value) => (
  BLOG_STATUSES.find((status) => status.value === value)?.label || "Completed"
);

const createStatusFilterMarkup = ([status, count]) => `
  <button class="blog-status-button" type="button" data-blog-filter="status" data-blog-filter-value="${escapeAttribute(status)}" data-status="${escapeAttribute(status)}" aria-pressed="false">
    <span class="blog-status-dot" aria-hidden="true"></span>
    <span class="blog-status-label">${escapeHtml(getStatusLabel(status))}</span>
    <span class="blog-status-count">${count}</span>
  </button>
`;

const createCardTagsMarkup = (tags) => {
  if (!tags.length) {
    return "";
  }

  return `
    <span class="blog-card-tags" aria-label="Tags">
      ${tags.map((tag) => `<span class="blog-card-tag">${escapeHtml(tag)}</span>`).join("")}
    </span>
  `;
};

const createPostCardMarkup = (post) => {
  const date = formatDate(post.date);

  return `
    <a class="blog-card" href="html/blog.html?post=${encodeURIComponent(post.slug)}">
      <span class="blog-card-heading">
        ${date ? `<span class="blog-card-meta">${escapeHtml(date)}</span>` : "<span></span>"}
        <span class="blog-card-status" data-status="${escapeAttribute(post.status)}">${escapeHtml(getStatusLabel(post.status))}</span>
      </span>
      <span class="blog-card-title">${escapeHtml(post.title)}</span>
      ${post.summary ? `<span class="blog-card-summary">${escapeHtml(post.summary)}</span>` : ""}
      ${createCardTagsMarkup(post.tags)}
    </a>
  `;
};

const getFilteredPosts = (posts, state) => posts.filter((post) => {
  const matchesTag = state.tag === "all" || post.tags.includes(state.tag);
  const matchesStatus = state.status === "all" || post.status === state.status;
  return matchesTag && matchesStatus;
});

const createResultsSummary = (visibleCount, totalCount) => {
  const label = totalCount === 1 ? "post" : "posts";
  return `Showing ${visibleCount} of ${totalCount} ${label}`;
};

const ensureUniqueHeadingId = (heading, usedIds) => {
  const baseId = heading.id || slugify(heading.textContent || "section");
  let id = baseId;
  let index = 2;

  while (usedIds.has(id)) {
    id = `${baseId}-${index}`;
    index += 1;
  }

  usedIds.add(id);
  heading.id = id;
  return id;
};

const renderArticleToc = (article) => {
  const toc = article.querySelector("[data-blog-toc]");
  const content = article.querySelector(".markdown-content");
  if (!toc || !content) {
    return;
  }

  const headings = Array.from(content.querySelectorAll("h1, h2, h3, h4"))
    .filter((heading) => heading.textContent.trim());

  if (!headings.length) {
    article.querySelector(".blog-article-shell")?.classList.add("blog-article-shell-no-toc");
    toc.remove();
    return;
  }

  const usedIds = new Set();
  const currentArticlePath = `${window.location.pathname}${window.location.search}`;
  const links = headings.map((heading) => {
    const id = ensureUniqueHeadingId(heading, usedIds);
    const level = Number(heading.tagName.slice(1));
    return `
      <a class="blog-toc-link blog-toc-link-level-${level}" href="${escapeAttribute(`${currentArticlePath}#${id}`)}">
        ${escapeHtml(heading.textContent.trim())}
      </a>
    `;
  }).join("");

  toc.innerHTML = `
    <p class="blog-toc-title">Contents</p>
    <nav class="blog-toc-nav" aria-label="Article sections">
      ${links}
    </nav>
  `;
  toc.hidden = false;
};

const renderCatalog = (posts) => {
  const catalog = document.querySelector("[data-blog-catalog]");
  if (!catalog) {
    return;
  }

  const state = {
    tag: "all",
    status: "all"
  };
  const tagEntries = sortFacetEntries(Array.from(countBy(posts, (post) => post.tags)));
  const statusCounts = countBy(posts, (post) => [post.status]);
  const statusEntries = BLOG_STATUSES.map((status) => [
    status.value,
    statusCounts.get(status.value) || 0
  ]);

  catalog.innerHTML = `
    <div class="blog-collection">
      <section class="blog-main" aria-label="Blog posts">
        <p class="blog-results-summary" data-blog-results-summary></p>
        <div class="blog-list" data-blog-list></div>
      </section>

      <aside class="blog-sidebar" aria-label="Blog index">
        <section class="blog-filter-group" aria-labelledby="blog-tags-heading">
          <div class="blog-filter-heading">
            <h2 id="blog-tags-heading">Tags</h2>
            <button class="blog-filter-reset" type="button" data-blog-filter="all">View all</button>
          </div>
          <div class="blog-filter-cloud">
            ${tagEntries.map(([tag]) => createFilterChipMarkup(tag)).join("")}
          </div>
        </section>

        <section class="blog-filter-group" aria-labelledby="blog-status-heading">
          <div class="blog-filter-heading">
            <h2 id="blog-status-heading">Status</h2>
          </div>
          <div class="blog-status-list">
            ${statusEntries.map(createStatusFilterMarkup).join("")}
          </div>
        </section>
      </aside>
    </div>
  `;

  const list = catalog.querySelector("[data-blog-list]");
  const summary = catalog.querySelector("[data-blog-results-summary]");

  const updateFilters = () => {
    catalog.querySelectorAll("[data-blog-filter]").forEach((control) => {
      const filterType = control.dataset.blogFilter;
      const filterValue = control.dataset.blogFilterValue || "all";
      const isPressed = (
        filterType === "tag" && filterValue === state.tag
      ) || (
        filterType === "status" && filterValue === state.status
      ) || (
        filterType === "all" && state.tag === "all" && state.status === "all"
      );

      control.setAttribute("aria-pressed", String(isPressed));
    });
  };

  const updateList = () => {
    const visiblePosts = getFilteredPosts(posts, state);
    if (summary) {
      summary.textContent = createResultsSummary(visiblePosts.length, posts.length);
    }

    if (list) {
      list.innerHTML = visiblePosts.length
        ? visiblePosts.map(createPostCardMarkup).join("")
        : `<p class="blog-empty-state">No posts match the selected filters.</p>`;
    }

    updateFilters();
  };

  catalog.addEventListener("click", (event) => {
    const control = event.target.closest("[data-blog-filter]");
    if (!control || !catalog.contains(control)) {
      return;
    }

    const value = control.dataset.blogFilterValue || "all";
    if (control.dataset.blogFilter === "tag") {
      state.tag = state.tag === value ? "all" : value;
    } else if (control.dataset.blogFilter === "status") {
      state.status = state.status === value ? "all" : value;
    } else {
      state.tag = "all";
      state.status = "all";
    }

    updateList();
  });

  updateList();
  catalog.hidden = false;
};

const renderSelectedPost = (post) => {
  const article = document.querySelector("[data-blog-article]");
  if (!article) {
    return;
  }

  const pageHeader = document.querySelector(".page-header");
  if (pageHeader) {
    pageHeader.hidden = true;
  }

  const meta = formatDate(post.date);

  article.innerHTML = `
    <div class="blog-article-shell">
      <aside class="blog-toc" data-blog-toc hidden aria-label="Article contents"></aside>
      <div class="blog-reading">
        <header class="blog-article-header">
          ${meta ? `<p class="blog-meta">${escapeHtml(meta)}</p>` : ""}
          <h2 class="blog-article-title">${escapeHtml(post.title)}</h2>
          ${post.summary ? `<p class="blog-summary">${escapeHtml(post.summary)}</p>` : ""}
          ${createTagMarkup(post.tags)}
        </header>
        <div class="markdown-content">
          ${markdownToHtml(post.content)}
        </div>
      </div>
    </div>
  `;
  renderArticleToc(article);
  article.hidden = false;
};

const loadPosts = (configs) => Promise.all(
  configs.map((config) => (
    fetchText(config.path).then((markdown) => createPost(config, markdown))
  ))
);

fetchJson(BLOG_INDEX_PATH, "Unable to load blog index.")
  .then(readIndexPosts)
  .then(loadPosts)
  .then((posts) => posts.sort((firstPost, secondPost) => (
    parseDateValue(secondPost.date) - parseDateValue(firstPost.date)
  )))
  .then((posts) => {
    if (!posts.length) {
      throw new Error("No blog posts found.");
    }

    const selectedSlug = getSelectedSlug();
    const selectedPost = posts.find((post) => post.slug === selectedSlug);

    if (selectedPost) {
      renderSelectedPost(selectedPost);
    } else {
      renderCatalog(posts);
    }
  })
  .catch((error) => {
    console.error(error);
    showElement("[data-blog-error]");
  });
