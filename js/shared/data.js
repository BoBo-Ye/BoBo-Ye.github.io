const fetchOptions = { cache: "no-cache" };

const assertOk = (response, message) => {
  if (!response.ok) {
    throw new Error(message);
  }
};

export const fetchJson = (path, message = `Unable to load ${path}.`) => (
  fetch(path, fetchOptions).then((response) => {
    assertOk(response, message);
    return response.json();
  })
);

export const fetchText = (path, message = `Unable to load ${path}.`) => (
  fetch(path, fetchOptions).then((response) => {
    assertOk(response, message);
    return response.text();
  })
);

export const normalizeDataPath = (path, basePath = "") => {
  if (typeof path !== "string") {
    return "";
  }

  const normalized = path.trim().replace(/\\/g, "/");
  if (!normalized) {
    return "";
  }

  if (/^(?:[a-z][a-z0-9+.-]*:|\/|#)/i.test(normalized) || normalized.includes("/")) {
    return normalized;
  }

  return `${basePath}${normalized}`;
};
