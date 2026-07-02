const BLOG_INDEX_PATH = "data/blogs/index.json";
const BLOGS_BASE_PATH = "data/blogs/";

const escapeHtml = (value) => String(value)
  .replace(/&/g, "&amp;")
  .replace(/</g, "&lt;")
  .replace(/>/g, "&gt;")
  .replace(/"/g, "&quot;")
  .replace(/'/g, "&#39;");

const escapeAttribute = (value) => escapeHtml(value).replace(/`/g, "&#96;");

const normalizeWhitespace = (value) => String(value).replace(/\s+/g, " ").trim();

const slugify = (value) => normalizeWhitespace(value)
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, "-")
  .replace(/^-+|-+$/g, "") || "post";

const stripMarkdown = (value) => normalizeWhitespace(
  String(value)
    .replace(/`([^`]+)`/g, "$1")
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/[*_>#-]/g, "")
);

const normalizeBlogPath = (path) => {
  if (typeof path !== "string") {
    return "";
  }

  const normalized = path.replace(/\\/g, "/");
  return normalized.includes("/") ? normalized : `${BLOGS_BASE_PATH}${normalized}`;
};

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
      path: normalizeBlogPath(post.file)
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

const parseDateValue = (value) => {
  if (!value) {
    return 0;
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 0 : date.getTime();
};

const formatDate = (value) => {
  if (!value) {
    return "";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en", {
    year: "numeric",
    month: "short",
    day: "numeric"
  }).format(date);
};

const getFirstHeading = (markdown) => {
  const match = markdown.match(/^#\s+(.+)$/m);
  return match ? stripMarkdown(match[1]) : "";
};

const getFirstParagraph = (markdown) => {
  const cleaned = markdown
    .replace(/```[\s\S]*?```/g, "")
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .find((block) => block && !block.startsWith("#") && !block.startsWith(">"));

  return cleaned ? stripMarkdown(cleaned) : "";
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

const safeUrl = (url) => {
  const trimmed = String(url).trim();
  return /^\s*javascript:/i.test(trimmed) ? "#" : trimmed;
};

const renderInline = (value) => {
  const codeSpans = [];
  let rendered = escapeHtml(value).replace(/`([^`]+)`/g, (_match, code) => {
    const token = `@@CODE${codeSpans.length}@@`;
    codeSpans.push(`<code>${code}</code>`);
    return token;
  });

  rendered = rendered
    .replace(/!\[([^\]]*)\]\(([^)\s]+)(?:\s+"([^"]+)")?\)/g, (_match, alt, url, title) => {
      const titleAttribute = title ? ` title="${escapeAttribute(title)}"` : "";
      return `<img src="${escapeAttribute(safeUrl(url))}" alt="${escapeAttribute(alt)}"${titleAttribute}>`;
    })
    .replace(/\[([^\]]+)\]\(([^)\s]+)(?:\s+"([^"]+)")?\)/g, (_match, text, url, title) => {
      const titleAttribute = title ? ` title="${escapeAttribute(title)}"` : "";
      return `<a href="${escapeAttribute(safeUrl(url))}"${titleAttribute}>${text}</a>`;
    })
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/\*([^*]+)\*/g, "<em>$1</em>")
    .replace(/__([^_]+)__/g, "<strong>$1</strong>")
    .replace(/_([^_]+)_/g, "<em>$1</em>");

  codeSpans.forEach((code, index) => {
    rendered = rendered.replace(`@@CODE${index}@@`, code);
  });

  return rendered;
};

const closeList = (state, html) => {
  if (!state.listType) {
    return;
  }

  html.push(`</${state.listType}>`);
  state.listType = "";
};

const closeParagraph = (state, html) => {
  if (!state.paragraph.length) {
    return;
  }

  html.push(`<p>${renderInline(state.paragraph.join(" "))}</p>`);
  state.paragraph = [];
};

const closeQuote = (state, html) => {
  if (!state.quote.length) {
    return;
  }

  const quote = state.quote.map((line) => renderInline(line)).join("<br>");
  html.push(`<blockquote><p>${quote}</p></blockquote>`);
  state.quote = [];
};

const closeOpenBlocks = (state, html) => {
  closeParagraph(state, html);
  closeQuote(state, html);
  closeList(state, html);
};

const markdownToHtml = (markdown) => {
  const lines = markdown.replace(/\r\n?/g, "\n").split("\n");
  const html = [];
  const state = {
    paragraph: [],
    quote: [],
    listType: "",
    inCodeBlock: false,
    codeLanguage: "",
    codeLines: []
  };

  lines.forEach((line) => {
    const codeFence = line.match(/^```([A-Za-z0-9_-]+)?\s*$/);

    if (state.inCodeBlock) {
      if (codeFence) {
        const languageClass = state.codeLanguage ? ` class="language-${escapeAttribute(state.codeLanguage)}"` : "";
        html.push(`<pre><code${languageClass}>${escapeHtml(state.codeLines.join("\n"))}</code></pre>`);
        state.inCodeBlock = false;
        state.codeLanguage = "";
        state.codeLines = [];
      } else {
        state.codeLines.push(line);
      }
      return;
    }

    if (codeFence) {
      closeOpenBlocks(state, html);
      state.inCodeBlock = true;
      state.codeLanguage = codeFence[1] || "";
      return;
    }

    if (!line.trim()) {
      closeOpenBlocks(state, html);
      return;
    }

    const heading = line.match(/^(#{1,6})\s+(.+)$/);
    if (heading) {
      closeOpenBlocks(state, html);
      const level = heading[1].length;
      const text = heading[2].trim();
      html.push(`<h${level} id="${escapeAttribute(slugify(stripMarkdown(text)))}">${renderInline(text)}</h${level}>`);
      return;
    }

    if (/^(?:---|\*\*\*|___)\s*$/.test(line.trim())) {
      closeOpenBlocks(state, html);
      html.push("<hr>");
      return;
    }

    const quote = line.match(/^>\s?(.*)$/);
    if (quote) {
      closeParagraph(state, html);
      closeList(state, html);
      state.quote.push(quote[1]);
      return;
    }

    const unorderedItem = line.match(/^\s*[-*+]\s+(.+)$/);
    const orderedItem = line.match(/^\s*\d+\.\s+(.+)$/);
    if (unorderedItem || orderedItem) {
      closeParagraph(state, html);
      closeQuote(state, html);
      const nextListType = unorderedItem ? "ul" : "ol";
      if (state.listType && state.listType !== nextListType) {
        closeList(state, html);
      }
      if (!state.listType) {
        state.listType = nextListType;
        html.push(`<${state.listType}>`);
      }
      html.push(`<li>${renderInline((unorderedItem || orderedItem)[1])}</li>`);
      return;
    }

    closeQuote(state, html);
    closeList(state, html);
    state.paragraph.push(line.trim());
  });

  if (state.inCodeBlock) {
    const languageClass = state.codeLanguage ? ` class="language-${escapeAttribute(state.codeLanguage)}"` : "";
    html.push(`<pre><code${languageClass}>${escapeHtml(state.codeLines.join("\n"))}</code></pre>`);
  }

  closeOpenBlocks(state, html);
  return html.join("\n");
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

  catalog.innerHTML = "";
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

const showBlogError = () => {
  const error = document.querySelector("[data-blog-error]");
  if (error) {
    error.hidden = false;
  }
};

const fetchText = (path) => fetch(path).then((response) => {
  if (!response.ok) {
    throw new Error(`Unable to load ${path}.`);
  }
  return response.text();
});

const loadPosts = (configs) => Promise.all(
  configs.map((config) => fetchText(config.path).then((markdown) => createPost(config, markdown)))
);

fetch(BLOG_INDEX_PATH)
  .then((response) => {
    if (!response.ok) {
      throw new Error("Unable to load blog index.");
    }
    return response.json();
  })
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
  .catch(showBlogError);
