import type { FileReport, RouteMetrics, Suggestion, SuggestionKind } from '../types.js';

const SIGNAL_WEIGHTS: Record<string, number> = {
  effectHeaviness: 1.0,
  clientOnlyAPIs: 1.0,
  bundleFootprint: 1.2,
  eventDensity: 0.8,
  eagerCharts: 1.4,
  largeLiteralProps: 1.0,
  contextAtRoot: 0.6
};

export function computeHotspotScore(
  fileReport: FileReport,
  routeMetrics?: Partial<RouteMetrics>
): number {
  let score = 0;

  // Static signals contribute based on normalized score/max and a weight
  for (const [sig, val] of Object.entries(fileReport.signals)) {
    if (!val) continue;
    const w = SIGNAL_WEIGHTS[sig] ?? 1;
    const norm = val.max > 0 ? Math.min(1, val.score / val.max) : 0;
    // emphasize absolute magnitude slightly as well
    score += w * (norm * 7 + Math.min(3, Math.log10(val.score + 1))); // cap influence
  }

  // Route metrics can amplify static risk
  if (routeMetrics) {
    const { lcp, tbt, cls, jsBytes } = routeMetrics;
    if (typeof lcp === 'number') score += Math.min(4, lcp / 2000); // 2s -> +1, up to +4
    if (typeof tbt === 'number') score += Math.min(4, tbt / 300); // 300ms -> +1, up to +4
    if (typeof cls === 'number') score += Math.min(2, cls / 0.1); // 0.1 -> +1, up to +2
    if (typeof jsBytes === 'number') score += Math.min(4, jsBytes / (150 * 1024)); // 150KB -> +1
  }

  // Clamp and round to one decimal for stability
  return Math.round(Math.min(20, score) * 10) / 10;
}

export function suggestFixes(fileReport: FileReport): Suggestion[] {
  const out: Suggestion[] = [];
  const s = fileReport.signals;
  const isClient = !!fileReport.isClientComponent;

  if (isClient && s.effectHeaviness && s.effectHeaviness.score >= 5) {
    out.push(suggestion('deferEffects', 'Split heavy effects and defer non-critical work', s.effectHeaviness.detail));
  }
  if (isClient && s.clientOnlyAPIs && s.clientOnlyAPIs.score >= 1) {
    out.push(
      suggestion(
        'isolateClientOnlyLogic',
        'Guard window/document access and move to client-only boundaries',
        s.clientOnlyAPIs.detail
      )
    );
  }
  if (isClient && s.eventDensity && s.eventDensity.score >= 5) {
    out.push(
      suggestion('reduceEventHandlers', 'Consolidate or memoize dense event handlers', s.eventDensity.detail)
    );
  }
  if (isClient && s.largeLiteralProps && s.largeLiteralProps.score >= 1) {
    out.push(
      suggestion(
        'memoizeLargeProps',
        'Memoize or extract large object/array literals passed as props',
        s.largeLiteralProps.detail
      )
    );
  }
  if (s.bundleFootprint && s.bundleFootprint.score >= 1) {
    out.push(
      suggestion(
        'splitBundle',
        'Consider dynamic import for heavy local modules on this route',
        s.bundleFootprint.detail
      )
    );
  }
  if (isClient && s.eagerCharts && s.eagerCharts.score >= 1) {
    out.push(
      suggestion(
        'codeSplitCharts',
        'Load charting libs lazily or on server; avoid eager client import',
        s.eagerCharts.detail
      )
    );
  }
  if (s.contextAtRoot && s.contextAtRoot.score >= 2) {
    out.push(
      suggestion(
        'moveContextDown',
        'Narrow provider scope to reduce render propagation',
        s.contextAtRoot.detail
      )
    );
  }

  return out;
}

function suggestion(kind: SuggestionKind, message: string, related?: string[]): Suggestion {
  return { kind, message, related };
}

export default { computeHotspotScore, suggestFixes };
