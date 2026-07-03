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

  return {
    slug: config.slug || metadata.slug || slugify(title),
    title,
    date: config.date || metadata.date || "",
    summary: config.summary || metadata.summary || getFirstParagraph(content),
    tags: config.tags || metadata.tags || [],
    path: config.path,
    content
  };
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

const renderCatalog = (posts) => {
  const catalog = document.querySelector("[data-blog-catalog]");
  if (!catalog) {
    return;
  }

  catalog.replaceChildren();
  const fragment = document.createDocumentFragment();

  posts.forEach((post) => {
    const link = document.createElement("a");
    link.className = "blog-card";
    link.href = `html/blog.html?post=${encodeURIComponent(post.slug)}`;

    const meta = document.createElement("span");
    meta.className = "blog-card-meta";
    meta.textContent = formatDate(post.date);
    link.appendChild(meta);

    const title = document.createElement("span");
    title.className = "blog-card-title";
    title.textContent = post.title;
    link.appendChild(title);

    if (post.summary) {
      const summary = document.createElement("span");
      summary.className = "blog-card-summary";
      summary.textContent = post.summary;
      link.appendChild(summary);
    }

    if (Array.isArray(post.tags) && post.tags.length) {
      const tags = document.createElement("span");
      tags.className = "blog-card-tags";
      tags.textContent = post.tags.join(" / ");
      link.appendChild(tags);
    }

    fragment.appendChild(link);
  });

  catalog.appendChild(fragment);
  catalog.hidden = false;
};

const renderSelectedPost = (post) => {
  const article = document.querySelector("[data-blog-article]");
  if (!article) {
    return;
  }

  const meta = [
    formatDate(post.date),
    Array.isArray(post.tags) ? post.tags.join(" / ") : ""
  ].filter(Boolean).join(" - ");

  article.innerHTML = `
    <header class="blog-article-header">
      <a class="blog-detail-back" href="html/blog.html">Blogs</a>
      ${meta ? `<p class="blog-meta">${escapeHtml(meta)}</p>` : ""}
      <h2 class="blog-article-title">${escapeHtml(post.title)}</h2>
      ${post.summary ? `<p class="blog-summary">${escapeHtml(post.summary)}</p>` : ""}
      ${createTagMarkup(post.tags)}
    </header>
    <div class="markdown-content">
      ${markdownToHtml(post.content)}
    </div>
  `;
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
