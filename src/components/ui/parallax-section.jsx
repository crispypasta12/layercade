import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

/**
 * Parallax divider — sits between the hero and the trust bar.
 *
 * Uses fromTo so each layer is centred when the section is mid-screen, then
 * drifts above/below as the section scrolls in/out.
 * Background layers move less (slow), foreground layers move more (fast).
 *
 * Trigger spans 'top bottom' → 'bottom top' so the effect is visible
 * the entire time the section is anywhere on screen.
 */
export default function ParallaxSection() {
  const sectionRef = useRef(null);

  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;

    const sharedTrigger = {
      trigger: section,
      start: 'top bottom', // section top enters viewport bottom
      end:   'bottom top', // section bottom exits viewport top
      scrub: 0.6,
    };

    // fromTo keeps layers centred at the midpoint of the scroll window.
    // Larger range = faster / more foreground-like.
    const layers = [
      { sel: '[data-pl="1"]', from: -15, to: 15  }, // slowest — background watermark
      { sel: '[data-pl="2"]', from: -25, to: 25  }, // glow orb
      { sel: '[data-pl="3"]', from: -40, to: 40  }, // headline text
      { sel: '[data-pl="4"]', from: -55, to: 55  }, // fastest — grid overlay
    ];

    const ctx = gsap.context(() => {
      layers.forEach(({ sel, from, to }) => {
        const el = section.querySelector(sel);
        if (!el) return;
        gsap.fromTo(
          el,
          { yPercent: from },
          { yPercent: to, ease: 'none', scrollTrigger: sharedTrigger },
        );
      });

      // Ensure ScrollTrigger recalculates after React has painted
      ScrollTrigger.refresh();
    }, section);

    return () => ctx.revert();
  }, []);

  return (
    <section
      ref={sectionRef}
      className="relative h-[80vh] overflow-hidden bg-[#080808]"
      aria-hidden="true"
    >
      {/* Top fade — blends into hero above */}
      <div className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-[#080808] to-transparent pointer-events-none z-30" />

      {/* Bottom fade — blends into trust-bar below */}
      <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-[#111111] to-transparent pointer-events-none z-30" />

      {/* ── Layer 1 — SLOWEST: giant watermark ── */}
      <div
        data-pl="1"
        className="absolute inset-0 flex items-center justify-center select-none pointer-events-none"
      >
        <span
          className="font-headline leading-none text-white"
          style={{ fontSize: 'clamp(8rem, 22vw, 22rem)', opacity: 0.03 }}
        >
          LAYERCADE
        </span>
      </div>

      {/* ── Layer 2 — SLOW: orange ambient glow ── */}
      <div
        data-pl="2"
        className="absolute inset-0 flex items-center justify-center pointer-events-none"
      >
        <div
          className="rounded-full bg-[#ff5500]"
          style={{ width: '55vw', height: '55vw', filter: 'blur(140px)', opacity: 0.07 }}
        />
      </div>

      {/* ── Layer 3 — MEDIUM: central brand copy ── */}
      <div
        data-pl="3"
        className="absolute inset-0 flex items-center justify-center pointer-events-none"
      >
        <div className="text-center px-6">
          <p
            className="font-technical text-[#ff5500] uppercase tracking-[0.45em] mb-4"
            style={{ fontSize: '0.7rem' }}
          >
            Precision 3D Printing · Bangladesh
          </p>
          <h2
            className="font-headline text-white leading-[0.9] tracking-tighter"
            style={{ fontSize: 'clamp(3.5rem, 10vw, 9rem)' }}
          >
            EVERY LAYER<br />CRAFTED
          </h2>
          <div
            className="mx-auto mt-6"
            style={{
              height: 1,
              width: '6rem',
              background: 'linear-gradient(90deg, transparent, #ff5500, transparent)',
            }}
          />
        </div>
      </div>

      {/* ── Layer 4 — FASTEST: orange grid overlay ── */}
      <div
        data-pl="4"
        className="absolute inset-0 orange-grid pointer-events-none"
        style={{ opacity: 0.4 }}
      />
    </section>
  );
}
