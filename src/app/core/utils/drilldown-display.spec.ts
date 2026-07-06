import { formatCellPct, formatProcessImprovementText } from './drilldown-display';

describe('drilldown-display (QA Finding 3 & 4)', () => {
  it('shows decimal percentage for small non-zero shares (Finding 3)', () => {
    expect(formatCellPct(4, 2163)).toBe('0.2%');
    expect(formatCellPct(0, 2163)).toBe('0%');
    expect(formatCellPct(1, 19)).toBe('5%');
  });

  it('preserves cluster-specific process improvement text (Finding 4)', () => {
    const specific =
      'Introduce a 48-hour repair-closure SLA for refrigerator service tickets (344 negative-linked row(s))';
    expect(formatProcessImprovementText(specific, 344)).toContain('48-hour repair-closure SLA');
    expect(formatProcessImprovementText(specific, 344)).not.toMatch(/^Run a focused sprint on/);
  });
});
