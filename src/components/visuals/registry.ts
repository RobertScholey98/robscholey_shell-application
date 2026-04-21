import type { ReactNode } from 'react';
import { createElement } from 'react';
import { PortfolioVisual } from './PortfolioVisual';
import { AdminVisual } from './AdminVisual';
import { TemplateVisual } from './TemplateVisual';

/**
 * Map of `App.visualKey` values to the local React component that paints
 * the card's identity visual. Lives here (not on the server) because visuals
 * are a shell-side design concern — the app just declares "which one am I".
 *
 * The keys mirror the `visualKey` values used in `appsConfig.json`.
 */
const visualRegistry: Record<string, () => ReactNode> = {
  bars: PortfolioVisual,
  ascii: AdminVisual,
  'mono-mark': TemplateVisual,
};

/**
 * Resolves an app's `visualKey` to a rendered visual node. Unknown keys
 * resolve to `null` (and log a dev-only warning) so a missing entry can't
 * crash the selector; the card falls back to its accent glow without a
 * visual, which reads as "launchable but unstylised".
 *
 * @param key - The `visualKey` from the contracts `App` shape, possibly nullish.
 * @returns A rendered React node, or `null` if no visual is registered.
 */
export function getVisual(key: string | null | undefined): ReactNode {
  if (!key) return null;
  const component = visualRegistry[key];
  if (!component) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn(`[shell] No visual registered for key "${key}"`);
    }
    return null;
  }
  return createElement(component);
}
