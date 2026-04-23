import { useEffect, useState } from 'react';
import Logo from '../components/Logo';

export default function Splash({ onDone }) {
  const [hide, setHide] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setHide(true), 1200);
    const t2 = setTimeout(() => onDone(), 1700);
    return () => { clearTimeout(t); clearTimeout(t2); };
  }, [onDone]);

  return (
    <div className={`splash ${hide ? 'hide' : ''}`}>
      <Logo variant="light" size="xl" />
      <h1>Agenda</h1>
      <div className="subtitle">Institucional</div>
    </div>
  );
}
