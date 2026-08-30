const DATE_PREFIX = /^(\d{4})-(\d{2})-(\d{2})(?:$|T)/u;

export function formatPhotoDate(value: string | null | undefined): string {
  if (typeof value !== "string") return "-- --";
  const match = DATE_PREFIX.exec(value.trim());
  if (match === null) return "-- --";
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) {
    return "-- --";
  }
  return `${match[1]}. ${match[2]}. ${match[3]}.`;
}
