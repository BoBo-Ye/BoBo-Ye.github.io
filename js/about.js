const iconPaths = {
  github: "M12 .5C5.65.5.5 5.65.5 12c0 5.1 3.29 9.42 7.86 10.95.58.1.79-.25.79-.56v-2.02c-3.2.69-3.88-1.36-3.88-1.36-.53-1.33-1.29-1.68-1.29-1.68-1.05-.72.08-.71.08-.71 1.16.08 1.78 1.19 1.78 1.19 1.04 1.78 2.72 1.27 3.38.97.1-.75.41-1.27.74-1.56-2.56-.29-5.25-1.28-5.25-5.69 0-1.26.45-2.28 1.19-3.09-.12-.29-.52-1.46.11-3.05 0 0 .98-.31 3.2 1.18A11.1 11.1 0 0 1 12 6.18c.99 0 1.99.13 2.92.39 2.22-1.49 3.19-1.18 3.19-1.18.64 1.59.24 2.76.12 3.05.74.81 1.18 1.83 1.18 3.09 0 4.42-2.69 5.39-5.26 5.68.42.36.79 1.07.79 2.16v3.02c0 .31.21.67.8.56A11.51 11.51 0 0 0 23.5 12C23.5 5.65 18.35.5 12 .5Z"
};

const setText = (selector, value) => {
  const element = document.querySelector(selector);
  if (element && value) {
    element.textContent = value;
  }
};

const renderAbout = (about) => {
  setText("[data-about-name]", about.name);
  setText("[data-about-headline]", about.headline);

  const avatar = document.querySelector("[data-about-avatar]");
  if (avatar) {
    if (about.avatar) {
      avatar.src = about.avatar;
    }
    if (about.name) {
      avatar.alt = about.name;
    }
  }

  const bio = document.querySelector("[data-about-bio]");
  if (bio && Array.isArray(about.bio)) {
    bio.innerHTML = "";
    about.bio.filter(Boolean).forEach((paragraph) => {
      const p = document.createElement("p");
      p.textContent = paragraph;
      bio.appendChild(p);
    });
  }

  const details = document.querySelector("[data-about-details]");
  if (details && Array.isArray(about.details)) {
    details.innerHTML = "";
    about.details.filter((item) => item.label && item.value).forEach((item) => {
      const row = document.createElement("div");
      row.className = "info-row";

      const term = document.createElement("dt");
      term.textContent = item.label;

      const description = document.createElement("dd");
      description.textContent = item.value;

      row.append(term, description);
      details.appendChild(row);
    });
  }

  const links = document.querySelector("[data-about-links]");
  if (links && Array.isArray(about.links)) {
    links.innerHTML = "";
    about.links.filter((link) => link.label && link.url).forEach((link) => {
      const anchor = document.createElement("a");
      anchor.className = "social-link";
      anchor.href = link.url;
      anchor.setAttribute("aria-label", link.label);
      anchor.title = link.label;
      if (!link.url.startsWith("mailto:")) {
        anchor.target = "_blank";
        anchor.rel = "noreferrer";
      }

      const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      svg.setAttribute("viewBox", "0 0 24 24");
      svg.setAttribute("aria-hidden", "true");

      const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
      path.setAttribute("d", iconPaths[link.type] || iconPaths.github);
      svg.appendChild(path);
      anchor.appendChild(svg);
      links.appendChild(anchor);
    });
  }
};

const showDataError = () => {
  const error = document.querySelector("[data-about-error]");
  if (error) {
    error.hidden = false;
  }
};

fetch("data/about.json")
  .then((response) => {
    if (!response.ok) {
      throw new Error("Unable to load about data.");
    }
    return response.json();
  })
  .then(renderAbout)
  .catch(showDataError);
