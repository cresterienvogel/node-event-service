export function exponentialBackoffSeconds(attempt: number, baseSeconds: number): number {
  const expo = Math.pow(2, Math.max(0, attempt - 1));
  const seconds = baseSeconds * expo;

  return Math.min(seconds, 60 * 60);
}
