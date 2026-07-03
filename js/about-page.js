import { fetchJson } from "./shared/data.js";
import {
  clearElement,
  createSvgIcon,
  setText,
  showElement
} from "./shared/dom.js";

const iconPaths = {
  github: "M12 .5C5.65.5.5 5.65.5 12c0 5.1 3.29 9.42 7.86 10.95.58.1.79-.25.79-.56v-2.02c-3.2.69-3.88-1.36-3.88-1.36-.53-1.33-1.29-1.68-1.29-1.68-1.05-.72.08-.71.08-.71 1.16.08 1.78 1.19 1.78 1.19 1.04 1.78 2.72 1.27 3.38.97.1-.75.41-1.27.74-1.56-2.56-.29-5.25-1.28-5.25-5.69 0-1.26.45-2.28 1.19-3.09-.12-.29-.52-1.46.11-3.05 0 0 .98-.31 3.2 1.18A11.1 11.1 0 0 1 12 6.18c.99 0 1.99.13 2.92.39 2.22-1.49 3.19-1.18 3.19-1.18.64 1.59.24 2.76.12 3.05.74.81 1.18 1.83 1.18 3.09 0 4.42-2.69 5.39-5.26 5.68.42.36.79 1.07.79 2.16v3.02c0 .31.21.67.8.56A11.51 11.51 0 0 0 23.5 12C23.5 5.65 18.35.5 12 .5Z"
};

const appendResumeLink = (paragraph, resumeData) => {
  if (!resumeData || !resumeData.label || !resumeData.url) {
    return;
  }

  const anchor = document.createElement("a");
  anchor.href = resumeData.url;
  anchor.textContent = resumeData.label;
  anchor.setAttribute("download", resumeData.download || "");
  anchor.setAttribute("aria-label", "Download resume");

  paragraph.append(
    document.createTextNode(` ${resumeData.prefix || "Download my "}`),
    anchor,
    document.createTextNode(".")
  );
};

const renderBio = (about) => {
  const bio = document.querySelector("[data-about-bio]");
  if (!bio || !Array.isArray(about.bio)) {
    return;
  }

  clearElement(bio);
  const paragraphs = about.bio.filter(Boolean);
  paragraphs.forEach((paragraph, index) => {
    const p = document.createElement("p");
    p.textContent = paragraph;
    if (index === paragraphs.length - 1) {
      appendResumeLink(p, about.resume);
    }
    bio.appendChild(p);
  });
};

const renderDetails = (detailsData) => {
  const details = document.querySelector("[data-about-details]");
  if (!details || !Array.isArray(detailsData)) {
    return;
  }

  clearElement(details);
  detailsData.filter((item) => item.label && item.value).forEach((item) => {
    const row = document.createElement("div");
    row.className = "info-row";

    const term = document.createElement("dt");
    term.textContent = item.label;

    const description = document.createElement("dd");
    description.textContent = item.value;

    row.append(term, description);
    details.appendChild(row);
  });
};

const renderEducation = (educationData) => {
  const education = document.querySelector("[data-about-education]");
  if (!education || !Array.isArray(educationData)) {
    return;
  }

  clearElement(education);
  educationData
    .filter((item) => item.school || item.degree || item.period || item.description)
    .forEach((item) => {
      const article = document.createElement("article");
      article.className = "education-item";

      const icon = createSvgIcon(
        "M2 10.5 12 5l10 5.5-10 5.5-10-5.5Zm4 2.2v4.15c0 1.49 2.69 3.15 6 3.15s6-1.66 6-3.15V12.7l-6 3.3-6-3.3Z",
        "education-icon"
      );

      const content = document.createElement("div");
      content.className = "education-content";

      if (item.degree || item.period) {
        const heading = document.createElement("div");
        heading.className = "education-heading";

        if (item.degree) {
          const degree = document.createElement("h3");
          degree.className = "education-degree";
          degree.textContent = item.degree;
          heading.appendChild(degree);
        }

        if (item.period) {
          const period = document.createElement("span");
          period.className = "education-period";
          period.textContent = item.period;
          heading.appendChild(period);
        }

        content.appendChild(heading);
      }

      if (item.school) {
        const school = document.createElement("p");
        school.className = "education-school";
        school.textContent = item.school;
        content.appendChild(school);
      }

      if (item.description) {
        const description = document.createElement("p");
        description.className = "education-description";
        description.textContent = item.description;
        content.appendChild(description);
      }

      article.append(icon, content);
      education.appendChild(article);
    });
};

const renderLinks = (linksData) => {
  const links = document.querySelector("[data-about-links]");
  if (!links || !Array.isArray(linksData)) {
    return;
  }

  clearElement(links);
  linksData.filter((link) => link.label && link.url).forEach((link) => {
    const anchor = document.createElement("a");
    anchor.className = "social-link";
    anchor.href = link.url;
    anchor.setAttribute("aria-label", link.label);
    anchor.title = link.label;
    if (!link.url.startsWith("mailto:")) {
      anchor.target = "_blank";
      anchor.rel = "noreferrer";
    }

    anchor.appendChild(createSvgIcon(iconPaths[link.type] || iconPaths.github));
    links.appendChild(anchor);
  });
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

  renderBio(about);
  renderDetails(about.details);
  renderEducation(about.education);
  renderLinks(about.links);
};

fetchJson("data/about.json", "Unable to load about data.")
  .then(renderAbout)
  .catch((error) => {
    console.error(error);
    showElement("[data-about-error]");
  });
