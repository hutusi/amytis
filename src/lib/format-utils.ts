export function padNumber(n: number, width = 2): string {
  return String(n).padStart(width, '0');
}
