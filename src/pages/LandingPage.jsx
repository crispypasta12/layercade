import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { products, categories, newArrivals } from '../data/products';
import { FloatingPaths } from '@/components/ui/background-paths';
import { InteractiveRobotSpline } from '@/components/ui/interactive-3d-robot';

const ROBOT_SCENE_URL = 'https://prod.spline.design/PyzDhpQ9E5f1E3MT/scene.splinecode';

/* ─── Constants ──────────────────────────────────────────────── */

const TW_WORDS = ['PLA', 'PETG', 'TPU', 'RESIN', 'ASA', 'FLEX'];

const COLLECTION_CARDS = [
  { num: '01', count: '14 PRODUCTS', title: 'GAMING ACCESSORIES',  sub: 'Controllers, stands & PC mods',    span: 2, filter: 'Gaming' },
  { num: '02', count: '9 PRODUCTS',  title: 'HEADPHONE GEAR',      sub: 'Stands & wall mounts',             span: 1, filter: 'Headphone Gear' },
  { num: '03', count: '12 PRODUCTS', title: 'COLLECTIBLE BUSTS',   sub: 'Icons & legends',                  span: 1, filter: 'Busts' },
  { num: '04', count: '8 PRODUCTS',  title: 'MASKS & WEARABLES',   sub: 'Cosplay ready',                    span: 1, filter: 'Masks' },
  { num: '05', count: '10 PRODUCTS', title: 'SCULPTURES',          sub: 'Artisan figurines',                span: 1, filter: 'Decor' },
  { num: '06', count: '7 PRODUCTS',  title: 'DESK & HOME DECOR',   sub: 'Minimalist & futuristic',          span: 1, filter: 'Decor' },
  { num: '07', count: '6 PRODUCTS',  title: 'COSPLAY & PROPS',     sub: 'Highly detailed replicas',         span: 1, filter: 'Cosplay', cosplay: true },
];

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

const fadeUp = {
  hidden: { opacity: 0, y: 40 },
  show:   { opacity: 1, y: 0 },
};

const stagger = {
  hidden: {},
  show:   { transition: { staggerChildren: 0.08 } },
};

/* ─── Sub-components ─────────────────────────────────────────── */

/** Dark placeholder shown when a product has no image */
function ImgPlaceholder({ category }) {
  return (
    <div className="w-full h-full bg-stone-900 flex items-center justify-center">
      <span className="font-technical text-stone-700 text-[10px] uppercase tracking-widest">
        {category}
      </span>
    </div>
  );
}

