import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FloatingPaths } from '@/components/ui/background-paths';
import { HERO_QUIP } from '../../lib/voice';

const TW_WORDS = ['KEYCAPS', 'DIORAMAS', 'DESK GEAR', 'ROOM DECOR', 'YOUR WEIRD IDEA'];

function useTypewriter(active) {
  const [text,    setText]    = useState('');
  const [wordIdx, setWordIdx] = useState(0);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!active) return;
    const word = TW_WORDS[wordIdx];
    let timer;
    if (!deleting) {
      if (text.length < word.length) {
        timer = setTimeout(() => setText(word.slice(0, text.length + 1)), 90);
      } else {
        timer = setTimeout(() => setDeleting(true), 1400);
      }
    } else {
      if (text.length > 0) {
        timer = setTimeout(() => setText(word.slice(0, text.length - 1)), 60);
      } else {
        // Deferred rather than set synchronously, so the effect doesn't
        // trigger a cascading render.
        timer = setTimeout(() => {
          setDeleting(false);
          setWordIdx((i) => (i + 1) % TW_WORDS.length);
        }, 200);
      }
    }
    return () => clearTimeout(timer);
  }, [text, wordIdx, deleting, active]);

  return text;
}

export default function BrandSlide({ active }) {
  const twText = useTypewriter(active);

  return (
    <div className="relative h-full w-full flex flex-col items-center justify-center orange-grid overflow-hidden">
      <div className="absolute inset-0 text-[#ff5500]">
        <FloatingPaths position={1} />
        <FloatingPaths position={-1} />
      </div>

      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#080808]/60 to-[#080808] pointer-events-none" />
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-72 h-72 bg-[#ff5500] blur-[140px] opacity-15 pointer-events-none" />

      <div className="relative z-20 text-center px-6">
        <h1 className="font-headline text-5xl md:text-7xl leading-none tracking-tighter text-white">
          PRECISION.<br />LAYER BY LAYER.
        </h1>

        <div
          className="font-technical text-sm md:text-2xl mt-4 flex items-center justify-center gap-2
                     tracking-[0.15em] md:tracking-[0.2em] uppercase whitespace-nowrap"
        >
          <span style={{ color: '#555' }}>NOW PRINTING:</span>
          <span className="inline-block min-w-[15ch] text-left text-[#ff5500] font-bold typewriter-cursor">
            {twText}
          </span>
        </div>

        <div className="flex flex-row gap-3 md:gap-6 mt-8 justify-center">
          <Link
            to="/shop"
            className="clip-parallelogram bg-[#ff5500] text-white px-7 py-3 md:px-12 md:py-4 font-headline text-xl md:text-3xl
                       hover:shadow-[0_0_30px_rgba(255,85,0,0.5)] transition-all flex items-center justify-center"
          >
            Shop Now
          </Link>
          <Link
            to="/quote"
            className="clip-parallelogram border-2 border-orange-500/50 text-orange-500 bg-orange-500/5
                       px-6 py-3 md:px-10 md:py-4 font-headline text-xl md:text-2xl hover:bg-orange-500/10 transition-all
                       flex items-center justify-center"
          >
            Get a Quote
          </Link>
        </div>

        <p className="mt-6 font-technical text-[10px] text-stone-600 tracking-[0.1em]">
          {HERO_QUIP}
        </p>
      </div>
    </div>
  );
}
