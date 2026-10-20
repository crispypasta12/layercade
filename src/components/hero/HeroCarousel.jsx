import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { BRAND_SLIDE, DEFAULT_ACCENT } from './slides';
import { fetchLiveSlides } from '../../lib/promos';
import BrandSlide from './BrandSlide';
import PromoSlide from './PromoSlide';

const ROTATE_MS = 7500;
const SWIPE_THRESHOLD = 50;

/* Auto-rotation is desktop-only: on a phone it fights the thumb. */
function useIsMobile() {
  const [isMobile, setIsMobile] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(max-width: 767px)').matches,
  );
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)');
    const onChange = (e) => setIsMobile(e.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);
  return isMobile;
}

/* ─── Trust strip — persistent, never rotates away ───────────── */
const TRUST = [
  { stat: 'Cash',          label: 'On Delivery' },
  { stat: 'Free Delivery', label: 'Over 1,000৳ in Dhaka' },
  { stat: '3–5 Days',      label: 'Turnaround' },
  { stat: 'Custom',        label: 'Orders' },
];

function TrustStrip() {
  return (
    <div className="relative z-20 px-8 pb-10 pt-2">
      <div className="max-w-7xl mx-auto grid grid-cols-2 gap-y-4 sm:flex sm:flex-wrap items-center justify-center sm:gap-x-8 sm:gap-y-3">
        {TRUST.map(({ stat, label }, i) => (
          <div key={label} className="flex items-center justify-center gap-4">
            <div className="text-center">
              <span className="font-headline text-xl text-white block leading-none">{stat}</span>
              <span className="font-technical text-[9px] uppercase tracking-[0.2em] text-stone-500">
                {label}
              </span>
            </div>
            {i < TRUST.length - 1 && (
              <span className="text-white/10 font-technical select-none hidden sm:block">|</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── Carousel ───────────────────────────────────────────────── */

export default function HeroCarousel() {
  /* The brand slide is always first and always present — it ships in the
     bundle, so the hero renders instantly and never depends on the network.
     Promo slides arrive after and simply extend the array. */
  const [promoSlides, setPromoSlides] = useState([]);
  const slides = [BRAND_SLIDE, ...promoSlides];

  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);   // explicit pause button
  const [hovered, setHovered] = useState(false); // hover / focus
  const [locked, setLocked] = useState(false);   // user picked a slide — stop forever

  const reduceMotion = useReducedMotion();
  const isMobile = useIsMobile();
  const touchX = useRef(null);

  useEffect(() => {
    let active = true;
    fetchLiveSlides().then((s) => { if (active) setPromoSlides(s); });
    return () => { active = false; };
  }, []);

  const autoRotates =
    slides.length > 1 && !paused && !hovered && !locked && !isMobile && !reduceMotion;

  useEffect(() => {
    if (!autoRotates) return;
    const id = setTimeout(() => setIndex((i) => (i + 1) % slides.length), ROTATE_MS);
    return () => clearTimeout(id);
  }, [index, autoRotates, slides.length]);

  const goTo = useCallback((i) => {
    setIndex((i + slides.length) % slides.length);
    setLocked(true); // they told us what they want — stop auto-advancing
  }, [slides.length]);

  /* Swipe (mobile advances only this way) */
  const onTouchStart = (e) => { touchX.current = e.touches[0].clientX; };
  const onTouchEnd = (e) => {
    if (touchX.current === null) return;
    const dx = e.changedTouches[0].clientX - touchX.current;
    if (Math.abs(dx) > SWIPE_THRESHOLD) goTo(index + (dx < 0 ? 1 : -1));
    touchX.current = null;
  };

  const onKeyDown = (e) => {
    if (e.key === 'ArrowRight') { e.preventDefault(); goTo(index + 1); }
    if (e.key === 'ArrowLeft')  { e.preventDefault(); goTo(index - 1); }
  };

  const slide = slides[index];

  return (
    <section
      className="relative bg-[#080808] pt-[calc(36px+80px)]"
      aria-roledescription="carousel"
      aria-label="Featured"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocusCapture={() => setHovered(true)}
      onBlurCapture={() => setHovered(false)}
    >
      {/* ── Stage ── */}
      <div
        className="relative h-[540px] md:h-[520px] overflow-hidden outline-none"
        tabIndex={0}
        role="group"
        aria-label={`Slide ${index + 1} of ${slides.length}`}
        onKeyDown={onKeyDown}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={slide.id}
            className="absolute inset-0"
            initial={reduceMotion ? false : { opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={reduceMotion ? { opacity: 0 } : { opacity: 0, x: -24 }}
            transition={{ duration: reduceMotion ? 0 : 0.5, ease: 'easeOut' }}
          >
            {slide.kind === 'brand' ? (
              <BrandSlide active />
            ) : (
              <PromoSlide slide={slide} active eager={index === 0} />
            )}
          </motion.div>
        </AnimatePresence>

        {/* Slide number — same treatment as the Collections rail tiles */}
        <div className="pointer-events-none absolute inset-x-0 top-0 z-30">
          <div className="max-w-7xl mx-auto px-8 pt-7">
            <span className="font-technical text-xs text-white/40">
              {String(index + 1).padStart(2, '0')}
            </span>
          </div>
        </div>
      </div>

      {/* ── Controls ── */}
      {slides.length > 1 && (
        <div className="relative z-20 flex items-center justify-center gap-3 py-5">
          <button
            type="button"
            onClick={() => setPaused((p) => !p)}
            aria-label={paused || locked ? 'Play slideshow' : 'Pause slideshow'}
            className="w-8 h-8 flex items-center justify-center text-stone-500 hover:text-[#ff5500] transition-colors"
          >
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
              {paused || locked ? 'play_arrow' : 'pause'}
            </span>
          </button>

          <div className="flex items-center gap-2">
            {slides.map((s, i) => (
              <button
                key={s.id}
                type="button"
                onClick={() => goTo(i)}
                aria-label={`Go to slide ${i + 1}`}
                aria-current={i === index}
                style={
                  i === index
                    ? { backgroundColor: s.accent ?? DEFAULT_ACCENT }
                    : undefined
                }
                className={`h-2 transition-all duration-300 ${
                  i === index ? 'w-7' : 'w-2 bg-white/20 hover:bg-white/40'
                }`}
              />
            ))}
          </div>
        </div>
      )}

      <TrustStrip />

      {/* Separates the hero from Collections without a grey rule */}
      <div className="signature-divider opacity-30" />
    </section>
  );
}
