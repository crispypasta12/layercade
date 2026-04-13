import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { getFeaturedProducts, getNewArrivals } from '../data/products';
import { FloatingPaths } from '@/components/ui/background-paths';
import ProductCard, { fadeUp } from '../components/ProductCard';
import { CATEGORIES } from '../lib/categories';

/* ─── Constants ──────────────────────────────────────────────── */
const TW_WORDS = ['PLA', 'PETG', 'TPU', 'RESIN', 'ASA', 'FLEX'];


const REVIEWS = [
  {
    handle: '@Tanvir_R',
    product: 'Batman Stand',
    text: '"The level of detail on the Cyberpunk mask is insane. You can barely see any layer lines. Best print shop in the country hands down."',
  },
  {
    handle: '@Zabir_Labs',
    product: 'Industrial Parts',
    text: '"Custom order process was smooth. Uploaded my STL and had it delivered within 4 days. Precise engineering at its finest."',
  },
  {
    handle: '@Sarah_M',
    product: 'Moon Cityscape',
    text: '"Beautiful packaging and the moon sculpture looks amazing on my desk. The topographical details are perfect."',
  },
];

const FAQ_ITEMS = [
  {
    q: 'How long does a print take?',
    a: 'Standard orders take 3-5 business days. Custom complex parts may take up to 7 days.',
  },
  {
    q: 'Do you offer delivery across Bangladesh?',
    a: 'Yes, we ship nationwide. Inside Dhaka delivery is 60৳ (Free over 1,000৳), outside Dhaka is 120৳.',
  },
  {
    q: 'What file formats do you accept?',
    a: 'We primarily work with .STL, .OBJ, and .3MF files.',
  },
  {
    q: 'Can you design a 3D model for me?',
    a: 'Yes! Our engineers can assist with basic modifications or full custom modeling for an additional fee.',
  },
];

/* ─── Animation Variants ─────────────────────────────────────── */

const stagger = {
  hidden: {},
  show:   { transition: { staggerChildren: 0.08 } },
};

/* ─── Main Page ──────────────────────────────────────────────── */

