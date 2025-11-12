import { Project, SyntaxKind, ts } from 'ts-morph';
import fs from 'fs';
import path from 'path';
import type { FileReport, SignalScore } from '../types.js';

function createProject() {
  return new Project({
    useInMemoryFileSystem: true,
    skipAddingFilesFromTsConfig: true,
    compilerOptions: { jsx: ts.JsxEmit.ReactJSX }
  });
}

function getComponentNames(sourceText: string, fileName: string) {
  const project = createProject();
  const file = project.createSourceFile(fileName, sourceText, { overwrite: true });
  const names = new Set<string>();

  // function declarations
  for (const fn of file.getFunctions()) {
    const name = fn.getName();
    if (!name) continue;
    if (/^[A-Z]/.test(name)) {
      const returnsJsx = fn.getDescendantsOfKind(SyntaxKind.ReturnStatement).some((r: any) => {
        const expr = r.getExpression();
        return (
          !!expr &&
          [
            SyntaxKind.JsxElement,
            SyntaxKind.JsxSelfClosingElement,
            SyntaxKind.JsxFragment
          ].includes(expr.getKind())
        );
      });
      if (returnsJsx) names.add(name);
    }
  }

  // const Foo = () => <div />
  for (const v of file.getVariableDeclarations()) {
    const name = v.getName();
    if (!/^[A-Z]/.test(name)) continue;
    const init = v.getInitializer();
    if (!init) continue;
    const kind = init.getKind();
    if (kind === SyntaxKind.ArrowFunction || kind === SyntaxKind.FunctionExpression) {
      const fn: any = init;
      const returnsJsx = fn
        .getDescendantsOfKind(SyntaxKind.ReturnStatement)
        .some((r: any) => {
          const expr = r.getExpression();
          return (
            !!expr &&
            [
              SyntaxKind.JsxElement,
              SyntaxKind.JsxSelfClosingElement,
              SyntaxKind.JsxFragment
            ].includes(expr.getKind())
          );
        });
      if (returnsJsx) names.add(name);
    }
  }
  return Array.from(names);
}

function analyzeEffects(sourceText: string, fileName: string): SignalScore | undefined {
  const project = createProject();
  const file = project.createSourceFile(fileName, sourceText, { overwrite: true });
  const calls = file
    .getDescendantsOfKind(SyntaxKind.CallExpression)
    .filter((c: any) => {
      const expr = c.getExpression();
      return (
        (expr.getKind() === SyntaxKind.Identifier &&
          ['useEffect', 'useLayoutEffect'].includes(expr.getText())) ||
        (expr.getKind() === SyntaxKind.PropertyAccessExpression &&
          ['useEffect', 'useLayoutEffect'].includes((expr as any).getName?.()))
      );
    });

  if (calls.length === 0) return undefined;

  let stmtTotal = 0;
  const detail: string[] = [];
  for (const call of calls) {
    const firstArg = call.getArguments()[0];
    if (!firstArg) continue;
    if (
      firstArg.getKind() === SyntaxKind.ArrowFunction ||
      firstArg.getKind() === SyntaxKind.FunctionExpression
    ) {
      const body = (firstArg as any).getBody?.();
      if (body && body.getKind && body.getKind() === SyntaxKind.Block) {
        const stmts = body.getStatements();
        stmtTotal += stmts.length;
        detail.push(
          `${call.getExpression().getText()} at ${call.getStartLineNumber()}: ${stmts.length} statements`
        );
      } else {
        // expression-bodied effect
        stmtTotal += 1;
        detail.push(`${call.getExpression().getText()} at ${call.getStartLineNumber()}: expr body`);
      }
    }
  }

  return { score: stmtTotal, max: stmtTotal, detail };
}

function analyzeClientAPIs(sourceText: string, fileName: string): SignalScore | undefined {
  const project = createProject();
  const file = project.createSourceFile(fileName, sourceText, { overwrite: true });
  const globals = new Set(['window', 'document', 'navigator']);
  const detail: string[] = [];
  let count = 0;

  for (const id of file.getDescendantsOfKind(SyntaxKind.Identifier)) {
    const text = id.getText();
    if (!globals.has(text)) continue;
    // naive: treat all hits as client-only API usage
    count += 1;
    detail.push(`${text} at ${id.getStartLineNumber()}`);
  }
  if (count === 0) return undefined;
  return { score: count, max: count, detail };
}

function analyzeEventDensity(sourceText: string, fileName: string): SignalScore | undefined {
  const project = createProject();
  const file = project.createSourceFile(fileName, sourceText, { overwrite: true });
  const attrs = file.getDescendantsOfKind(SyntaxKind.JsxAttribute);
  const detail: string[] = [];
  let count = 0;
  for (const a of attrs) {
    const name = a.getNameNode().getText();
    if (/^on[A-Z]/.test(name)) {
      count += 1;
      detail.push(`${name} at ${a.getStartLineNumber()}`);
    }
  }
  if (count === 0) return undefined;
  return { score: count, max: count, detail };
}

