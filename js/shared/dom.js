export const getElement = (target) => (
  typeof target === "string" ? document.querySelector(target) : target
);

export const clearElement = (target) => {
  const element = getElement(target);
  if (element) {
    element.replaceChildren();
  }
};

export const showElement = (target) => {
  const element = getElement(target);
  if (element) {
    element.hidden = false;
  }
};

export const setText = (target, value) => {
  const element = getElement(target);
  if (!element) {
    return;
  }

  if (value) {
    element.textContent = value;
    element.hidden = false;
  } else {
    element.textContent = "";
    element.hidden = true;
  }
};

export const createSvgIcon = (pathData, className = "") => {
  const icon = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  icon.setAttribute("viewBox", "0 0 24 24");
  icon.setAttribute("aria-hidden", "true");
  if (className) {
    icon.setAttribute("class", className);
  }

  const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
  path.setAttribute("d", pathData);
  icon.appendChild(path);
  return icon;
};
