export interface HydrationMetric {
  components: number;
  islands: number;
  bytes: number;
}

export interface ScanResult {
  files: number;
  metrics: HydrationMetric;
  byFile: Array<{ path: string; metrics: Partial<HydrationMetric> }>;
}

export type Analyzer = (source: string, path?: string) => Partial<HydrationMetric>;

// Signal-based analysis types
export type Signal =
  | 'effectHeaviness'
  | 'clientOnlyAPIs'
  | 'bundleFootprint'
  | 'eventDensity'
  | 'eagerCharts'
  | 'largeLiteralProps'
  | 'contextAtRoot';

export type SignalScore = { score: number; max: number; detail: string[] };

export type FileReport = {
  file: string;
  componentNames: string[];
  signals: Partial<Record<Signal, SignalScore>>;
};

// Runtime audit types
export type RouteMetrics = {
  lcp?: number;
  tbt?: number;
  cls?: number;
  jsBytes?: number;
  hydrationMarks?: string[];
};

export type RouteReport = {
  route: string;
  url: string;
  metrics: RouteMetrics;
  artifactsPath: string;
};

// Suggestions produced from static analysis
export type SuggestionKind =
  | 'deferEffects'
  | 'isolateClientOnlyLogic'
  | 'reduceEventHandlers'
  | 'memoizeLargeProps'
  | 'splitBundle'
  | 'codeSplitCharts'
  | 'moveContextDown';

export type Suggestion = {
  kind: SuggestionKind;
  message: string;
  related?: string[];
};
