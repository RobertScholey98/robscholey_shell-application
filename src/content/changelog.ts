import type { Accent } from '@robscholey/shell-kit';

/** A single hand-edited entry in the cross-platform changelog strip. */
export interface ChangelogEntry {
  /** Stable key for React list reconciliation. */
  id: string;
  /** Accent applied to the leading dot. */
  accent: Accent;
  /** Originating app label — lowercase mono, e.g. `"portfolio"`. */
  app: string;
  /** The shipped-work summary. */
  message: string;
  /** Relative timestamp rendered verbatim, e.g. `"2d"`, `"5h"`, `"3w"`. */
  when: string;
}

/**
 * Hardcoded feed of the latest platform-wide activity. Kept static for now;
 * a future iteration may back this with a commits endpoint.
 */
export const changelog: ChangelogEntry[] = [
  {
    id: 'ds-v0-3',
    accent: 'teal',
    app: 'portfolio',
    message: 'Design system page — 7 accent variants, shadcn tokens.',
    when: '2d',
  },
  {
    id: 'admin-audit',
    accent: 'fsgb',
    app: 'admin',
    message: 'Audit log — per-session filter, CSV export.',
    when: '5h',
  },
  {
    id: 'shell-bus',
    accent: 'teal',
    app: 'shell',
    message: 'postMessage bus — typed envelope, origin allow-list.',
    when: '4d',
  },
  {
    id: 'template-scaffold',
    accent: 'mono',
    app: 'template',
    message: 'Scaffold: Next 15 + shell-kit + auth stub.',
    when: '3w',
  },
];
