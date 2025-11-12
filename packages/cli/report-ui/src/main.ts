async function load() {
  const res = await fetch('/report.json');
  const report = await res.json();
  const el = document.getElementById('app')!;
  el.innerHTML = '';

  const routesTable = document.createElement('table');
  routesTable.innerHTML = `
    <caption><h2>Routes</h2></caption>
    <thead><tr><th>Route</th><th>Score</th><th>LCP</th><th>TBT</th><th>CLS</th><th>JS bytes</th></tr></thead>
    <tbody></tbody>
  `;
  for (const r of report.routes) {
    const tr = document.createElement('tr');
    tr.innerHTML = `<td>${r.route}</td><td>${r.score ?? '-'}</td><td>${fmt(r.metrics?.lcp)}</td><td>${fmt(r.metrics?.tbt)}</td><td>${fmt(r.metrics?.cls)}</td><td>${fmt(r.metrics?.jsBytes)}</td>`;
    routesTable.querySelector('tbody')!.appendChild(tr);
  }
  el.appendChild(routesTable);

  const filesTable = document.createElement('table');
  filesTable.innerHTML = `
    <caption><h2>Components</h2></caption>
    <thead><tr><th>File</th><th>Score</th><th>Signals</th><th>Suggestions</th></tr></thead>
    <tbody></tbody>
  `;
  for (const f of report.files) {
    const signals = Object.keys(f.signals || {}).join(', ');
    const suggestions = (f.suggestions || []).map((s: any) => s.kind).join(', ');
    const tr = document.createElement('tr');
    tr.innerHTML = `<td>${f.file}</td><td>${f.score ?? '-'}</td><td class="muted">${signals}</td><td>${suggestions}</td>`;
    filesTable.querySelector('tbody')!.appendChild(tr);
  }
  el.appendChild(filesTable);
}

function fmt(v: any) { return typeof v === 'number' ? v.toFixed(2) : '-'; }
load();