export default function LandingPage() {
  const location = useLocation();

  /* Typewriter */
  const [twText,    setTwText]    = useState('');
  const [twWordIdx, setTwWordIdx] = useState(0);
  const [twDelete,  setTwDelete]  = useState(false);

  useEffect(() => {
    const word = TW_WORDS[twWordIdx];
    let timer;
    if (!twDelete) {
      if (twText.length < word.length) {
        timer = setTimeout(() => setTwText(word.slice(0, twText.length + 1)), 90);
      } else {
        timer = setTimeout(() => setTwDelete(true), 1400);
      }
    } else {
      if (twText.length > 0) {
        timer = setTimeout(() => setTwText(word.slice(0, twText.length - 1)), 60);
      } else {
        setTwDelete(false);
        setTwWordIdx((i) => (i + 1) % TW_WORDS.length);
      }
    }
    return () => clearTimeout(timer);
  }, [twText, twWordIdx, twDelete]);

  /* Products from Supabase */
  const [featuredProducts, setFeaturedProducts] = useState([]);
  const [newProducts,      setNewProducts]      = useState([]);
  const [loading,          setLoading]          = useState(true);

  useEffect(() => {
    Promise.all([getFeaturedProducts(), getNewArrivals()])
      .then(([featured, arrivals]) => {
        setFeaturedProducts(featured);
        setNewProducts(arrivals);
      })
      .finally(() => setLoading(false));
  }, []);

  /* Best Sellers category filter (applied to fetched featured products) */
  const [activeCategory, setActiveCategory] = useState('ALL');
  const categories = ['ALL', ...new Set(featuredProducts.map((p) => p.category))];
  const filtered =
    activeCategory === 'ALL'
      ? featuredProducts
      : featuredProducts.filter((p) => p.category === activeCategory);

  /* FAQ */
  const [openFaq, setOpenFaq] = useState(null);

  if (loading) {
    return (
      <main className="min-h-screen bg-[#080808] flex items-center justify-center">
        <p className="font-headline text-2xl text-white uppercase tracking-wider">
          Loading products...
        </p>
      </main>
    );
  }

  return (
    <main>
      {/* ── 01 HERO ──────────────────────────────────────────────── */}
      <section className="relative min-h-screen flex flex-col items-center justify-center orange-grid overflow-hidden pt-[calc(36px+80px)]">
        <div className="absolute inset-0 text-[#ff5500]">
          <FloatingPaths position={1} />
          <FloatingPaths position={-1} />
        </div>

        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#080808]/60 to-[#080808] pointer-events-none" />

        <div className="relative w-64 h-64 md:w-96 md:h-96 z-10">
          <div className="absolute inset-0 bg-[#ff5500] blur-[120px] opacity-25 animate-pulse" />
          <img
            src="/logo.png"
            alt="Layercade"
            className="relative w-full h-full object-contain drop-shadow-[0_0_40px_rgba(255,85,0,0.5)]"
          />
        </div>

        <div className="z-20 text-center mt-8 px-4">
          <h1 className="font-headline text-7xl md:text-[10rem] leading-none tracking-tighter text-white">
            PRECISION.<br />LAYER BY LAYER.
          </h1>

          <div
            className="font-technical text-xl md:text-2xl mt-4 flex items-center justify-center gap-2
                        tracking-[0.2em] uppercase"
          >
            <span style={{ color: '#555' }}>NOW PRINTING IN </span>
            <span className="text-[#ff5500] font-bold typewriter-cursor">{twText}</span>
          </div>

          <div className="flex flex-col md:flex-row gap-6 mt-12 justify-center">
            <Link
              to="/shop"
              className="clip-parallelogram bg-[#ff5500] text-white px-12 py-4 font-headline text-3xl
                         hover:shadow-[0_0_30px_rgba(255,85,0,0.5)] transition-all flex items-center justify-center"
            >
              Shop Now
            </Link>
            <Link
              to="/quote"
              className="clip-parallelogram border-2 border-orange-500/50 text-orange-500 bg-orange-500/5
                         px-12 py-4 font-headline text-3xl hover:bg-orange-500/10 transition-all
                         flex items-center justify-center"
            >
              Get a Quote
            </Link>
          </div>
        </div>

      </section>

      {/* ── 02 TRUST BAR ─────────────────────────────────────── */}
      <section className="py-16 bg-[#111111] relative z-30">
        <motion.div
          className="max-w-7xl mx-auto px-8"
          variants={stagger}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: '-60px' }}
        >
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {[
              { icon: 'precision_manufacturing', stat: '100+',      label: 'Products' },
              { icon: 'local_shipping',          stat: 'Same-Week', label: 'Delivery' },
              { icon: 'layers',                  stat: 'Premium',   label: 'Materials' },
              { icon: 'edit_square',             stat: 'Custom',    label: 'Orders' },
            ].map(({ icon, stat, label }) => (
              <motion.div
                key={label}
                variants={fadeUp}
                className="flex flex-col items-center text-center group"
              >
                <span
                  className="material-symbols-outlined text-[#ff5500] mb-2 group-hover:scale-110 transition-transform"
                  style={{ fontSize: 36 }}
                >
                  {icon}
                </span>
                <span className="font-headline text-4xl text-white">{stat}</span>
                <span className="font-technical text-xs text-stone-500 uppercase">{label}</span>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </section>

      {/* ── 03 COLLECTIONS ───────────────────────────────────── */}
      <section className="py-32 px-8 max-w-7xl mx-auto" id="collections">
        <motion.div
          className="mb-16"
          variants={fadeUp}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <span className="font-technical text-[#ff5500] text-lg">Collections</span>
          <h2 className="font-headline text-6xl md:text-8xl text-white mt-2">WHAT WE MAKE</h2>
          <div className="signature-divider mt-4 opacity-30" />
        </motion.div>

        {/* Scrollable category row */}
        <div
          className="h-scroll overflow-x-auto overflow-y-hidden pb-3 -mx-8 px-8"
          style={{ scrollbarColor: '#ff5500 rgba(255,255,255,0.04)' }}
        >
          <motion.div
            className="flex gap-4 min-w-max"
            variants={stagger}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: '-80px' }}
          >
            {CATEGORIES.map((cat, i) => (
              <motion.div
                key={cat.slug}
                variants={fadeUp}
                transition={{ duration: 0.4 }}
                className="group flex-shrink-0 w-[260px] h-[340px] relative overflow-hidden border border-white/5 hover-glow bg-[#161616]"
              >
                <Link to={`/shop/${cat.slug}`} className="absolute inset-0 overflow-hidden p-7 flex flex-col justify-between">
                  <div className="flex justify-between items-start">
                    <span className="font-technical text-stone-600 text-xs">
                      {String(i + 1).padStart(2, '0')}
                    </span>
                    <span className="material-symbols-outlined text-[#ff5500] text-base opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                      arrow_outward
                    </span>
                  </div>
                  <div>
                    <h3 className="font-headline text-[2.2rem] leading-tight text-white">
                      {cat.name.toUpperCase()}
                    </h3>
                    <div className="mt-2 h-px w-0 bg-[#ff5500] group-hover:w-full transition-all duration-300" />
                  </div>
                </Link>
              </motion.div>
            ))}

            {/* Custom Orders — always last */}
            <motion.div
              variants={fadeUp}
              transition={{ duration: 0.4 }}
              className="group flex-shrink-0 w-[320px] h-[340px] relative overflow-hidden bg-[#ff5500]"
            >
              <Link to="/quote" className="absolute inset-0 overflow-hidden p-7 flex flex-col justify-between">
                <div className="flex justify-between items-start">
                  <span className="font-technical text-black/50 text-xs">
                    {String(CATEGORIES.length + 1).padStart(2, '0')}
                  </span>
                  <span className="material-symbols-outlined text-black text-base">
                    arrow_outward
                  </span>
                </div>
                <div>
                  <div className="absolute inset-0 flex items-center justify-center overflow-hidden pointer-events-none">
                    <span className="font-headline text-[9rem] text-black/10 leading-none select-none">
                      CUSTOM
                    </span>
                  </div>
                  <h3 className="font-headline text-[2.2rem] leading-tight text-black relative">
                    CUSTOM ORDERS
                  </h3>
                  <p className="mt-1 font-technical text-[10px] text-black/60 uppercase tracking-widest relative">
                    Have a file? We print it.
                  </p>
                </div>
              </Link>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ── 04 BEST SELLERS ──────────────────────────────────── */}
      <section className="py-32 bg-[#111111] relative" id="best-sellers">
        <div className="max-w-7xl mx-auto px-8">
          {/* Header + filter pills */}
          <motion.div
            className="mb-16"
            variants={fadeUp}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
              <div>
                <span className="font-technical text-[#ff5500] text-lg">Top Picks</span>
                <h2 className="font-headline text-6xl md:text-8xl text-white mt-2">BEST SELLERS</h2>
              </div>
            </div>

            {/* Filter pills */}
            <div className="mt-8 flex flex-wrap gap-3">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={`font-technical px-6 py-2 text-sm transition-all clip-parallelogram ${
                    activeCategory === cat
                      ? 'bg-[#ff5500] text-black font-bold'
                      : 'border border-stone-800 text-stone-500 hover:border-[#ff5500] hover:text-stone-300'
                  }`}
                >
                  {cat.toUpperCase()}
                </button>
              ))}
            </div>
          </motion.div>

          {/* Product grid */}
          <motion.div
            key={activeCategory}
            className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6"
            variants={stagger}
            initial="hidden"
            animate="show"
          >
            {filtered.map((product) => (
              <ProductCard key={product.id} product={product} location={location} />
            ))}
          </motion.div>

          {/* CTA */}
          <div className="mt-20 flex justify-center">
            <Link
              to="/shop"
              className="clip-parallelogram bg-[#ff5500] text-white px-12 py-4 font-headline text-3xl
                         hover:shadow-[0_0_30px_rgba(255,85,0,0.5)] transition-all flex items-center justify-center"
            >
              View All Products
            </Link>
          </div>
        </div>
      </section>

      {/* ── 05 NEW ARRIVALS ──────────────────────────────────── */}
      <section className="py-32 px-8 max-w-7xl mx-auto" id="new-arrivals">
        <motion.div
          className="mb-16"
          variants={fadeUp}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <span className="font-technical text-[#ff5500] text-lg">Fresh Drops</span>
          <h2 className="font-headline text-6xl md:text-8xl text-white mt-2">NEW ARRIVALS</h2>
          <div className="signature-divider mt-4 opacity-30" />
        </motion.div>

        <motion.div
          className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6"
          variants={stagger}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: '-60px' }}
        >
          {newProducts.map((product) => (
            <ProductCard key={product.id} product={product} location={location} />
          ))}
        </motion.div>
      </section>

      {/* ── 06 REVIEWS ───────────────────────────────────────── */}
      <section className="py-32 bg-[#111111] border-t border-white/5">
        <div className="max-w-7xl mx-auto px-8">
          <motion.div
            className="mb-16 text-center"
            variants={fadeUp}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <span className="font-technical text-[#ff5500] text-lg">Reviews</span>
            <h2 className="font-headline text-6xl md:text-8xl text-white mt-2">
              COMMUNITY FEEDBACK
            </h2>
          </motion.div>

          <motion.div
            className="grid grid-cols-1 md:grid-cols-3 gap-8"
            variants={stagger}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: '-60px' }}
          >
            {REVIEWS.map((review) => (
              <motion.div
                key={review.handle}
                variants={fadeUp}
                transition={{ duration: 0.5 }}
                className="bg-[#161616] p-8 border border-white/5 hover-glow transition-all"
              >
                {/* 5 filled stars */}
                <div className="flex text-[#ff5500] mb-4">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <span
                      key={s}
                      className="material-symbols-outlined"
                      style={{ fontVariationSettings: "'FILL' 1" }}
                    >
                      star
                    </span>
                  ))}
                </div>
                <p className="text-stone-400 italic mb-6 leading-relaxed">{review.text}</p>
                <div className="font-technical text-[10px] text-stone-500 uppercase">
                  <span className="text-[#ff5500]">{review.handle}</span> // {review.product}
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ── 07 FAQ ───────────────────────────────────────────── */}
      <section className="py-32 px-8 max-w-4xl mx-auto">
        <motion.div
          className="mb-16"
          variants={fadeUp}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <span className="font-technical text-[#ff5500] text-lg uppercase">FAQ</span>
          <h2 className="font-headline text-6xl md:text-8xl text-white mt-2">COMMON QUESTIONS</h2>
          <p className="text-stone-500 mt-2 font-body">
            Everything you need to know before placing an order.
          </p>
          <div className="signature-divider mt-4 opacity-30" />
        </motion.div>

        <motion.div
          className="space-y-4"
          variants={stagger}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true }}
        >
          {FAQ_ITEMS.map((item, i) => (
            <motion.div
              key={i}
              variants={fadeUp}
              transition={{ duration: 0.4 }}
              className={`border border-white/5 transition-colors duration-300 ${
                openFaq === i ? 'bg-[#1a1a1a]' : 'bg-[#161616]'
              }`}
            >
              <button
                onClick={() => setOpenFaq(openFaq === i ? null : i)}
                className="w-full flex justify-between items-center p-6 text-left"
                aria-expanded={openFaq === i}
              >
                <h4 className="text-white font-medium text-lg font-body">{item.q}</h4>
                <span
                  className="material-symbols-outlined text-[#ff5500] transition-transform duration-300 flex-shrink-0 ml-4"
                  style={{ transform: openFaq === i ? 'rotate(45deg)' : 'rotate(0deg)' }}
                >
                  add
                </span>
              </button>

              <div
                className={`overflow-hidden transition-all duration-300 ${
                  openFaq === i ? 'max-h-40' : 'max-h-0'
                }`}
              >
                <div className="px-6 pb-6 text-stone-400 text-sm leading-relaxed border-t border-white/5 pt-4">
                  {item.a}
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </section>
    </main>
  );
}
