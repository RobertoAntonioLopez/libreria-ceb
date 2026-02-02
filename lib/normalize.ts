export function normalizeTitle(input: string) {
  return input
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();
}
