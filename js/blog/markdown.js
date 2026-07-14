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

const splitTableRow = (line) => {
  const trimmed = line.trim();
  if (!trimmed.includes("|")) {
    return null;
  }

  let row = trimmed;
  if (row.startsWith("|")) {
    row = row.slice(1);
  }
  if (row.endsWith("|")) {
    row = row.slice(0, -1);
  }

  const cells = [];
  let cell = "";

  for (let index = 0; index < row.length; index += 1) {
    const character = row[index];
    if (character === "\\" && row[index + 1] === "|") {
      cell += "|";
      index += 1;
      continue;
    }

    if (character === "|") {
      cells.push(cell.trim());
      cell = "";
      continue;
    }

    cell += character;
  }

  cells.push(cell.trim());
  return cells.length > 1 ? cells : null;
};

const isTableDividerCell = (cell) => /^:?-{3,}:?$/.test(cell.replace(/\s+/g, ""));

const isTableDivider = (line) => {
  const cells = splitTableRow(line);
  return Boolean(cells?.length && cells.every(isTableDividerCell));
};

const createTableCellMarkup = (tagName, value) => `<${tagName}>${renderInline(value)}</${tagName}>`;

const renderTable = (lines, startIndex) => {
  if (!isTableDivider(lines[startIndex + 1] || "")) {
    return null;
  }

  const headerCells = splitTableRow(lines[startIndex]);
  if (!headerCells) {
    return null;
  }

  const rows = [];
  let index = startIndex + 2;

  while (index < lines.length) {
    const rowCells = splitTableRow(lines[index]);
    if (!rowCells) {
      break;
    }

    rows.push(rowCells);
    index += 1;
  }

  const columnCount = headerCells.length;
  const normalizeCells = (cells) => (
    Array.from({ length: columnCount }, (_value, cellIndex) => cells[cellIndex] || "")
  );
  const hasHeader = headerCells.some((cell) => cell.trim());

  const thead = hasHeader ? `
    <thead>
      <tr>${normalizeCells(headerCells).map((cell) => createTableCellMarkup("th", cell)).join("")}</tr>
    </thead>
  ` : "";

  const tbody = rows.length ? `
    <tbody>
      ${rows.map((row) => (
        `<tr>${normalizeCells(row).map((cell) => createTableCellMarkup("td", cell)).join("")}</tr>`
      )).join("")}
    </tbody>
  ` : "";

  return {
    html: `<div class="markdown-table"><table>${thead}${tbody}</table></div>`,
    nextIndex: index
  };
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
    codeFenceLength: 0,
    codeLines: []
  };

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    const codeFence = line.match(/^(`{3,})([A-Za-z0-9_-]+)?\s*$/);

    if (state.inCodeBlock) {
      const isClosingFence = codeFence
        && !codeFence[2]
        && codeFence[1].length >= state.codeFenceLength;

      if (isClosingFence) {
        const languageClass = state.codeLanguage ? ` class="language-${escapeAttribute(state.codeLanguage)}"` : "";
        html.push(`<pre><code${languageClass}>${escapeHtml(state.codeLines.join("\n"))}</code></pre>`);
        state.inCodeBlock = false;
        state.codeLanguage = "";
        state.codeFenceLength = 0;
        state.codeLines = [];
      } else {
        state.codeLines.push(line);
      }
      continue;
    }

    if (codeFence) {
      closeOpenBlocks(state, html);
      state.inCodeBlock = true;
      state.codeFenceLength = codeFence[1].length;
      state.codeLanguage = codeFence[2] || "";
      continue;
    }

    if (!line.trim()) {
      closeOpenBlocks(state, html);
      continue;
    }

    const table = renderTable(lines, index);
    if (table) {
      closeOpenBlocks(state, html);
      html.push(table.html);
      index = table.nextIndex - 1;
      continue;
    }

    const heading = line.match(/^(#{1,6})\s+(.+)$/);
    if (heading) {
      closeOpenBlocks(state, html);
      const level = heading[1].length;
      const text = heading[2].trim();
      html.push(`<h${level} id="${escapeAttribute(slugify(stripMarkdown(text)))}">${renderInline(text)}</h${level}>`);
      continue;
    }

    if (/^(?:---|\*\*\*|___)\s*$/.test(line.trim())) {
      closeOpenBlocks(state, html);
      html.push("<hr>");
      continue;
    }

    const quote = line.match(/^>\s?(.*)$/);
    if (quote) {
      closeParagraph(state, html);
      closeList(state, html);
      state.quote.push(quote[1]);
      continue;
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
      continue;
    }

    closeQuote(state, html);
    closeList(state, html);
    state.paragraph.push(line.trim());
  }

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
