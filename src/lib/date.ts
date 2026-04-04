export const toDate = (value: string | Date): Date => {
  if (value instanceof Date) return value;
  // Support YYYY-MM-DD strings
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [y, m, d] = value.split("-").map(Number);
    return new Date(y, m - 1, d);
  }
  // Fallback: let Date parse ISO or other strings
  return new Date(value);
};

export const formatDM = (value: string | Date): string => {
  const dt = toDate(value);
  if (isNaN(dt.getTime())) return "";
  return new Intl.DateTimeFormat("el-GR", { day: "numeric", month: "numeric" }).format(dt);
};

export const formatTimeEL = (value?: string | Date): string => {
  if (!value) return "";
  const dt = toDate(value);
  if (isNaN(dt.getTime())) return "";
  return new Intl.DateTimeFormat("el-GR", { hour: "2-digit", minute: "2-digit" }).format(dt);
};
