import { formatCellPct, formatProcessImprovementText, heatmapCellIntensityPct, reconcileHeatmapStageCounts, repairStaleActionText, resolveHeatmapDisplayPct } from './drilldown-display';

describe('drilldown-display (QA Finding 3 & 4)', () => {
  it('shows decimal percentage for small non-zero shares (Finding 3)', () => {
    expect(formatCellPct(4, 2163)).toBe('0.2%');
    expect(formatCellPct(0, 2163)).toBe('0%');
    expect(formatCellPct(1, 19)).toBe('5%');
  });

  it('ignores stale backend "0%" when counts are non-zero (Finding 3)', () => {
    expect(resolveHeatmapDisplayPct(4, 2163, '0%')).toBe('0.2%');
    expect(resolveHeatmapDisplayPct(0, 2163, '0%')).toBe('0%');
    expect(resolveHeatmapDisplayPct(4, 2163, '0.2%')).toBe('0.2%');
    expect(resolveHeatmapDisplayPct(4, 2163, '5%')).toBe('0.2%');
  });

  it('reconciles stage total into neutral when sentiment split is missing', () => {
    const purchase = reconcileHeatmapStageCounts({
      total: 5,
      feedbackIds: [1, 2, 3, 4, 5],
    });
    expect(purchase.neutralCount).toBe(5);
    expect(purchase.positiveCount).toBe(0);
    expect(purchase.negativeCount).toBe(0);
  });

  it('derives heatmap intensity from counts, not rounded stored pct', () => {
    expect(heatmapCellIntensityPct(4, 2163, 0)).toBe(0.2);
    expect(heatmapCellIntensityPct(0, 2163, 0)).toBe(0);
  });

  it('preserves cluster-specific process improvement text (Finding 4)', () => {
    const specific =
      'Introduce a 48-hour repair-closure SLA for refrigerator service tickets (344 negative-linked row(s))';
    expect(formatProcessImprovementText(specific, 344)).toContain('48-hour repair-closure SLA');
    expect(formatProcessImprovementText(specific, 344)).not.toMatch(/^Run a focused sprint on/);
  });

  it('repairs legacy Address / sprint templates (Findings 2 & 4)', () => {
    const legacy = 'Address "refrigerator Service Resolution Gap" (344 linked feedback row(s)): —';
    const repaired = repairStaleActionText(
      legacy,
      'refrigerator Service Resolution Gap',
      'Warranty repair delays'
    );
    expect(repaired).toContain('48-hour repair-closure SLA');
    expect(repaired).not.toMatch(/^address\b/i);
    const sprint = 'Run a focused sprint on "Product Reliability Concern" (53 negative-linked row(s)): assign owner, define SLA, and track repeat-contact rate.';
    expect(repairStaleActionText(sprint, 'Product Reliability Concern')).toContain('product-reliability intervention');
  });
});
