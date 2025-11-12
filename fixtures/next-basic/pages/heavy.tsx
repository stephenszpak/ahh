import { useEffect, useState } from 'react';

function BigList() {
  const [sum, setSum] = useState(0);
  useEffect(() => {
    // do some client work
    const big = Array.from({ length: 5000 }, (_, i) => i).reduce((a, b) => a + b, 0);
    setSum(big);
    performance.mark('react-hydration');
  }, []);
  return (
    <ul>
      {Array.from({ length: 1000 }, (_, i) => (
        <li key={i}>Row {i}</li>
      ))}
      <li>Total: {sum}</li>
    </ul>
  );
}

export default function Heavy() {
  return (
    <main>
      <h1>Heavy Page</h1>
      <BigList />
    </main>
  );
}

