export function sameOrigin(origin: string | null, expectedUrl: string): boolean {
  if (!origin) return false;
  try { return new URL(origin).origin === new URL(expectedUrl).origin; }
  catch { return false; }
}
export function validQuantity(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 1 && value <= 100;
}
export function validIdentifier(value: unknown): value is string {
  return typeof value === "string" && /^[A-Za-z0-9_-]{1,100}$/.test(value);
}

