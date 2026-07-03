# BoBo Ye Personal Site

A small static personal homepage for BoBo Ye. The site includes a profile landing page, data-driven About, Papers, and Projects pages, a Markdown-powered Blogs page, shared styling, and local profile, preview, and document assets.

## Features

- Profile landing page with avatar and primary navigation.
- About page that loads profile details, education, resume link, and social links from `data/about.json`.
- Papers page that renders BibTeX entries listed in `data/bibs/index.json`, including badges, date-aware ordering, tagged titles, featured-author highlighting, preview images, and paper descriptions.
- Projects page that reuses the BibTeX renderer with entries listed in `data/projects/index.json`, including local PDF downloads, preview images, badges, and descriptions.
- Blogs page that opens as a four-column card catalog and renders Markdown files listed in `data/blogs/index.json`, including front matter, tags, code blocks, lists, block quotes, links, and images.
- Shared dark visual style in `css/style.css`, including responsive About, Blogs, Papers, and Projects layouts and a reduced-motion-safe animated light effect.
- Local image, resume, and project document assets kept under `assets/`, with PNG and PDF files tracked through Git LFS.
- Dependency-free static files that can be served from any basic web server.

## Project Structure

```text
.
|-- assets/
|   |-- docs/
|   |   |-- GameMARL.pdf
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
|   |-- bibs/
|   |   |-- index.json
|   |   `-- *.bib
|   |-- blogs/
|   |   |-- index.json
|   |   `-- *.md
|   `-- projects/
|       |-- index.json
|       `-- *.bib
|-- html/
|   |-- about.html
|   |-- blog.html
|   |-- papers.html
|   `-- projects.html
|-- js/
|   |-- about.js
|   |-- blog.js
|   `-- papers.js
`-- index.html
```

## Run Locally

This is a dependency-free static site. Because the About, Blogs, Papers, and Projects pages fetch JSON, Markdown, and BibTeX files, serve the directory with a local web server instead of opening the HTML files directly from the filesystem.

```bash
python -m http.server 8000
```

Then open:

- Home: `http://localhost:8000/`
- About: `http://localhost:8000/html/about.html`
- Blogs: `http://localhost:8000/html/blog.html`
- Papers: `http://localhost:8000/html/papers.html`
- Projects: `http://localhost:8000/html/projects.html`

## Editing Profile Content

Update `data/about.json` to change the profile name, avatar, headline, bio, resume link, profile details, education history, and social links displayed on the About page.

Resume downloads are configured through the `resume` object. Keep downloadable files in `assets/docs/` and point `resume.url` to the matching asset path.

Supported social link rendering currently includes GitHub-style icons through `js/about.js`. Additional link types can be added by extending the `iconPaths` map.

## Editing Papers

Add future papers as `.bib` files in `data/bibs/`, then add each file name to the `bibs` array in `data/bibs/index.json`. The Papers page reads BibTeX fields directly, uses date-like `status`, `date`, `publicationDate`, `releaseDate`, `venueYear`, or `year` values for ordering, and styles bracketed title tags such as `[ICLR'26]`.

`url` and `doi` fields make paper titles clickable. Optional `image`, `thumbnail`, `preview`, or `teaser` fields render a paper preview image, and optional `description`, `abstract`, or `summary` fields render a short overview beside it. Use `imageAlt` or `alt` to override generated image alt text.

`eprint`, `archivePrefix`, and `primaryClass` are ignored on the webpage.

## Editing Projects

Add project entries as `.bib` files in `data/projects/`, then add each file name to the `bibs` array in `data/projects/index.json`.

The Projects page uses the same BibTeX renderer as Papers with authors hidden. Point `url` to a local PDF in `assets/docs/` when the project should download a document, and add `download` to suggest the downloaded file name.

Project entries support the same `image`, `imageAlt`, `description`, badge, date, and venue-style fields as paper entries.

## Large Assets

PNG and PDF assets are tracked through Git LFS via `.gitattributes`. Add large previews and downloadable documents under `assets/` before committing so the matching LFS rules apply.

## Editing Blogs

Add blog posts as `.md` files in `data/blogs/`, then list each file in `data/blogs/index.json`.

```json
{
  "posts": [
    {
      "file": "welcome.md"
    }
  ]
}
```

Each Markdown post can include front matter:

```md
---
title: Blog Template Notes
date: 2026-07-02
summary: A short intro for the post list and article header.
tags: [Site, Markdown]
---

## Your first section

Write the post body here.
```

Supported Markdown includes headings, paragraphs, ordered and unordered lists, block quotes, links, images, inline code, bold and italic text, horizontal rules, and fenced code blocks.
