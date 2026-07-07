# BoBo Ye Personal Site

A small static personal homepage for BoBo Ye. The site includes a profile landing page, data-driven About and Projects pages, a Markdown-powered Blogs page, shared styling, and local profile, preview, and document assets.

## Features

- Profile landing page with avatar and primary navigation.
- About page that loads profile details, education, resume link, and social links from `data/about.json`.
- Projects page that renders JSON entries from `data/projects/index.json`, including time labels, time-aware ordering, title tags, author highlighting, preview images, descriptions, external paper links, and local PDF downloads.
- Blogs page that opens as a collection-style index with post cards, tag/status sidebar filters, and Markdown files listed in `data/blogs/index.json`. Each post renders with a sticky table-of-contents sidebar and supports front matter, status labels, tags, code blocks, lists, block quotes, links, and images.
- Shared dark visual style in `css/style.css`, including responsive About, Projects, and Blogs layouts and a reduced-motion-safe animated light effect.
- Local image, resume, and project document assets kept under `assets/`, with PNG and PDF files tracked through Git LFS.
- Dependency-free ES module static files that can be served from any basic web server.

## Project Structure

```text
.
|-- assets/
|   |-- docs/
|   |   |-- AdversarialGameMARL.pdf
|   |   `-- YHW-Chinese-20260603.pdf
|   `-- imgs/
|       |-- GameMARL.png
|       |-- ecogeo.png
|       |-- headpic_512.png
|       `-- kidgym.png
|-- css/
|   `-- style.css
|-- data/
|   |-- about.json
|   |-- blogs/
|   |   |-- index.json
|   |   `-- *.md
|   `-- projects/
|       `-- index.json
|-- html/
|   |-- about.html
|   |-- blog.html
|   `-- projects.html
|-- js/
|   |-- about-page.js
|   |-- blog-page.js
|   |-- projects-page.js
|   |-- blog/
|   |-- projects/
|   `-- shared/
`-- index.html
```

## Run Locally

This is a dependency-free static site. Because the About, Projects, and Blogs pages fetch JSON, Markdown, and JavaScript modules, serve the directory with a local web server instead of opening the HTML files directly from the filesystem.

```bash
python -m http.server 8000
```

Then open:

- Home: `http://localhost:8000/`
- About: `http://localhost:8000/html/about.html`
- Blogs: `http://localhost:8000/html/blog.html`
- Projects: `http://localhost:8000/html/projects.html`

## Editing Profile Content

Update `data/about.json` to change the profile name, avatar, headline, bio, resume link, profile details, education history, and social links displayed on the About page.

Resume downloads are configured through the `resume` object. Keep downloadable files in `assets/docs/` and point `resume.url` to the matching asset path.

Supported social link rendering currently includes GitHub-style icons through `js/about-page.js`. Additional link types can be added by extending the `iconPaths` map.

## Editing Projects

Add future research and project entries as objects in the `items` array in `data/projects/index.json`. The Projects page sorts entries by the date-like `time` field, newest first, and highlights `Hengwei Ye` in the author list by default.

Use `conference` for the title tag. Leave it empty when there is no venue, status, or project-category tag; when present, the page renders it as a highlighted bracketed label before the title.

```json
{
  "conference": "ICLR'26",
  "title": "Example Paper Title",
  "authors": ["Hengwei Ye", "Coauthor Name"],
  "time": "2026-01",
  "url": "https://example.com/paper",
  "image": "assets/imgs/example.png",
  "description": "Short paper description."
}
```

For local PDFs, point `url` to a file in `assets/docs/` and add `download` to suggest the downloaded file name. For external links, use the target URL and omit `download`.

Project entries support `conference`, `title`, `authors`, `time`, `url`, `download`, `image`, and `description`.

## Large Assets

PNG and PDF assets are tracked through Git LFS via `.gitattributes`. Add large previews and downloadable documents under `assets/` before committing so the matching LFS rules apply.

## Editing Blogs

Add blog posts as `.md` files in `data/blogs/`, then list each file in `data/blogs/index.json`.

```json
{
  "posts": [
    "科研实用工具合集.md",
    "个人云服务器搭建.md"
  ]
}
```

Markdown files can also live in `data/blogs/` as drafts or templates; only files listed in `data/blogs/index.json` appear on the Blogs page.

Each Markdown post can include front matter:

```md
---
title: Blog Template Notes
date: 2026-07-02
summary: A short intro for the post list and article header.
tags: [Site, Markdown]
status: Completed
---

## Your first section

Write the post body here.
```

Supported Markdown includes headings, paragraphs, ordered and unordered lists, block quotes, links, images, inline code, highlighted bold text, italic text, horizontal rules, and fenced code blocks.

The optional `status` field is shown as the blog index badge and grouped in the sidebar. Supported values are `Completed`, `Updating`, and `TODO`; matching is case-insensitive, and posts without this field use `Completed`.
