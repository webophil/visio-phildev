export type ClassValue = string | false | null | undefined

/** Concatène les classes CSS conditionnelles. */
export function cn(...values: ClassValue[]): string {
  return values.filter(Boolean).join(' ')
}
