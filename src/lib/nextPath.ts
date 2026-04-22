/**
 * Acceptable `?next=` shapes — a leading slash, then a slug that starts with
 * a lowercase letter and only contains lowercase / digits / dashes,
 * optionally followed by a sub-path. The slug must also resolve in the
 * session's apps list so a crafted but syntactically-valid slug for an app
 * the user doesn't have access to can't redirect them to a 404.
 */
const NEXT_PATH_PATTERN = /^\/([a-z][a-z0-9-]*)(\/.*)?$/;

/**
 * Returns the `?next=` param when it's safe to redirect to. Safety has two
 * layers:
 *
 * 1. **Syntactic** — the path must match {@link NEXT_PATH_PATTERN}. This
 *    rejects absolute URLs (`https://evil.com/…`), protocol-relative URLs
 *    (`//evil.com/…`), javascript: URIs, and malformed slugs.
 * 2. **Semantic** — the slug must exist in the session's apps list. A
 *    syntactically valid `?next=/admin` for a user without admin access
 *    silently drops to homepage rather than redirecting to a 404.
 *
 * Returns `null` when the path is unsafe or absent.
 *
 * @param nextPath - The raw `?next=` search param (or `null` if absent).
 * @param appIds - The set of app ids the current session can reach.
 * @returns The original `nextPath` when safe, otherwise `null`.
 */
export function parseSafeNextPath(
  nextPath: string | null,
  appIds: ReadonlySet<string>,
): string | null {
  if (!nextPath) return null;
  // Block protocol-relative URLs (`//evil.com/…`) and backslash tricks that
  // Next.js's router would happily follow off-origin.
  if (nextPath.startsWith('//') || nextPath.startsWith('/\\')) return null;
  const match = NEXT_PATH_PATTERN.exec(nextPath);
  if (!match) return null;
  const [, slug] = match;
  if (!appIds.has(slug)) return null;
  return nextPath;
}