function analyzeLargeLiteralProps(sourceText: string, fileName: string): SignalScore | undefined {
  const project = createProject();
  const file = project.createSourceFile(fileName, sourceText, { overwrite: true });
  const attrs = file.getDescendantsOfKind(SyntaxKind.JsxAttribute);
  const detail: string[] = [];
  let count = 0;
  for (const a of attrs) {
    const init = a.getInitializer();
    if (!init || !init.isKind?.(SyntaxKind.JsxExpression)) continue;
    const expr = (init as any).getExpression?.();
    if (!expr) continue;
    if (expr.isKind?.(SyntaxKind.ObjectLiteralExpression)) {
      const props = expr.getProperties();
      const textLen = expr.getText().length;
      if (props.length > 5 || textLen > 200) {
        count += 1;
        detail.push(
          `${a.getNameNode().getText()} object props=${props.length} len=${textLen} at ${a.getStartLineNumber()}`
        );
      }
    }
    if (expr.isKind?.(SyntaxKind.ArrayLiteralExpression)) {
      const elements = expr.getElements();
      const textLen = expr.getText().length;
      if (elements.length > 10 || textLen > 200) {
        count += 1;
        detail.push(
          `${a.getNameNode().getText()} array len=${elements.length} text=${textLen} at ${a.getStartLineNumber()}`
        );
      }
    }
  }
  if (count === 0) return undefined;
  return { score: count, max: count, detail };
}

const chartPkgs = [
  'chart.js',
  'recharts',
  'victory',
  'echarts',
  '@antv/g2',
  'd3',
  'apexcharts',
  'nivo',
  'visx'
];

function analyzeImportsAndBundle(sourceText: string, filePath: string): {
  bundle?: SignalScore;
  charts?: SignalScore;
} {
  const project = createProject();
  const file = project.createSourceFile(filePath, sourceText, { overwrite: true });
  let localBytes = 0;
  let localCount = 0;
  const detail: string[] = [];
  let chartCount = 0;
  const chartDetail: string[] = [];

  for (const imp of file.getImportDeclarations()) {
    const spec = imp.getModuleSpecifierValue();
    const isRelative = spec.startsWith('.') || spec.startsWith('/');
    if (isRelative) {
      const resolved = resolveLocalImport(filePath, spec);
      let size = 0;
      if (resolved) {
        try {
          const st = fs.statSync(resolved);
          size = st.size;
        } catch {}
      }
      localCount += 1;
      localBytes += size;
      detail.push(`local:${spec} => ${resolved || 'missing'} (${size} bytes)`);
    } else {
      detail.push(`pkg:${spec}`);
      if (chartPkgs.some((c) => spec === c || spec.includes(c.replace('@', '')))) {
        chartCount += 1;
        chartDetail.push(spec);
      }
    }
  }

  const bundle = localCount > 0 ? { score: localBytes, max: Math.max(localBytes, localCount), detail } : undefined;
  const charts = chartCount > 0 ? { score: chartCount, max: chartCount, detail: chartDetail } : undefined;
  return { bundle, charts };
}

function resolveLocalImport(fromFile: string, spec: string): string | undefined {
  const exts = ['.tsx', '.ts', '.jsx', '.js'];
  const base = spec.startsWith('.') ? path.resolve(path.dirname(fromFile), spec) : spec;
  const candidates = [base, ...exts.map((e) => base + e), ...exts.map((e) => path.join(base, 'index' + e))];
  for (const c of candidates) {
    if (fs.existsSync(c)) return c;
  }
  return undefined;
}

function analyzeContext(sourceText: string, fileName: string): SignalScore | undefined {
  const project = createProject();
  const file = project.createSourceFile(fileName, sourceText, { overwrite: true });
  const calls = file
    .getDescendantsOfKind(SyntaxKind.CallExpression)
    .filter((c: any) => {
      const expr = c.getExpression();
      return (
        expr.getKind() === SyntaxKind.Identifier &&
        ['createContext', 'useContext'].includes(expr.getText())
      );
    });
  const providers = file
    .getDescendantsOfKind(SyntaxKind.JsxOpeningElement)
    .filter((el: any) => /\.Provider$/.test(el.getTagNameNode().getText()));

  const count = calls.length + providers.length;
  if (count === 0) return undefined;
  const detail = [
    ...calls.map((c: any) => `${c.getExpression().getText()} at ${c.getStartLineNumber()}`),
    ...providers.map((p: any) => `${p.getTagNameNode().getText()} at ${p.getStartLineNumber()}`)
  ];
  return { score: count, max: count, detail };
}

export function analyzeFile(sourceText: string, filePath: string): FileReport {
  const fileName = filePath.endsWith('.tsx') || filePath.endsWith('.jsx') ? filePath : filePath + '.tsx';
  const componentNames = getComponentNames(sourceText, fileName);
  const effects = analyzeEffects(sourceText, fileName);
  const clientAPIs = analyzeClientAPIs(sourceText, fileName);
  const events = analyzeEventDensity(sourceText, fileName);
  const largeProps = analyzeLargeLiteralProps(sourceText, fileName);
  const imports = analyzeImportsAndBundle(sourceText, fileName);
  const context = analyzeContext(sourceText, fileName);

  return {
    file: filePath,
    componentNames,
    signals: {
      ...(effects ? { effectHeaviness: effects } : {}),
      ...(clientAPIs ? { clientOnlyAPIs: clientAPIs } : {}),
      ...(imports.bundle ? { bundleFootprint: imports.bundle } : {}),
      ...(imports.charts ? { eagerCharts: imports.charts } : {}),
      ...(events ? { eventDensity: events } : {}),
      ...(largeProps ? { largeLiteralProps: largeProps } : {}),
      ...(context ? { contextAtRoot: context } : {})
    }
  };
}
