/**
 * Short relative-time formatters used by the shell selector. Hand-rolled so
 * the shell doesn't pull date-fns in for a couple of terse strings.
 *
 * Both helpers operate in the "short" idiom — `"2d"`, `"5h"`, `"3w"` — rather
 * than the full Intl `RelativeTimeFormat` prose. This is a deliberate design
 * call: the selector mimics the handoff's compact mono-font stamps.
 */

const MS_PER_SECOND = 1000;
const MS_PER_MINUTE = 60 * MS_PER_SECOND;
const MS_PER_HOUR = 60 * MS_PER_MINUTE;
const MS_PER_DAY = 24 * MS_PER_HOUR;
const MS_PER_WEEK = 7 * MS_PER_DAY;

/**
 * Formats a delta in milliseconds as the largest whole unit, e.g. `"2d"`,
 * `"5h"`, `"30m"`, `"3w"`. Sub-minute deltas round up to `"1m"` so the
 * selector never renders `"0m"`.
 *
 * @param absMs - Absolute difference in milliseconds. Must be non-negative.
 * @returns A two-part `"{N}{unit}"` string.
 */
function formatShortDelta(absMs: number): string {
  if (absMs >= MS_PER_WEEK) return `${Math.floor(absMs / MS_PER_WEEK)}w`;
  if (absMs >= MS_PER_DAY) return `${Math.floor(absMs / MS_PER_DAY)}d`;
  if (absMs >= MS_PER_HOUR) return `${Math.floor(absMs / MS_PER_HOUR)}h`;
  if (absMs >= MS_PER_MINUTE) return `${Math.floor(absMs / MS_PER_MINUTE)}m`;
  return '1m';
}

/**
 * Short relative-time formatter. Returns strings like `"2d"`, `"5h"`, `"3w"`
 * for past timestamps and `"in 2h"` / `"in 14d"` for future ones. Hand-rolled
 * because the shell doesn't depend on date-fns.
 *
 * @param iso - ISO 8601 timestamp.
 * @param now - Clock reference, defaults to `Date.now()`. Override in tests.
 * @returns Past deltas as `"{N}{unit}"`; future deltas as `"in {N}{unit}"`.
 */
export function formatRelative(iso: string, now: number = Date.now()): string {
  const then = Date.parse(iso);
  if (Number.isNaN(then)) return '';
  const delta = then - now;
  const abs = Math.abs(delta);
  const short = formatShortDelta(abs);
  return delta >= 0 ? `in ${short}` : short;
}

/**
 * Renders the "code remaining" portion of the selector's code row. Examples:
 *
 * - `"14d left"` when the code is valid for two more weeks,
 * - `"2h left"` when it's expiring today,
 * - `"expired"` when the instant has already passed.
 *
 * @param iso - ISO 8601 expiry timestamp.
 * @param now - Clock reference, defaults to `Date.now()`. Override in tests.
 * @returns Either `"{N}{unit} left"` or the literal `"expired"`.
 */
export function formatExpiryRemaining(iso: string, now: number = Date.now()): string {
  const then = Date.parse(iso);
  if (Number.isNaN(then)) return '';
  const delta = then - now;
  if (delta <= 0) return 'expired';
  return `${formatShortDelta(delta)} left`;
}
