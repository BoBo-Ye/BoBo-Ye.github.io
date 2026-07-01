# BoBo Ye Personal Site

A small static personal homepage for BoBo Ye. The site includes a profile landing page, a data-driven About page, shared styling, and local agent skills for project maintenance.

## Features

- Profile landing page with avatar and primary navigation.
- About page that loads profile details from `data/about.json`.
- Shared dark visual style in `css/style.css`, including a reduced-motion-safe animated light effect.
- Local agent skills for README generation, skill authoring, skill discovery, Git commits, and project updates.

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
|-- index.html
|-- .gitignore
`-- .agents/
    `-- skills/
        |-- create-readme/
        |-- create-skill/
        |-- find-skills/
        |-- git-commit/
        `-- update-project/
```

> [!NOTE]
> `.agents/` is listed in `.gitignore`, so the local skills are workspace tooling rather than site files intended for deployment.

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

## Local Agent Skills

The workspace includes these local skills:

| Skill | Purpose |
| --- | --- |
| `create-readme` | Create concise, professional project README files. |
| `create-skill` | Guide creation or updates of agent skills. |
| `find-skills` | Discover installable skills for specialized tasks. |
| `git-commit` | Create conventional commits from analyzed diffs. |
| `update-project` | Refresh the README, commit changes, and summarize project updates. |
