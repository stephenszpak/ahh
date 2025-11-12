import type { Analyzer } from '../types.js';

// Minimal heuristic analyzer: counts occurrences of keywords and size
export const defaultAnalyzer: Analyzer = (source: string) => {
  const components = (source.match(/<\w+[A-Z][^>]*>/g) || []).length;
  const islands = (source.match(/island|hydrate|use client/gi) || []).length;
  const bytes = Buffer.byteLength(source, 'utf8');
  return { components, islands, bytes };
};

