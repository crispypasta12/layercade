import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';

/* ─── Step Data ──────────────────────────────────────────────── */

const STEPS = [
  {
    num:   '01',
    icon:  'upload_file',
    title: 'Upload Your File',
    desc:  'Securely upload your 3D assets to our cloud engine. We support high-poly industrial standard formats.',
    extra: (
      <div className="mt-auto flex gap-2">
        {['.STL', '.OBJ', '.3MF'].map((fmt) => (
          <span
            key={fmt}
            className="font-technical text-[10px] bg-stone-900 px-2 py-1 text-stone-500 border border-stone-800"
          >
            {fmt}
          </span>
        ))}
      </div>
    ),
    border: false,
  },
  {
    num:   '02',
    icon:  'verified',
    title: 'Review & Quote',
    desc:  'Our engineers perform a structural integrity check and provide a binding quote within one business cycle.',
    extra: (
      <div className="mt-auto flex items-center gap-2">
        <span className="material-symbols-outlined text-[#ff5500] text-sm">schedule</span>
        <span className="font-technical text-xs text-[#ff5500] uppercase tracking-widest">
          24 hours max
        </span>
      </div>
    ),
    border: true,
  },
  {
    num:   '03',
    icon:  'precision_manufacturing',
    title: 'Print & Quality',
    desc:  'High-precision additive manufacturing using industrial-grade polymers. Every layer is scanned for deviations.',
    extra: (
      <div className="mt-auto h-32 w-full overflow-hidden relative bg-stone-900">
        <div className="absolute inset-0 orange-grid opacity-50" />
        <div className="absolute inset-0 flex items-center justify-center">
          <span
            className="material-symbols-outlined text-[#ff5500]/30"
            style={{ fontSize: 60 }}
          >
            layers
          </span>
        </div>
      </div>
    ),
    border: true,
  },
  {
    num:   '04',
    icon:  'local_shipping',
    title: 'Ship to You',
    desc:  'Machined components are vacuum sealed and dispatched via expedited logistics to your project site.',
    extra: (
      <div className="mt-auto">
        <span className="font-technical text-xs text-stone-500 uppercase tracking-widest flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-green-500 inline-block" />
          Global Fulfillment
        </span>
      </div>
    ),
    border: true,
  },
];

/* ─── Animation Variants ─────────────────────────────────────── */

const fadeUp   = { hidden: { opacity: 0, y: 40 }, show: { opacity: 1, y: 0 } };
const stagger  = { hidden: {}, show: { transition: { staggerChildren: 0.12 } } };

/* ─── Component ──────────────────────────────────────────────── */

export default function Process() {
  return (
    <main className="pt-44 pb-24 px-8 max-w-7xl mx-auto">
      {/* Header */}
      <motion.header
        className="mb-24 text-center"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <span className="font-technical text-[#ff5500] text-sm tracking-[0.3em] uppercase mb-4 block">
          The Workflow
        </span>
        <h1 className="font-headline text-7xl md:text-9xl text-white tracking-tight">
          HOW IT WORKS
        </h1>
        <div className="signature-divider w-1/3 mx-auto mt-8" />
      </motion.header>

      {/* Steps */}
      <section className="relative">
        {/* Horizontal connecting line (desktop) */}
        <div
          className="hidden md:block absolute top-1/2 left-0 w-full h-[2px]
                     bg-gradient-to-r from-transparent via-[#ff5500]/30 to-transparent
                     -translate-y-1/2 z-0"
        />

        <motion.div
          className="grid grid-cols-1 md:grid-cols-4 gap-12 relative z-10"
          variants={stagger}
          initial="hidden"
          animate="show"
        >
          {STEPS.map((step) => (
            <motion.div
              key={step.num}
              variants={fadeUp}
              transition={{ duration: 0.5 }}
              className="group"
            >
              <div
                className={`bg-[#161616] p-8 h-full flex flex-col relative overflow-hidden
                            hover:scale-[1.02] transition-transform duration-500
                            ${step.border ? 'border-l border-[#ff5500]/20' : ''}`}
              >
                {/* Ghost step number */}
                <span
                  className="font-headline absolute -top-12 -right-8 text-[#ff5500]/5
                             leading-none select-none pointer-events-none"
                  style={{ fontSize: '12rem' }}
                >
                  {step.num}
                </span>

                {/* Icon */}
                <div className="mb-8">
                  <span
                    className="material-symbols-outlined text-[#ff5500]"
                    style={{ fontSize: 48 }}
                  >
                    {step.icon}
                  </span>
                </div>

                <h3 className="font-headline text-3xl text-white mb-4 tracking-wide">
                  {step.title}
                </h3>
                <p className="text-stone-400 text-sm leading-relaxed mb-6">{step.desc}</p>

                {step.extra}
              </div>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* CTA Banner */}
      <motion.section
        className="mt-32 text-center"
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
      >
        <div className="bg-[#111111] p-16 relative border border-white/5 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-tr from-[#ff5500]/10 to-transparent opacity-50" />
          <div className="relative z-10">
            <h2 className="font-headline text-5xl text-white mb-8">
              Ready to bring your CAD to life?
            </h2>
            <p className="font-body text-stone-400 max-w-xl mx-auto mb-12">
              Precision engineering is only a click away. Upload your specs and let our machines do
              the heavy lifting.
            </p>
            <Link
              to="/quote"
              className="clip-parallelogram bg-[#ff5500] text-white px-12 py-5 font-headline
                         text-2xl tracking-widest hover:scale-105 transition-transform
                         hover:shadow-[0_0_30px_rgba(255,85,0,0.5)] active:scale-95
                         duration-100 inline-block"
            >
              Start Your Order
            </Link>
          </div>
        </div>
      </motion.section>
    </main>
  );
}
