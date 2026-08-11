/**
 * Escape user-supplied text before interpolating it into a RegExp/$regex
 * query. Without this, characters like `(`, `|`, `+` let a caller build a
 * pathological pattern (ReDoS) or match far more broadly than a literal
 * search should.
 */
export function escapeRegex(input: string): string {
  return input.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
