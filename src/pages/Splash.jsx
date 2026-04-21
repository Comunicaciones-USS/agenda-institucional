import { useEffect, useState } from 'react';

export default function Splash({ onDone }) {
  const [hide, setHide] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setHide(true), 1200);
    const t2 = setTimeout(() => onDone(), 1700);
    return () => { clearTimeout(t); clearTimeout(t2); };
  }, [onDone]);

  return (
    <div className={`splash ${hide ? 'hide' : ''}`}>
      <div className="logo-badge">USS</div>
      <h1>Agenda</h1>
      <div className="subtitle">Institucional</div>
    </div>
  );
}
