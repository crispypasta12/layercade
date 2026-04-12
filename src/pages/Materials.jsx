import { useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import { Link } from 'react-router-dom';

/* ─── Material Data ──────────────────────────────────────────── */

const MATERIALS = [
  {
    id:       'pla',
    name:     'PLA',
    title:    'Polylactic Acid (PLA)',
    status:   'IN STOCK',
    category: 'STANDARD',
    desc:     'The cornerstone of desktop manufacturing. Sourced from renewable starches, Layercade PLA offers exceptional dimensional accuracy and a high-quality matte finish for prototyping and visual models.',
    bestFor:  ['Prototypes', 'Display Models', 'Cosplay Props', 'Figurines'],
    props: [
      { label: 'STRENGTH',    value: 55, display: 'MODERATE' },
      { label: 'HEAT RESIST', value: 30, display: '50°C'     },
      { label: 'PRECISION',   value: 88, display: '±0.05mm'  },
    ],
    reverse:  false,
    bgPos:    '-bottom-10 left-0',
  },
  {
    id:       'petg',
    name:     'PETG',
    title:    'PETG (Engineering)',
    status:   'HIGH DEMAND',
    category: 'ENGINEERING',
    desc:     'The workhorse of industrial components. PETG combines the ease of PLA with the durability and chemical resistance of ABS. Perfect for functional housings and mechanical assemblies.',
    bestFor:  ['Functional Parts', 'Mechanical Housings', 'Outdoor Components', 'Enclosures'],
    props: [
      { label: 'STRENGTH',    value: 80, display: 'HIGH'       },
      { label: 'HEAT RESIST', value: 55, display: '80°C'       },
      { label: 'FLEXIBILITY', value: 40, display: 'SEMI-RIGID' },
    ],
    reverse:  true,
    bgPos:    '-top-10 right-0',
  },
  {
    id:       'tpu',
    name:     'TPU',
    title:    'Thermoplastic Polyurethane',
    status:   'SPECIALTY',
    category: 'FLEXIBLE',
    desc:     'The rubber-like solution for vibration dampening, seals, and ergonomic grips. Our high-shore TPU maintains memory after compression and is resistant to abrasion and impact.',
    bestFor:  ['Gaskets & Seals', 'Ergonomic Grips', 'Vibration Dampeners', 'Wearables'],
    props: [
      { label: 'SHORE HARD', value: 68, display: '95A'       },
      { label: 'ELONGATION', value: 90, display: '450%'      },
      { label: 'VIBE DAMP',  value: 95, display: 'EXCELLENT' },
    ],
    reverse:  false,
    bgPos:    '-bottom-10 right-0',
  },
  {
    id:       'resin',
    name:     'RESIN',
    title:    'Ultra Detail Resin',
    status:   'ULTRA-DETAIL',
    category: 'PHOTOPOLYMER',
    desc:     'Where micron-level precision is mandatory. Our SLA/DLP resins produce isotropic parts with surface finishes that rival injection molding. Ideal for jewelry, dental, and high-fidelity miniatures.',
    bestFor:  ['Jewelry', 'Dental Models', 'Miniatures', 'High-Fidelity Parts'],
    props: [
      { label: 'LAYER HEIGHT', value: 98, display: '0.025mm' },
      { label: 'SURFACE QUAL', value: 95, display: 'SMOOTH'  },
      { label: 'ACCURACY',     value: 99, display: 'MICRON'  },
    ],
    reverse:  true,
    bgPos:    '-bottom-10 left-0',
  },
];

/* ─── Comparison Metrics ─────────────────────────────────────── */

const COMPARE_METRICS = [
  { label: 'STRENGTH',        pla: 55, petg: 80, tpu: 40, resin: 60 },
  { label: 'HEAT RESISTANCE', pla: 30, petg: 55, tpu: 45, resin: 35 },
  { label: 'FLEXIBILITY',     pla: 10, petg: 35, tpu: 95, resin:  5 },
  { label: 'SURFACE FINISH',  pla: 70, petg: 65, tpu: 58, resin: 98 },
  { label: 'PRINTABILITY',    pla: 95, petg: 80, tpu: 60, resin: 85 },
];

/* ─── Animation Variants ─────────────────────────────────────── */

const fadeUp = { hidden: { opacity: 0, y: 40 }, show: { opacity: 1, y: 0 } };

/* ─── Animated Property Bar ──────────────────────────────────── */

function AnimatedBar({ value, label, display, delay = 0 }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-50px' });

  return (
    <div ref={ref} className="mb-5 last:mb-0">
      <div className="flex justify-between items-baseline font-technical mb-2">
        <span className="text-[10px] text-stone-500 uppercase tracking-widest">{label}</span>
        <span className="text-xs text-[#ff5500]">{display}</span>
      </div>
      <div className="h-[2px] bg-white/10 relative overflow-hidden">
        <motion.div
          className="absolute inset-y-0 left-0 h-full bg-[#ff5500]"
          initial={{ width: 0 }}
          animate={{ width: inView ? `${value}%` : 0 }}
          transition={{ duration: 1, ease: 'easeOut', delay }}
        />
      </div>
    </div>
  );
}

/* ─── Comparison Table Row ───────────────────────────────────── */

function CompareRow({ metric, odd }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-30px' });
  const matIds = ['pla', 'petg', 'tpu', 'resin'];

  return (
    <div
      ref={ref}
      className={`grid grid-cols-[120px_repeat(4,_minmax(0,_1fr))] gap-4 py-4 ${odd ? 'bg-white/[0.02]' : ''}`}
    >
      <div className="font-technical text-[10px] text-stone-500 uppercase tracking-widest self-center">
        {metric.label}
      </div>
      {matIds.map((id, i) => (
        <div key={id} className="flex flex-col gap-1.5 justify-center px-1">
          <div className="h-[2px] bg-white/10 relative overflow-hidden">
            <motion.div
              className="absolute inset-y-0 left-0 h-full bg-[#ff5500]"
              initial={{ width: 0 }}
              animate={{ width: inView ? `${metric[id]}%` : 0 }}
              transition={{ duration: 0.9, ease: 'easeOut', delay: i * 0.08 }}
            />
          </div>
          <span className="font-technical text-[9px] text-stone-600 text-center tabular-nums">
            {metric[id]}
          </span>
        </div>
      ))}
    </div>
  );
}

/* ─── Component ──────────────────────────────────────────────── */

export default function Materials() {
  const scrollTo = (id) =>
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });

  return (
    <main className="pt-40 pb-24">

      {/* ── Page Title ── */}
      <section className="px-8 md:px-12 mb-16 text-center md:text-left">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <h1 className="font-headline text-7xl md:text-9xl text-white tracking-tighter leading-none mb-4">
            MATERIALS
          </h1>
          <p className="font-technical text-[#ff5500] text-sm uppercase tracking-widest">
            [ ENGINEERING SPECIFICATIONS V.4.0 ]
          </p>
        </motion.div>
      </section>

      {/* ── Material Selector ── */}
      <motion.section
        className="px-8 md:px-12 mb-20"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.25 }}
      >
        <div className="flex items-center gap-4 mb-6">
          <div className="h-px flex-1 bg-white/10" />
          <span className="font-technical text-[10px] text-stone-500 uppercase tracking-widest whitespace-nowrap">
            // FIND YOUR MATERIAL //
          </span>
          <div className="h-px flex-1 bg-white/10" />
        </div>
        <div className="flex flex-wrap gap-3 justify-center md:justify-start">
          {MATERIALS.map((mat) => (
            <button
              key={mat.id}
              onClick={() => scrollTo(mat.id)}
              className="clip-parallelogram border border-white/20 text-white font-headline
                         px-10 py-2 text-lg hover:border-[#ff5500] hover:text-[#ff5500]
                         transition-all duration-300"
            >
              {mat.name}
            </button>
          ))}
        </div>
      </motion.section>

      {/* ── Comparison Table ── */}
      <motion.section
        className="px-4 md:px-8 mb-20 max-w-[1600px] mx-auto"
        variants={fadeUp}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, margin: '-60px' }}
        transition={{ duration: 0.6 }}
      >
        <div className="flex items-center gap-4 mb-6 px-2">
          <span className="font-technical text-[10px] text-stone-500 uppercase tracking-widest whitespace-nowrap">
            // MATERIAL COMPARISON //
          </span>
          <div className="h-px flex-1 bg-white/10" />
        </div>

        <div className="bg-[#111111] p-6 md:p-8 overflow-x-auto">
          {/* Header row */}
          <div className="grid grid-cols-[120px_repeat(4,_minmax(0,_1fr))] gap-4 mb-6 pb-6 border-b border-white/5 min-w-[540px]">
            <div className="font-technical text-[10px] text-stone-600 uppercase tracking-widest self-end">
              METRIC
            </div>
            {MATERIALS.map((mat) => (
              <div key={mat.id} className="text-center">
                <div className="font-headline text-3xl text-white leading-none mb-1">{mat.name}</div>
                <div className="font-technical text-[9px] text-stone-600 uppercase tracking-widest">
                  {mat.category}
                </div>
              </div>
            ))}
          </div>

          {/* Metric rows */}
          <div className="min-w-[540px]">
            {COMPARE_METRICS.map((metric, i) => (
              <CompareRow key={metric.label} metric={metric} odd={i % 2 === 0} />
            ))}
          </div>

          <p className="font-technical text-[9px] text-stone-700 mt-6 text-right">
            * RELATIVE PERFORMANCE INDEX — NOT ABSOLUTE UNITS
          </p>
        </div>
      </motion.section>

      {/* ── Material Sections ── */}
      <div className="space-y-12 px-4 md:px-8 max-w-[1600px] mx-auto">
        {MATERIALS.map((mat, i) => (
          <div key={mat.id} id={mat.id}>
            <motion.section
              variants={fadeUp}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true, margin: '-80px' }}
              transition={{ duration: 0.6 }}
              className={`group relative overflow-hidden bg-[#161616] min-h-[500px]
                          flex flex-col ${mat.reverse ? 'md:flex-row-reverse' : 'md:flex-row'}
                          items-center machined-glow transition-all duration-500`}
            >
              {/* Background watermark text */}
              <div className="absolute inset-0 pointer-events-none overflow-hidden select-none">
                <span
                  className={`text-huge-bg font-headline text-white/[0.03]
                               group-hover:text-white/[0.08] transition-colors duration-700
                               absolute leading-none ${mat.bgPos}`}
                >
                  {mat.name}
                </span>
              </div>

              {/* Text content */}
              <div className="w-full md:w-1/2 p-12 z-10">
                {/* Status + Category badges */}
                <div className="flex items-center gap-3 mb-6 flex-wrap">
                  <div className="bg-[#ff5500]/10 border-l-2 border-[#ff5500] px-3 py-1 font-technical text-xs text-[#ff5500]">
                    STATUS: {mat.status}
                  </div>
                  <div className="bg-white/5 px-3 py-1 font-technical text-xs text-stone-400">
                    CATEGORY: {mat.category}
                  </div>
                </div>

                <h2 className="font-headline text-6xl text-white mb-6">{mat.title}</h2>
                <p className="font-body text-stone-400 max-w-md mb-8 leading-relaxed">{mat.desc}</p>

                {/* Animated property bars */}
                <div className="mb-8 max-w-sm">
                  {mat.props.map((prop, j) => (
                    <AnimatedBar
                      key={prop.label}
                      label={prop.label}
                      value={prop.value}
                      display={prop.display}
                      delay={j * 0.15}
                    />
                  ))}
                </div>

                {/* Best For chips */}
                <div>
                  <span className="font-technical text-[10px] text-stone-600 uppercase tracking-widest block mb-3">
                    // BEST FOR
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {mat.bestFor.map((use) => (
                      <span
                        key={use}
                        className="bg-white/5 border border-white/10 px-3 py-1 font-technical text-[11px] text-stone-300"
                      >
                        {use}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Image placeholder */}
              <div className="w-full md:w-1/2 h-[400px] md:h-full relative overflow-hidden p-8">
                <div
                  className="w-full h-full bg-stone-900 overflow-hidden relative
                              grayscale group-hover:grayscale-0 transition-all duration-700"
                >
                  <div className="absolute inset-0 orange-grid opacity-0 group-hover:opacity-60 transition-opacity duration-700" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span
                      className="material-symbols-outlined text-white/10 group-hover:text-[#ff5500]/30
                                 transition-colors duration-700"
                      style={{ fontSize: 120 }}
                    >
                      layers
                    </span>
                  </div>
                  <div className="absolute inset-0 bg-gradient-to-t from-[#161616] via-transparent to-transparent" />
                  <div className="absolute bottom-4 left-4 font-technical text-[10px] text-[#ff5500]/60 uppercase">
                    {mat.name} // {mat.category}
                  </div>
                </div>
              </div>
            </motion.section>

            {i < MATERIALS.length - 1 && <div className="signature-divider" />}
          </div>
        ))}
      </div>

      {/* ── Footer CTA ── */}
      <motion.section
        className="mt-24 px-8 text-center max-w-2xl mx-auto"
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
      >
        <h3 className="font-headline text-4xl text-white mb-6">Custom Material Request?</h3>
        <p className="font-body text-stone-500 mb-8">
          We offer PEEK, Carbon Fiber Infused Nylon, and Stainless Steel composite filaments for
          specialized aerospace and automotive applications.
        </p>
        <div className="flex flex-col md:flex-row gap-4 justify-center">
          <Link
            to="/quote"
            className="clip-parallelogram bg-white text-black font-headline px-12 py-3 text-xl
                       hover:bg-[#ff5500] hover:text-white transition-all duration-300
                       flex items-center justify-center"
          >
            Consult Engineer
          </Link>
          <button
            className="clip-parallelogram border border-white/20 text-white font-headline
                       px-12 py-3 text-xl hover:border-[#ff5500] transition-all duration-300"
          >
            Download SDS Sheets
          </button>
        </div>
      </motion.section>

    </main>
  );
}
