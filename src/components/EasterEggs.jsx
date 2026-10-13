import { useEffect, useState } from 'react';
import { AWAY_TITLES, SPAGHETTI_MODE, pick } from '../lib/voice';

const KONAMI = [
  'ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown',
  'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a',
];
const SPAGHETTI_MS = 4000;

export default function EasterEggs() {
  const [spaghetti, setSpaghetti] = useState(false);

  /* Tab title changes while the visitor is away, restored on return */
  useEffect(() => {
    let savedTitle = null;
    const onVisibility = () => {
      if (document.hidden) {
        savedTitle = document.title;
        document.title = pick(AWAY_TITLES);
      } else if (savedTitle !== null) {
        document.title = savedTitle;
        savedTitle = null;
      }
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, []);

  /* Konami code → spaghetti mode */
  useEffect(() => {
    let progress = 0;
    const onKey = (e) => {
      const tag = e.target?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      const key = e.key.length === 1 ? e.key.toLowerCase() : e.key;
      progress = key === KONAMI[progress] ? progress + 1 : key === KONAMI[0] ? 1 : 0;
      if (progress === KONAMI.length) {
        progress = 0;
        setSpaghetti(true);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    if (!spaghetti) return undefined;
    document.body.classList.add('spaghetti-mode');
    const id = setTimeout(() => setSpaghetti(false), SPAGHETTI_MS);
    return () => {
      clearTimeout(id);
      document.body.classList.remove('spaghetti-mode');
    };
  }, [spaghetti]);

  if (!spaghetti) return null;

  return (
    <div
      role="status"
      className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[300] bg-[#ff5500] text-black
                 font-technical text-[10px] font-bold uppercase tracking-[0.2em] px-6 py-3
                 max-w-[90vw] text-center"
    >
      {SPAGHETTI_MODE}
    </div>
  );
}
