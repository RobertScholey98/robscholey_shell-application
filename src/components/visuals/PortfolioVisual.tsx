import { BarGrid } from '@robscholey/shell-kit/ui';

/**
 * Portfolio app-card identity visual — an animated seven-bar ascending ramp
 * over the card's accent, mirroring the handoff reference.
 */
export function PortfolioVisual() {
  return <BarGrid bars={[35, 55, 80, 100, 70, 50, 30]} animate />;
}
