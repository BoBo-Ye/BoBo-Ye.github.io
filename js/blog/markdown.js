import {
  escapeAttribute,
  escapeHtml,
  safeUrl,
  slugify,
  stripMarkdown
} from "../shared/text.js";

const renderInline = (value) => {
  const codeSpans = [];
  let rendered = escapeHtml(value).replace(/`([^`]+)`/g, (_match, code) => {
    const token = `@@CODE${codeSpans.length}@@`;
    codeSpans.push(`<code>${escapeHtml(code)}</code>`);
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

export const markdownToHtml = (markdown) => {
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

export const getFirstHeading = (markdown) => {
  const match = markdown.match(/^#\s+(.+)$/m);
  return match ? stripMarkdown(match[1]) : "";
};

export const getFirstParagraph = (markdown) => {
  const cleaned = markdown
    .replace(/```[\s\S]*?```/g, "")
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .find((block) => block && !block.startsWith("#") && !block.startsWith(">"));

  return cleaned ? stripMarkdown(cleaned) : "";
};
