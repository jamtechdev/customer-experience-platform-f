import { formatCellPct, formatProcessImprovementText, generalizeMisleadingJourneyThemeLabel, heatmapCellIntensityPct, reconcileHeatmapStageCounts, repairJourneyThemeDisplay, repairStaleActionText, repairWeakClusterCauseTitle, resolveHeatmapDisplayPct, resolveRootCauseIdsForProcessItem, finalizeProcessImprovementRows, finalizeActionPlanRows, isOwnerFallbackAction } from './drilldown-display';

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
    expect(repairStaleActionText(sprint, 'Product Reliability Concern')).toContain('defect-containment sprint');
    expect(repairStaleActionText(sprint, 'Product Reliability Concern')).not.toMatch(/run a product-reliability intervention/i);
  });

  it('expands bare generic cluster labels', () => {
    expect(repairWeakClusterCauseTitle('Product', 'buzdolabı soğutmuyor arıza')).toBe('Refrigerator Defects');
    expect(repairWeakClusterCauseTitle('Service', 'uzun çağrı merkezi bekleme')).toBe('Customer Service Delays');
  });

  it('unions brand-perception root-cause IDs for process-improvement drilldowns', () => {
    const ids = resolveRootCauseIdsForProcessItem(
      [
        {
          cause: 'Negative Brand Perception',
          interpretation: 'regret',
          feedbackIds: Array.from({ length: 194 }, (_, i) => i + 1),
        },
        {
          cause: 'Negative Brand Perception & Customer Dissatisfaction',
          interpretation: 'trust',
          feedbackIds: Array.from({ length: 51 }, (_, i) => i + 500),
        },
        { cause: 'Unfair Charges', interpretation: 'billing', feedbackIds: [900, 901] },
      ],
      {
        causeTheme: 'Negative Brand Perception Customer Dissatisfaction',
        quotedTheme: 'Negative Brand Perception Customer Dissatisfaction',
        index: 0,
        itemIds: [],
      }
    );
    expect(ids.length).toBe(245);
  });

  it('keeps process-improvement count aligned with resolvable IDs only', () => {
    const finalized = finalizeProcessImprovementRows([
      {
        priority: 'P1',
        action:
          "Assign a named owner to recurring 'Negative Brand Perception' complaints from the linked feedback — define an SLA.",
        causeTheme: 'Negative Brand Perception & Customer Dissatisfaction',
        interpretation: 'trust erosion',
        linkedFeedbackIds: Array.from({ length: 10 }, (_, i) => i + 1),
        linkedCount: 194,
      },
    ]);
    expect(finalized).toHaveLength(1);
    expect(finalized[0].linkedCount).toBe(10);
    expect(finalized[0].linkedFeedbackIds?.length).toBe(10);
    expect(isOwnerFallbackAction(finalized[0].action)).toBe(false);
    expect(formatProcessImprovementText(finalized[0].text, 10)).toContain('10 negative-linked');
  });

  it('generalizes misleading coffee-machine journey labels (Finding 7)', () => {
    expect(generalizeMisleadingJourneyThemeLabel('Coffee Machine Campaign & Brand Awareness')).not.toMatch(/coffee machine/i);
    const thin = repairJourneyThemeDisplay(
      'Product delivered within 48 hours (1 linked feedback row(s).)',
      1,
      'Delivery',
      'satisfaction',
      19
    );
    expect(thin).toMatch(/more data needed/i);
  });

  it('syncs impact clustered count with linked IDs after merge (client QA)', () => {
    const finalized = finalizeActionPlanRows([
      {
        priority: 'P1',
        action: 'Audit disputed vacuum cleaner Pricing Or Billing charges for "vacuum cleaner Pricing Or Billing Concern"',
        causeTheme: 'vacuum cleaner Pricing Or Billing Concern',
        interpretation: 'pricing',
        linkedFeedbackIds: Array.from({ length: 106 }, (_, i) => i + 1),
        linkedCount: 106,
        impact: '106 customer feedback row(s) clustered in this theme',
      },
      {
        priority: 'P2',
        action: 'Audit disputed vacuum cleaner Pricing Or Billing charges for "vacuum cleaner Pricing Or Billing Concern"',
        causeTheme: 'vacuum cleaner Pricing Or Billing Concern',
        interpretation: 'billing',
        linkedFeedbackIds: Array.from({ length: 12 }, (_, i) => i + 200),
        linkedCount: 12,
        impact: '12 customer feedback row(s) clustered in this theme',
      },
    ]);
    expect(finalized).toHaveLength(1);
    expect(finalized[0].linkedCount).toBe(118);
    expect(finalized[0].impact).toMatch(/118 customer feedback row\(s\) clustered/);
  });

  it('collapses near-identical callback and fridge-audit action pairs (client QA)', () => {
    const finalized = finalizeActionPlanRows([
      {
        priority: 'P1',
        action:
          'Create a priority callback queue for "refrigerator Customer Support Gap": answer escalations within 4 hours.',
        causeTheme: 'refrigerator Customer Support Gap',
        linkedFeedbackIds: Array.from({ length: 39 }, (_, i) => i + 1),
        linkedCount: 39,
      },
      {
        priority: 'P2',
        action:
          'Create a priority callback queue for "Unresponsive Customer Service and Support": answer escalations within 4 hours.',
        causeTheme: 'Unresponsive Customer Service and Support',
        linkedFeedbackIds: Array.from({ length: 18 }, (_, i) => i + 100),
        linkedCount: 18,
      },
      {
        priority: 'P2',
        action:
          'Audit refrigerator compressor and door-seal failure codes for "Product Defect in Refrigerators After Long Use": quarantine repeat-return batches.',
        causeTheme: 'Product Defect in Refrigerators After Long Use',
        linkedFeedbackIds: Array.from({ length: 28 }, (_, i) => i + 200),
        linkedCount: 28,
      },
      {
        priority: 'P3',
        action:
          'Audit refrigerator compressor and door-seal failure codes for "Refrigerator Reliability Issue": quarantine repeat-return batches.',
        causeTheme: 'Refrigerator Reliability Issue',
        linkedFeedbackIds: Array.from({ length: 16 }, (_, i) => i + 300),
        linkedCount: 16,
      },
    ]);
    expect(finalized).toHaveLength(2);
    expect(finalized.some((r) => /priority callback/i.test(r.action) && r.linkedCount === 57)).toBe(true);
    expect(finalized.some((r) => /audit refrigerator compressor/i.test(r.action) && r.linkedCount === 44)).toBe(true);
  });
});
