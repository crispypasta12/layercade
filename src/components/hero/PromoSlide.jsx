import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { DEFAULT_ACCENT } from './slides';

/* Slow continuous drift while a slide is on screen, so a still image isn't
   dead for its whole dwell. Runs a little longer than ROTATE_MS so it never
   lands on the end of the ease. */
const KEN_BURNS_MS = 11000;

/* ─── Countdown ──────────────────────────────────────────────── */

function useCountdown(iso, active) {
  const target = iso ? new Date(iso).getTime() : null;
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!target || !active) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [target, active]);

  if (!target) return null;
  const ms = Math.max(0, target - now);
  if (ms === 0) return null;

  return {
    days:  Math.floor(ms / 86400000),
    hours: Math.floor((ms % 86400000) / 3600000),
    mins:  Math.floor((ms % 3600000) / 60000),
    secs:  Math.floor((ms % 60000) / 1000),
  };
}

function Unit({ value, label }) {
  return (
    <div className="text-center">
      <span className="font-headline text-3xl md:text-4xl text-white block leading-none tabular-nums">
        {String(value).padStart(2, '0')}
      </span>
      <span className="font-technical text-[9px] uppercase tracking-[0.2em] text-white/50">
        {label}
      </span>
    </div>
  );
}

function Countdown({ time }) {
  return (
    <div className="mt-6 flex items-center gap-5 md:gap-7">
      <Unit value={time.days}  label="Days" />
      <span className="font-headline text-2xl text-white/20 -mt-3">:</span>
      <Unit value={time.hours} label="Hrs" />
      <span className="font-headline text-2xl text-white/20 -mt-3">:</span>
      <Unit value={time.mins}  label="Min" />
      <span className="font-headline text-2xl text-white/20 -mt-3">:</span>
      <Unit value={time.secs}  label="Sec" />
    </div>
  );
}

/* ─── Copy block (shared by both layouts) ────────────────────── */

function Copy({ slide, time, shadowed }) {
  const shadow = shadowed ? 'drop-shadow-[0_2px_20px_rgba(0,0,0,0.85)]' : '';
  const accent = slide.accent ?? DEFAULT_ACCENT;

  return (
    <div className="max-w-xl">
      <div className="flex items-center gap-3">
        {slide.eyebrow && (
          <span
            className="text-black font-headline text-sm px-3 py-0.5 clip-parallelogram"
            style={{ backgroundColor: accent }}
          >
            {slide.eyebrow.toUpperCase()}
          </span>
        )}
        {slide.badge && (
          <span className="font-technical text-[10px] uppercase tracking-[0.2em] text-white/60">
            {slide.badge}
          </span>
        )}
      </div>

      <h2 className={`font-headline text-4xl sm:text-5xl md:text-6xl leading-[0.9] text-white mt-3 ${shadow}`}>
        {slide.title}
      </h2>

      {slide.body && (
        <p className={`font-body text-stone-300 mt-3 ${shadow}`}>{slide.body}</p>
      )}

      {time && <Countdown time={time} />}

      {slide.cta && (
        <div className="mt-7">
          <span
            className="clip-parallelogram bg-[#ff5500] text-white px-9 py-3 font-headline text-2xl
                       inline-flex items-center justify-center
                       group-hover:shadow-[0_0_30px_rgba(255,85,0,0.6)] transition-all"
          >
            {slide.cta.label}
          </span>
        </div>
      )}

      {slide.footnote && (
        <p className="mt-5 font-technical text-[9px] uppercase tracking-[0.15em] text-white/35">
          {slide.footnote}
        </p>
      )}
    </div>
  );
}

/* ─── Slide ──────────────────────────────────────────────────── */

export default function PromoSlide({ slide, active, eager }) {
  const time = useCountdown(slide.countdownTo, active);
  const reduceMotion = useReducedMotion();
  const fullBleed = slide.layout === 'full-bleed';

  const img = (
    <motion.img
      src={slide.image}
      alt={slide.imageAlt ?? ''}
      loading={eager ? 'eager' : 'lazy'}
      fetchPriority={eager ? 'high' : 'low'}
      decoding="async"
      initial={reduceMotion ? false : { scale: 1 }}
      animate={reduceMotion ? {} : { scale: active ? 1.07 : 1 }}
      transition={{ duration: KEN_BURNS_MS / 1000, ease: 'linear' }}
      className={
        fullBleed
          ? `absolute inset-0 w-full h-full object-cover ${slide.imagePosition ?? 'object-center'}`
          : `w-full h-full object-cover ${slide.imagePosition ?? 'object-center'}`
      }
    />
  );

  return (
    <Link
      to={slide.cta?.to ?? '/shop'}
      className="group relative block h-full w-full"
      aria-label={slide.cta?.label ?? slide.title}
    >
      {fullBleed ? (
        <>
          {img}
          <div className="absolute inset-0 bg-gradient-to-t from-[#080808] via-[#080808]/55 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#080808]/70 via-transparent to-transparent" />
          <div className="absolute inset-x-0 bottom-0">
            <div className="max-w-7xl mx-auto px-8 pb-10 md:pb-12">
              <Copy slide={slide} time={time} shadowed />
            </div>
          </div>
        </>
      ) : (
        <div className="h-full max-w-7xl mx-auto px-8 grid grid-cols-1 md:grid-cols-2 items-center gap-8 md:gap-12">
          <div className="relative h-[200px] md:h-[75%] overflow-hidden bg-[#161616] order-1">
            {img}
          </div>
          <div className="order-2">
            <Copy slide={slide} time={time} />
          </div>
        </div>
      )}
    </Link>
  );
}
