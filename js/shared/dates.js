export const parseDateValue = (value) => {
  if (!value) {
    return 0;
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 0 : date.getTime();
};

export const parseLooseDate = (value) => {
  if (!value) {
    return 0;
  }

  const match = String(value).match(/(\d{4})(?:[-/](\d{1,2}))?(?:[-/](\d{1,2}))?/);
  if (!match) {
    return 0;
  }

  const year = Number(match[1]);
  const month = Math.min(Math.max(Number(match[2] || 1), 1), 12);
  const day = Math.min(Math.max(Number(match[3] || 1), 1), 31);
  return Date.UTC(year, month - 1, day);
};

export const formatDate = (value) => {
  if (!value) {
    return "";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en", {
    year: "numeric",
    month: "short",
    day: "numeric"
  }).format(date);
};
