import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';

/* ─── Gallery Data ───────────────────────────────────────────── */

const GALLERY_ITEMS = [
  {
    id: 'g1',
    label:    'X-SERIES PROTOTYPE',
    title:    'VORTEX ENGINE HOUSING',
    meta:     'CARBON FIBER REINFORCED / 42HR PRINT',
    spanClass: 'hero-span',
    cat:      'Gaming',
    hero:     true,
  },
  {
    id: 'g2',
    label:    'UNIT_02',
    title:    'BIO-LATTICE STRUCTURE',
    meta:     '',
    spanClass: '',
    cat:      'Busts',
  },
  {
    id: 'g3',
    label:    'UNIT_03',
    title:    'MODULAR SENSOR HUB',
    meta:     '',
    spanClass: 'tall-span',
    cat:      'Gaming',
  },
  {
    id: 'g4',
    label:    'LIVE_PRINT',
    title:    'LASER SINTERING PROCESS',
    meta:     '',
    spanClass: '',
    cat:      'Decor',
    accent:   true,
  },
  {
    id: 'g5',
    label:    'AUTO_09',
    title:    'MANIFOLD ASSEMBLY',
    meta:     '',
    spanClass: '',
    cat:      'Cosplay',
  },
  {
    id: 'g6',
    label:    'ROBO_ARC',
    title:    'ARTICULATED JOINT V2',
    meta:     '',
    spanClass: '',
    cat:      'Busts',
  },
];

const FILTER_CATS = ['ALL', 'Gaming', 'Busts', 'Decor', 'Cosplay'];

/* ─── Component ──────────────────────────────────────────────── */

export default function Gallery() {
  const [active, setActive] = useState('ALL');

  const filtered =
    active === 'ALL' ? GALLERY_ITEMS : GALLERY_ITEMS.filter((g) => g.cat === active);

  return (
    <main className="pt-44 pb-24 px-8 max-w-7xl mx-auto">
      {/* Hero Title */}
      <motion.div
        className="flex flex-col md:flex-row md:items-end justify-between mb-16 gap-8"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <div className="max-w-2xl">
          <span className="font-technical text-[#ff5500] text-xs uppercase tracking-[0.3em] mb-4 block">
            Archive 001—2024
          </span>
          <h1 className="font-headline text-7xl md:text-9xl leading-none text-white">OUR WORK</h1>
        </div>

        {/* Filter Pills */}
        <div className="flex flex-wrap gap-3 md:pb-4">
          {FILTER_CATS.map((cat) => (
            <button
              key={cat}
              onClick={() => setActive(cat)}
              className={`font-technical text-[10px] px-4 py-1 flex items-center gap-2 transition-all uppercase ${
                active === cat
                  ? 'bg-[#ff5500] text-black'
                  : 'bg-[#161616] text-stone-400 hover:text-white'
              }`}
            >
              {active === cat && <span className="w-1 h-3 bg-black inline-block" />}
              {cat === 'ALL' ? 'ALL_UNITS' : cat}
            </button>
          ))}
        </div>
      </motion.div>

      <div className="signature-divider mb-16" />

      {/* Masonry Grid */}
      <motion.section
        key={active}
        className="masonry-grid"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4 }}
      >
        {filtered.map((item) => (
          <div
            key={item.id}
            className={`group relative overflow-hidden bg-[#161616] transition-all duration-500
                        hover:outline hover:outline-2 hover:outline-[#ff5500] hover:scale-[1.01]
                        cursor-pointer ${item.spanClass}`}
          >
            {/* Dark placeholder fill */}
            <div
              className={`absolute inset-0 transition-all duration-700 ${
                item.accent
                  ? 'bg-[#ff5500]/10 group-hover:bg-transparent'
                  : 'bg-stone-900/50'
              }`}
            />

            {/* Gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-[#080808] via-transparent to-transparent opacity-80" />

            {/* Subtle orange grid */}
            <div className="absolute inset-0 orange-grid opacity-30" />

            {/* Content */}
            {item.hero ? (
              <div className="absolute bottom-6 left-6 right-6">
                <span className="font-technical text-[10px] text-[#ff5500] mb-1 block">
                  {item.label}
                </span>
                <h3 className="font-headline text-3xl text-white">{item.title}</h3>
                <div className="flex justify-between items-center mt-4">
                  <p className="font-technical text-[10px] text-stone-500">{item.meta}</p>
                  <span className="material-symbols-outlined text-[#ff5500] group-hover:translate-x-2 transition-transform">
                    arrow_right_alt
                  </span>
                </div>
              </div>
            ) : (
              <div className="absolute bottom-4 left-4">
                <span className="font-technical text-[10px] text-[#ff5500]">{item.label}</span>
                <h3 className="font-headline text-xl text-white">{item.title}</h3>
              </div>
            )}
          </div>
        ))}
      </motion.section>

      {/* Tech Specs Footer */}
      <div className="mt-24 grid grid-cols-1 md:grid-cols-3 gap-12 border-t border-white/5 pt-12">
        <div className="space-y-4">
          <h4 className="font-technical text-[10px] text-stone-500 uppercase tracking-widest">
            Global Precision
          </h4>
          <p className="font-body text-stone-300 text-sm leading-relaxed">
            Our gallery showcases parts manufactured to tolerances of +/- 0.05mm. Each piece
            undergoes 5-point QA laser scanning before archiving.
          </p>
        </div>

        <div className="space-y-4">
          <h4 className="font-technical text-[10px] text-stone-500 uppercase tracking-widest">
            Material Science
          </h4>
          <p className="font-body text-stone-300 text-sm leading-relaxed">
            From high-carbon composites to flexible TPU, we push the thermal limits of polymer
            extrusion to deliver products that exceed spec.
          </p>
        </div>

        <div className="space-y-4">
          <h4 className="font-technical text-[10px] text-stone-500 uppercase tracking-widest">
            Inquire Archive
          </h4>
          <Link to="/quote" className="flex items-center gap-4 group/cta">
            <span className="font-headline text-4xl text-white group-hover/cta:text-[#ff5500] transition-colors">
              READY TO PRINT?
            </span>
            <span className="material-symbols-outlined text-[#ff5500] text-4xl group-hover/cta:translate-x-2 group-hover/cta:-translate-y-2 transition-transform">
              north_east
            </span>
          </Link>
        </div>
      </div>

      {/* REQUEST_FILES floating pill */}
      <div className="fixed bottom-8 right-28 z-[90] hidden md:block">
        <Link
          to="/quote"
          className="bg-[#ff5500] text-black font-technical text-[10px] tracking-widest
                     px-6 py-3 flex items-center gap-3
                     hover:shadow-[0_0_20px_rgba(255,85,0,0.4)] transition-all"
        >
          <span className="w-2 h-2 bg-black animate-pulse rounded-full" />
          REQUEST_FILES
        </Link>
      </div>
    </main>
  );
}
