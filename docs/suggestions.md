# AHX Suggestions

Guidance generated from static analysis to reduce client hydration cost. Each suggestion lists rationale and a sketch of a fix.

- Defer Effects: Heavy `useEffect`/`useLayoutEffect` bodies can block interactivity. Move non-critical work into `requestIdleCallback`, `setTimeout`, or trigger after first interaction.

  Example:
  Before:
  ```tsx
  useEffect(() => {
    expensiveCompute(); // 20ms+
  }, []);
  ```
  After:
  ```tsx
  useEffect(() => {
    const id = requestIdleCallback(() => expensiveCompute());
    return () => cancelIdleCallback(id);
  }, []);
  ```

- Isolate Client Only Logic: Direct `window`/`document`/`navigator` access disables SSR/streaming. Guard with `typeof window !== 'undefined'` and isolate in client-only components.

  ```tsx
  if (typeof window !== 'undefined') {
    console.log(window.location.href);
  }
  ```

- Reduce Event Handlers: Many inline handlers increase re-render cost. Prefer memoized handlers or event delegation.

  ```tsx
  const onClick = useCallback(() => doThing(), []);
  return <button onClick={onClick} />;
  ```

- Memoize Large Props: Large object/array literals as props thrash referential equality and increase bundle size. Extract constants or memoize with `useMemo`.

  ```tsx
  const columns = useMemo(() => ([/* big array */]), []);
  return <Table columns={columns} />;
  ```

- Split Bundle: Large local modules should be code-split.

  ```tsx
  const Heavy = lazy(() => import('./Heavy'));
  ```

- Code Split Charts: Charting libraries are heavy; load lazily, on demand, or render server-side.

  ```tsx
  const Chart = dynamic(() => import('recharts').then(m => m.LineChart), { ssr: false });
  ```

- Move Context Down: Broad provider scope triggers wide re-renders. Wrap only the subtree that needs the context.

  ```tsx
  // Instead of wrapping <App/>, wrap the page/section that uses it
  <SectionProvider><Section/></SectionProvider>
  ```

