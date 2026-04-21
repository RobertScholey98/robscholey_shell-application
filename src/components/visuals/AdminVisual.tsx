import { AsciiPanel } from '@robscholey/shell-kit/ui';

/**
 * Admin app-card identity visual — a compact ASCII pane listing the four
 * admin surfaces. Sits inside the card's existing visual slot with no
 * self-framing.
 */
export function AdminVisual() {
  return (
    <AsciiPanel>
      {`┌────────────┐
│ users   [·]│
│ codes   [·]│
│ apps    [·]│
│ audit   [ ]│
└────────────┘`}
    </AsciiPanel>
  );
}
