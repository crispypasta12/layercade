import { motion } from 'framer-motion';
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
    specs: [
      'STRENGTH: MODERATE',
      'HEAT RESISTANCE: 50°C',
      'TOLERANCE: +/- 0.05mm',
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
    specs: [
      'STRENGTH: HIGH',
      'HEAT RESISTANCE: 80°C',
      'FLEXIBILITY: SEMI-RIGID',
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
    specs: [
      'SHORE HARDNESS: 95A',
      'ELONGATION: 450%',
      'VIBE-DAMP: EXCELLENT',
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
    specs: [
      'LAYER HEIGHT: 0.025mm',
      'SURFACE: SMOOTH',
      'ACCURACY: MICRON',
    ],
    reverse:  true,
    bgPos:    '-bottom-10 left-0',
  },
];

/* ─── Animation Variants ─────────────────────────────────────── */

const fadeUp = { hidden: { opacity: 0, y: 40 }, show: { opacity: 1, y: 0 } };

/* ─── Component ──────────────────────────────────────────────── */

export default function Materials() {
  return (
    <main className="pt-40 pb-24">
      {/* Page Title */}
      <section className="px-8 md:px-12 mb-20 text-center md:text-left">
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

      {/* Material Sections */}
      <div className="space-y-12 px-4 md:px-8 max-w-[1600px] mx-auto">
        {MATERIALS.map((mat, i) => (
          <div key={mat.id}>
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

                <div className="flex flex-wrap gap-4 font-technical">
                  {mat.specs.map((spec) => (
                    <span
                      key={spec}
                      className="border border-white/10 px-4 py-1 text-xs text-stone-300"
                    >
                      {spec}
                    </span>
                  ))}
                </div>
              </div>

              {/* Image placeholder */}
              <div className="w-full md:w-1/2 h-[400px] md:h-full relative overflow-hidden p-8">
                <div
                  className="w-full h-full bg-stone-900 overflow-hidden relative
                              grayscale group-hover:grayscale-0 transition-all duration-700"
                >
                  {/* Placeholder with animated grid + icon */}
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

            {/* Divider between sections */}
            {i < MATERIALS.length - 1 && <div className="signature-divider" />}
          </div>
        ))}
      </div>

      {/* Technical Footer CTA */}
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
