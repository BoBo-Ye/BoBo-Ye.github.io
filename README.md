# BoBo Ye Personal Site

A small static personal homepage for BoBo Ye. The site includes a profile landing page, data-driven About and Papers pages, shared styling, and local profile and resume assets.

## Features

- Profile landing page with avatar and primary navigation.
- About page that loads profile details, education, resume link, and social links from `data/about.json`.
- Papers page that renders BibTeX entries listed in `data/bibs/index.json`, including badges, date-aware ordering, tagged titles, featured-author highlighting, preview images, and paper descriptions.
- Shared dark visual style in `css/style.css`, including responsive About and Papers layouts and a reduced-motion-safe animated light effect.
- Local profile, resume, and publication preview assets kept under `assets/`.
- Dependency-free static files that can be served from any basic web server.

## Project Structure

```text
.
|-- assets/
|   |-- imgs/
|   |   |-- ecogeo.png
|   |   |-- headpic_512.png
|   |   `-- kidgym.png
|   `-- resumes/
|       `-- YHW-Chinese-20260603.pdf
|-- css/
|   `-- style.css
|-- data/
|   |-- about.json
|   `-- bibs/
|       |-- index.json
|       `-- *.bib
|-- html/
|   |-- about.html
|   `-- papers.html
|-- js/
|   |-- about.js
|   `-- papers.js
`-- index.html
```

## Run Locally

This is a dependency-free static site. Because the About and Papers pages fetch JSON and BibTeX files, serve the directory with a local web server instead of opening the HTML files directly from the filesystem.

```bash
python -m http.server 8000
```

Then open:

- Home: `http://localhost:8000/`
- About: `http://localhost:8000/html/about.html`
- Papers: `http://localhost:8000/html/papers.html`

## Editing Profile Content

Update `data/about.json` to change the profile name, avatar, headline, bio, resume link, profile details, education history, and social links displayed on the About page.

Resume downloads are configured through the `resume` object. Keep downloadable files in `assets/resumes/` and point `resume.url` to the matching asset path.

Supported social link rendering currently includes GitHub-style icons through `js/about.js`. Additional link types can be added by extending the `iconPaths` map.

## Editing Papers

Add future papers as `.bib` files in `data/bibs/`, then add each file name to the `bibs` array in `data/bibs/index.json`. The Papers page reads BibTeX fields directly, uses date-like `status`, `date`, `publicationDate`, `releaseDate`, `venueYear`, or `year` values for ordering, and styles bracketed title tags such as `[ICLR'26]`.

`url` and `doi` fields make paper titles clickable. Optional `image`, `thumbnail`, `preview`, or `teaser` fields render a paper preview image, and optional `description`, `abstract`, or `summary` fields render a short overview beside it. Use `imageAlt` or `alt` to override generated image alt text.

`eprint`, `archivePrefix`, and `primaryClass` are ignored on the webpage.
