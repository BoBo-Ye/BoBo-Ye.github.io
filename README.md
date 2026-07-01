# BoBo Ye Personal Site

A small static personal homepage for BoBo Ye. The site includes a profile landing page, a data-driven About page, shared styling, and local profile assets.

## Features

- Profile landing page with avatar and primary navigation.
- About page that loads profile details from `data/about.json`.
- Shared dark visual style in `css/style.css`, including a reduced-motion-safe animated light effect.
- Dependency-free static files that can be served from any basic web server.

## Project Structure

```text
.
|-- assets/
|   `-- imgs/
|       `-- headpic_512.png
|-- css/
|   `-- style.css
|-- data/
|   `-- about.json
|-- html/
|   `-- about.html
|-- js/
|   `-- about.js
`-- index.html
```

## Run Locally

This is a dependency-free static site. Because the About page fetches JSON, serve the directory with a local web server instead of opening `html/about.html` directly from the filesystem.

```bash
python -m http.server 8000
```

Then open:

- Home: `http://localhost:8000/`
- About: `http://localhost:8000/html/about.html`

## Editing Profile Content

Update `data/about.json` to change the profile name, avatar, headline, bio, details, and social links displayed on the About page.

Supported social link rendering currently includes GitHub-style icons through `js/about.js`. Additional link types can be added by extending the `iconPaths` map.
