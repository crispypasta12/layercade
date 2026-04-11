import { useEffect } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { productsBySlug } from '../data/products';

function DetailRow({ label, value }) {
  return (
    <div className="border-t border-white/10 pt-4">
      <p className="font-technical text-[10px] uppercase tracking-[0.3em] text-stone-500">{label}</p>
      <p className="mt-2 text-stone-200">{value}</p>
    </div>
  );
}

export default function ProductModalPage() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const product = productsBySlug[slug];
  const isOverlay = Boolean(location.state?.backgroundLocation);

  useEffect(() => {
    if (!isOverlay) return;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, [isOverlay]);

  if (!product) {
    return (
      <main className="min-h-screen pt-44 pb-24 px-8 max-w-4xl mx-auto">
        <div className="border border-white/10 bg-[#111111] p-10 text-center">
          <p className="font-technical text-[10px] uppercase tracking-[0.3em] text-[#ff5500]">404</p>
          <h1 className="mt-4 font-headline text-5xl text-white">PRODUCT NOT FOUND</h1>
          <Link
            to="/"
            className="mt-8 inline-flex clip-parallelogram bg-[#ff5500] px-8 py-3 font-headline text-2xl text-black"
          >
            Back Home
          </Link>
        </div>
      </main>
    );
  }

  return (
    <motion.div
      className={isOverlay ? 'fixed inset-0 z-[120] bg-black/70 backdrop-blur-sm p-4 md:p-8' : 'pt-44 pb-24 px-8 max-w-6xl mx-auto'}
      onClick={isOverlay ? () => navigate(-1) : undefined}
      initial={isOverlay ? { opacity: 0 } : false}
      animate={isOverlay ? { opacity: 1 } : false}
      exit={isOverlay ? { opacity: 0 } : undefined}
      transition={{ duration: 0.2 }}
    >
      <motion.article
        className={`${isOverlay ? 'mx-auto max-w-6xl max-h-[calc(100vh-2rem)] overflow-y-auto' : ''} border border-white/10 bg-[#111111] shadow-[0_20px_80px_rgba(0,0,0,0.45)]`}
        onClick={(event) => event.stopPropagation()}
        initial={isOverlay ? { scale: 0.95, opacity: 0 } : false}
        animate={isOverlay ? { scale: 1, opacity: 1 } : false}
        exit={isOverlay ? { scale: 0.95, opacity: 0 } : undefined}
        transition={{ duration: 0.25, ease: 'easeOut' }}
      >
        <div className="grid grid-cols-1 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="bg-[#161616]">
            <div className="aspect-square">
              <img
                src={product.img1}
                alt={product.name}
                className="h-full w-full object-cover"
              />
            </div>
            {product.img2 && product.img2 !== product.img1 && (
              <div className="border-t border-white/10">
                <div className="aspect-[4/3]">
                  <img
                    src={product.img2}
                    alt={`${product.name} alternate view`}
                    className="h-full w-full object-cover"
                  />
                </div>
              </div>
            )}
          </div>

          <div className="p-6 md:p-10">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="font-technical text-[10px] uppercase tracking-[0.3em] text-[#ff5500]">
                  {product.category}
                </p>
                <h1 className="mt-3 font-headline text-5xl md:text-6xl leading-none text-white">
                  {product.name}
                </h1>
              </div>
              <button
                type="button"
                onClick={() => navigate(isOverlay ? -1 : '/')}
                className="flex h-12 w-12 items-center justify-center border border-white/10 text-stone-300 transition-colors hover:border-[#ff5500] hover:text-[#ff5500]"
                aria-label="Close product details"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="mt-6 flex items-end gap-3">
              <p className="font-headline text-4xl text-[#ff5500]">
                {product.price.toLocaleString('en-IN')} BDT
              </p>
              {product.originalPrice && (
                <p className="pb-1 font-technical text-sm text-stone-500 line-through">
                  {product.originalPrice.toLocaleString('en-IN')} BDT
                </p>
              )}
            </div>

            <div className="mt-4 flex items-center gap-3 text-sm text-stone-400">
              <div className="flex items-center gap-0.5 text-orange-500">
                {[1, 2, 3, 4, 5].map((star) => (
                  <span
                    key={star}
                    className="material-symbols-outlined"
                    style={{
                      fontSize: 16,
                      fontVariationSettings: `'FILL' ${star <= product.rating ? 1 : 0}`,
                    }}
                  >
                    star
                  </span>
                ))}
              </div>
              <span>{product.reviews} reviews</span>
            </div>

            <p className="mt-8 text-base leading-7 text-stone-300">
              {product.description}
            </p>

            <div className="mt-10 space-y-5">
              <DetailRow label="Material" value={product.material} />
              <DetailRow label="Color" value={product.color} />
              <DetailRow label="Subtype" value={product.subcategory} />
            </div>

            <div className="mt-10 flex flex-col gap-4 sm:flex-row">
              <Link
                to="/quote"
                className="clip-parallelogram inline-flex items-center justify-center bg-[#ff5500] px-8 py-4 font-headline text-2xl text-black"
              >
                Get a Quote
              </Link>
              <Link
                to="/gallery"
                className="clip-parallelogram inline-flex items-center justify-center border border-[#ff5500]/40 px-8 py-4 font-headline text-2xl text-white transition-colors hover:bg-[#ff5500]/10"
              >
                View Gallery
              </Link>
            </div>
          </div>
        </div>
      </motion.article>
    </motion.div>
  );
}
