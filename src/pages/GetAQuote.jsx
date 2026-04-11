import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

/* ─── Constants ──────────────────────────────────────────────── */

const PRODUCT_OPTIONS = [
  'Gaming Accessories',
  'Headphone Gear',
  'Collectible Busts & Figures',
  'Desk & Home Decor',
  'Masks & Wearables',
  'Cosplay & Props',
  'Custom Design (Upload File)',
];

const INITIAL_FORM = {
  name:     '',
  email:    '',
  phone:    '',
  interest: PRODUCT_OPTIONS[0],
  message:  '',
};

/* ─── Helpers ────────────────────────────────────────────────── */

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/* ─── Field Component ────────────────────────────────────────── */

function Field({ label, error, children }) {
  return (
    <div className="space-y-2">
      <label className="font-technical text-xs text-stone-400 uppercase tracking-widest block">
        {label}
      </label>
      {children}
      {error && (
        <p className="font-technical text-[10px] text-red-500 uppercase tracking-widest">
          {error}
        </p>
      )}
    </div>
  );
}

/* ─── Component ──────────────────────────────────────────────── */

export default function GetAQuote() {
  const [form,     setForm]     = useState(INITIAL_FORM);
  const [errors,   setErrors]   = useState({});
  const [loading,  setLoading]  = useState(false);
  const [success,  setSuccess]  = useState(false);

  const set = (key) => (e) => setForm((prev) => ({ ...prev, [key]: e.target.value }));

  const validate = () => {
    const e = {};
    if (!form.name.trim())            e.name    = 'Name is required';
    if (!isValidEmail(form.email))    e.email   = 'Valid email required';
    if (!form.message.trim())         e.message = 'Project description required';
    return e;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setErrors({});
    setLoading(true);
    // Simulate submission — replace with Formspree endpoint when ready
    await new Promise((r) => setTimeout(r, 1200));
    setLoading(false);
    setSuccess(true);
  };

  const inputClass =
    'w-full bg-[#111111] border-b border-stone-800 text-white p-3 ' +
    'focus:outline-none focus:border-[#ff5500] transition-colors ' +
    'placeholder:text-stone-700 font-body';

  return (
    <main className="pt-44 pb-20 px-8 max-w-7xl mx-auto">
      {/* Section Header */}
      <header className="mb-16">
        <h1 className="font-headline text-6xl md:text-8xl tracking-tight text-white mb-2">
          REQUEST A QUOTE
        </h1>
        <div className="signature-divider w-full" />
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-start">
        {/* Left — Info Column */}
        <motion.section
          className="space-y-12"
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div className="space-y-6">
            <h2 className="font-headline text-3xl text-[#ff5500]">
              PRECISION ENGINEERING ON DEMAND
            </h2>
            <p className="text-stone-400 text-lg max-w-md leading-relaxed">
              Our additive manufacturing facility utilizes high-grade materials and industrial-scale
              precision. Submit your requirements for a comprehensive feasibility report and
              lead-time estimate.
            </p>
          </div>

          <div className="grid gap-8">
            {[
              {
                icon:  'mail',
                label: 'Direct Inquiries',
                value: 'hello@layercade.com',
              },
              {
                icon:  'location_on',
                label: 'Manufacturing Hub',
                value: 'Dhaka, Bangladesh',
              },
              {
                icon:  'verified',
                label: 'Our Guarantee',
                value: 'Tolerance accuracy within 50 microns. Premium materials available.',
                small: true,
              },
            ].map(({ icon, label, value, small }) => (
              <div key={label} className="flex items-start gap-4">
                <span
                  className="material-symbols-outlined text-[#ff5500]"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  {icon}
                </span>
                <div>
                  <p className="font-technical text-xs uppercase tracking-widest text-stone-500 mb-1">
                    {label}
                  </p>
                  <p className={`font-body text-white ${small ? 'text-stone-300' : 'text-xl'}`}>
                    {value}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* Dark image placeholder with system badge */}
          <div className="relative h-64 w-full bg-[#161616] overflow-hidden group">
            <div className="absolute inset-0 orange-grid opacity-40 group-hover:opacity-60 transition-opacity" />
            <div className="absolute inset-0 bg-gradient-to-t from-[#080808] to-transparent" />
            <div className="absolute bottom-4 left-4 font-technical text-[10px] text-[#ff5500] bg-stone-950/80 px-2 py-1">
              UNIT_ID: LC-049 // SYSTEM_ACTIVE
            </div>
            <div className="absolute inset-0 flex items-center justify-center">
              <span
                className="material-symbols-outlined text-[#ff5500]/20 group-hover:text-[#ff5500]/40 transition-colors"
                style={{ fontSize: 80 }}
              >
                precision_manufacturing
              </span>
            </div>
          </div>
        </motion.section>

        {/* Right — Form Column */}
        <motion.section
          className="bg-[#161616] p-8 md:p-12 relative border-l-4 border-[#ff5500]"
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
        >
          <AnimatePresence mode="wait">
            {success ? (
              /* Success State */
              <motion.div
                key="success"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.4 }}
                className="flex flex-col items-center justify-center py-20 text-center gap-6"
              >
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 200, delay: 0.1 }}
                  className="w-20 h-20 rounded-full bg-emerald-500/10 border-2 border-emerald-500
                             flex items-center justify-center"
                >
                  <span
                    className="material-symbols-outlined text-emerald-400"
                    style={{ fontSize: 40, fontVariationSettings: "'FILL' 1" }}
                  >
                    check_circle
                  </span>
                </motion.div>

                <div>
                  <h3 className="font-headline text-4xl text-white mb-2">REQUEST RECEIVED</h3>
                  <p className="font-technical text-xs text-stone-500 uppercase tracking-widest">
                    We'll be in touch within 24 hours
                  </p>
                </div>

                <button
                  onClick={() => { setSuccess(false); setForm(INITIAL_FORM); }}
                  className="font-technical text-xs text-[#ff5500] uppercase tracking-widest
                             hover:underline mt-4"
                >
                  Submit another request →
                </button>
              </motion.div>
            ) : (
              /* Form */
              <motion.form
                key="form"
                onSubmit={handleSubmit}
                className="space-y-8"
                initial={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <Field label="Full Name" error={errors.name}>
                    <input
                      type="text"
                      value={form.name}
                      onChange={set('name')}
                      placeholder="Your Name"
                      className={inputClass}
                    />
                  </Field>
                  <Field label="Email Address" error={errors.email}>
                    <input
                      type="email"
                      value={form.email}
                      onChange={set('email')}
                      placeholder="you@example.com"
                      className={inputClass}
                    />
                  </Field>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <Field label="Phone Number">
                    <input
                      type="tel"
                      value={form.phone}
                      onChange={set('phone')}
                      placeholder="+880 1XXX-XXXXXX"
                      className={inputClass}
                    />
                  </Field>
                  <Field label="Product Interest">
                    <select
                      value={form.interest}
                      onChange={set('interest')}
                      className={`${inputClass} appearance-none cursor-pointer`}
                    >
                      {PRODUCT_OPTIONS.map((opt) => (
                        <option key={opt} value={opt} className="bg-[#161616]">
                          {opt}
                        </option>
                      ))}
                    </select>
                  </Field>
                </div>

                {/* File Upload zone (visual only — real upload needs a backend) */}
                <Field label="CAD/Technical Drawings (.STL, .STEP, .OBJ)">
                  <div
                    className="border-2 border-dashed border-stone-800 bg-[#111111] p-8 text-center
                               hover:border-[#ff5500]/50 transition-colors group cursor-pointer"
                  >
                    <span
                      className="material-symbols-outlined text-stone-600 group-hover:text-[#ff5500]
                                 transition-colors mb-2 block"
                      style={{ fontSize: 36 }}
                    >
                      upload_file
                    </span>
                    <p className="text-stone-500 font-body">
                      Drag and drop technical files or{' '}
                      <span className="text-[#ff5500]">browse</span>
                    </p>
                    <p className="text-stone-700 font-technical text-[10px] mt-2">
                      MAX FILE SIZE: 50MB
                    </p>
                  </div>
                </Field>

                <Field label="Project Description" error={errors.message}>
                  <textarea
                    value={form.message}
                    onChange={set('message')}
                    placeholder="Detailed specifications, quantity, and material preferences..."
                    rows={4}
                    className={`${inputClass} resize-none`}
                  />
                </Field>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-[#ff5500] text-white font-headline text-2xl py-5
                             clip-parallelogram hover:shadow-[0_0_20px_rgba(255,85,0,0.3)]
                             hover:scale-[1.01] active:scale-95 transition-all duration-200
                             disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {loading ? 'SENDING...' : 'SEND REQUEST →'}
                </button>
              </motion.form>
            )}
          </AnimatePresence>
        </motion.section>
      </div>
    </main>
  );
}