/** Single product card */
function ProductCard({ product, location }) {
  const hasImg = product.img1 !== null;

  return (
    <Link
      to={`/products/${product.slug}`}
      state={{ backgroundLocation: location }}
      className="block"
    >
      <motion.div
        variants={fadeUp}
        className="product-card group relative bg-[#161616] border border-white/5 hover-glow transition-all duration-300 p-3"
      >
      {/* Badges */}
      {product.sale && (
        <div className="absolute top-4 left-0 z-20 bg-[#ff5500] text-black px-4 py-1 font-headline text-sm clip-parallelogram">
          SALE
        </div>
      )}
      {product.isNew && (
        <div className="absolute top-4 left-0 z-20 border border-[#ff5500] text-[#ff5500] px-4 py-1 font-headline text-sm clip-parallelogram bg-black/80">
          NEW
        </div>
      )}

      {/* Image area */}
      <div className="relative aspect-square overflow-hidden mb-4">
        {hasImg ? (
          <>
            <img
              src={product.img1}
              alt={product.name}
              className="w-full h-full object-cover transition-opacity duration-500 group-hover:opacity-0"
            />
            <img
              src={product.img2}
              alt={`${product.name} detail`}
              className="absolute inset-0 w-full h-full object-cover opacity-0 transition-opacity duration-500 group-hover:opacity-100"
            />
          </>
        ) : (
          <ImgPlaceholder category={product.category} />
        )}

        {/* ORDER NOW button slides up on hover */}
          <div className="absolute inset-0 flex items-end justify-center pb-6">
            <span className="order-btn clip-parallelogram bg-white text-black px-8 py-2 font-headline text-xl hover:bg-[#ff5500] hover:text-white transition-colors">
              ORDER NOW
            </span>
          </div>
      </div>

      {/* Info */}
      <div className="space-y-1">
        <span className="font-technical text-[10px] text-[#ff5500] uppercase">{product.category}</span>
        <h4 className="text-white font-medium text-lg leading-tight truncate">{product.name}</h4>

        {/* Stars */}
        <div className="flex items-center gap-0.5 text-orange-500 text-xs">
          {[1, 2, 3, 4, 5].map((star) => (
            <span
              key={star}
              className="material-symbols-outlined"
              style={{
                fontSize: 14,
                fontVariationSettings: `'FILL' ${star <= product.rating ? 1 : 0}`,
              }}
            >
              star
            </span>
          ))}
        </div>

        {/* Price */}
        <div className="flex items-baseline gap-2 mt-2">
          <span className="font-headline text-2xl text-[#ff5500]">
            {product.price.toLocaleString('en-IN')}৳
          </span>
          {product.sale && product.originalPrice && (
            <span className="font-technical text-stone-600 text-xs line-through">
              {product.originalPrice.toLocaleString('en-IN')}৳
            </span>
          )}
        </div>
      </div>
      </motion.div>
    </Link>
  );
}

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

  /* Best Sellers filter */
  const [activeCategory, setActiveCategory] = useState('ALL');
  const filtered =
    activeCategory === 'ALL'
      ? products
      : products.filter((p) => p.category === activeCategory);

  /* FAQ */
  const [openFaq, setOpenFaq] = useState(null);

  return (
    <main>
      {/* ── 01 HERO ──────────────────────────────────────────── */}
      <section className="relative min-h-screen flex flex-col items-center justify-center orange-grid overflow-hidden pt-[calc(36px+80px)]">
        {/* Animated background paths */}
        <div className="absolute inset-0 text-[#ff5500]">
          <FloatingPaths position={1} />
          <FloatingPaths position={-1} />
        </div>

        {/* gradient fade to bg */}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#080808]/60 to-[#080808] pointer-events-none" />

        {/* Logo with glow */}
        <div className="relative w-64 h-64 md:w-96 md:h-96 z-10">
          <div className="absolute inset-0 bg-[#ff5500] blur-[120px] opacity-25 animate-pulse" />
          <img
            src="/logo.png"
            alt="Layercade"
            className="relative w-full h-full object-contain drop-shadow-[0_0_40px_rgba(255,85,0,0.5)]"
          />
        </div>

        {/* Headline + typewriter */}
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
            <a
              href="#collections"
              className="clip-parallelogram bg-[#ff5500] text-white px-12 py-4 font-headline text-3xl
                         hover:shadow-[0_0_30px_rgba(255,85,0,0.5)] transition-all flex items-center justify-center"
            >
              Shop Now
            </a>
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

        {/* Scroll indicator */}
        <div className="absolute bottom-10 flex flex-col items-center gap-2 z-20">
          <span className="font-technical text-[10px] text-stone-500 uppercase tracking-[0.2em]">
            Initiate Scroll
          </span>
          <div className="w-px h-12 bg-gradient-to-b from-[#ff5500] to-transparent" />
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
          <span className="font-technical text-[#ff5500] text-lg">01 — Collections</span>
          <h2 className="font-headline text-6xl md:text-8xl text-white mt-2">WHAT WE MAKE</h2>
          <div className="signature-divider mt-4 opacity-30" />
        </motion.div>

        <motion.div
          className="grid grid-cols-1 md:grid-cols-4 gap-6"
          variants={stagger}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: '-80px' }}
        >
          {COLLECTION_CARDS.map((card) => (
            <motion.div
              key={card.num}
              variants={fadeUp}
              transition={{ duration: 0.5 }}
              className={`group relative overflow-hidden border border-white/5 hover-glow cursor-pointer
                          ${card.span === 2 ? 'md:col-span-2 min-h-[400px]' : 'aspect-[4/5]'}
                          ${card.cosplay ? 'bg-transparent' : 'bg-[#161616]'}`}
            >
              {card.cosplay && (
                <div className="absolute inset-0 bg-orange-900/20 group-hover:bg-orange-900/40 transition-colors" />
              )}

              <div className="absolute inset-0 p-8 flex flex-col justify-between">
                <div className="flex justify-between items-start">
                  <span className="font-technical text-stone-500 text-sm">
                    {card.num} // {card.count}
                  </span>
                  <span
                    className="material-symbols-outlined text-[#ff5500] opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    arrow_outward
                  </span>
                </div>
                <div>
                  <h3
                    className={`font-headline text-white ${
                      card.span === 2 ? 'text-5xl' : 'text-4xl'
                    }`}
                  >
                    {card.title}
                  </h3>
                  <p className="text-stone-400 opacity-0 group-hover:opacity-100 translate-y-4 group-hover:translate-y-0 transition-all duration-300">
                    {card.sub}
                  </p>
                </div>
              </div>
            </motion.div>
          ))}

          {/* Card 8 — Custom Orders */}
          <motion.div
            variants={fadeUp}
            transition={{ duration: 0.5 }}
            className="group relative md:col-span-2 min-h-[400px] bg-[#ff5500] overflow-hidden hover:bg-[#ff5500]/90 transition-colors cursor-pointer"
          >
            <div className="absolute inset-0 flex items-center justify-center opacity-10 overflow-hidden">
              <span className="font-headline text-[20rem] text-black leading-none select-none">
                CUSTOM
              </span>
            </div>
            <div className="absolute inset-0 p-8 flex flex-col justify-between">
              <div className="flex justify-between items-start">
                <span className="font-technical text-black/60 text-sm">08 // UNLIMITED</span>
                <span className="material-symbols-outlined text-black">arrow_outward</span>
              </div>
              <div>
                <h3 className="font-headline text-7xl text-black">CUSTOM ORDERS</h3>
                <p className="text-black/80 text-xl font-medium">
                  Have a specific file? We print it for you.
                </p>
              </div>
            </div>
          </motion.div>
        </motion.div>
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
                <span className="font-technical text-[#ff5500] text-lg">02 — Top Picks</span>
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
            <a
              href="#collections"
              className="clip-parallelogram bg-[#ff5500] text-white px-12 py-4 font-headline text-3xl
                         hover:shadow-[0_0_30px_rgba(255,85,0,0.5)] transition-all flex items-center justify-center"
            >
              Shop Now
            </a>
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
          <span className="font-technical text-[#ff5500] text-lg">03 — Fresh Drops</span>
          <h2 className="font-headline text-6xl md:text-8xl text-white mt-2">NEW ARRIVALS</h2>
          <div className="signature-divider mt-4 opacity-30" />
        </motion.div>

        <motion.div
          className="grid grid-cols-1 md:grid-cols-3 gap-6"
          variants={stagger}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: '-60px' }}
        >
          {newArrivals.map((item, i) => (
            <motion.div
              key={item.id}
              variants={fadeUp}
              transition={{ duration: 0.5 }}
              className={`relative min-h-[300px] overflow-hidden border border-white/5 group
                          hover-glow p-8 flex flex-col justify-between cursor-pointer
                          ${i === 1 ? 'bg-stone-900' : 'bg-[#161616]'}`}
            >
              <div className="flex justify-between items-start">
                <span className="font-headline text-[#ff5500] text-xl">NEW</span>
                <span className="font-headline text-white text-3xl">
                  {item.price.toLocaleString('en-IN')}৳
                </span>
              </div>
              <div>
                <h3 className="font-headline text-5xl text-white mb-2">{item.name}</h3>
                <p className="font-technical text-stone-500 text-xs uppercase tracking-widest">
                  {item.series}
                </p>
              </div>
            </motion.div>
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
            <span className="font-technical text-[#ff5500] text-lg">04 — Reviews</span>
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

      {/* ── 06.5 INTERACTIVE SHOWCASE ────────────────────────── */}
      <section className="relative w-full h-screen overflow-hidden bg-[#080808]">
        <InteractiveRobotSpline
          scene={ROBOT_SCENE_URL}
          className="absolute inset-0 w-full h-full z-0"
        />
        <div className="absolute top-0 inset-x-0 h-24 bg-gradient-to-b from-[#111111] to-transparent pointer-events-none z-10" />
        <div className="absolute bottom-0 inset-x-0 h-32 bg-gradient-to-t from-[#080808] to-transparent pointer-events-none z-10" />
        <div className="absolute bottom-10 left-8 z-20 pointer-events-none">
          <span className="font-technical text-[10px] text-stone-600 uppercase tracking-widest">
            // INTERACTIVE — DRAG TO EXPLORE
          </span>
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
          <span className="font-technical text-[#ff5500] text-lg uppercase">05 — FAQ</span>
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
