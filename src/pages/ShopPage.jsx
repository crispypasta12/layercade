import { useState, useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { CATEGORIES, slugToCategory } from '../lib/categories';
import { fetchProductsByCategory } from '../data/products';
import ProductCard, { fadeUp } from '../components/ProductCard';

const PER_PAGE = 12;

const stagger = {
  hidden: {},
  show:   { transition: { staggerChildren: 0.06 } },
};

/* ─── Pagination ─────────────────────────────────────────────────── */
function Pagination({ page, totalPages, onPage }) {
  if (totalPages <= 1) return null;

  const pages = Array.from({ length: totalPages }, (_, i) => i + 1);

  return (
    <div className="mt-16 flex items-center justify-center gap-2 flex-wrap">
      <button
        onClick={() => onPage(page - 1)}
        disabled={page === 1}
        aria-label="Previous page"
        className="flex items-center justify-center w-10 h-10 border border-white/10
                   text-stone-400 hover:border-[#ff5500] hover:text-[#ff5500] transition-colors
                   disabled:opacity-30 disabled:cursor-not-allowed"
      >
        <span className="material-symbols-outlined" style={{ fontSize: 20 }}>chevron_left</span>
      </button>

      {pages.map((p) => {
        const show = p === 1 || p === totalPages || Math.abs(p - page) <= 1;
        const showEllipsisBefore = p === 2 && page > 4;
        const showEllipsisAfter  = p === totalPages - 1 && page < totalPages - 3;

        if (showEllipsisBefore) {
          return <span key={`el-${p}`} className="text-stone-600 px-1 select-none">…</span>;
        }
        if (showEllipsisAfter) {
          return <span key={`el-${p}`} className="text-stone-600 px-1 select-none">…</span>;
        }
        if (!show) return null;

        return (
          <button
            key={p}
            onClick={() => onPage(p)}
            className={`w-10 h-10 font-technical text-sm transition-colors ${
              p === page
                ? 'bg-[#ff5500] text-white'
                : 'border border-white/10 text-stone-400 hover:border-[#ff5500] hover:text-[#ff5500]'
            }`}
          >
            {p}
          </button>
        );
      })}

      <button
        onClick={() => onPage(page + 1)}
        disabled={page === totalPages}
        aria-label="Next page"
        className="flex items-center justify-center w-10 h-10 border border-white/10
                   text-stone-400 hover:border-[#ff5500] hover:text-[#ff5500] transition-colors
                   disabled:opacity-30 disabled:cursor-not-allowed"
      >
        <span className="material-symbols-outlined" style={{ fontSize: 20 }}>chevron_right</span>
      </button>
    </div>
  );
}

/* ─── Skeleton cards ─────────────────────────────────────────────── */
function SkeletonGrid() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
      {Array.from({ length: PER_PAGE }).map((_, i) => (
        <div key={i} className="bg-[#161616] border border-white/5 p-3 animate-pulse">
          <div className="aspect-square bg-white/5 mb-4" />
          <div className="h-2.5 bg-white/5 w-1/3 mb-2" />
          <div className="h-5 bg-white/5 w-3/4 mb-2" />
          <div className="h-4 bg-white/5 w-1/4 mb-4" />
          <div className="h-10 bg-white/5 w-full" />
        </div>
      ))}
    </div>
  );
}

/* ─── Main page ──────────────────────────────────────────────────── */
export default function ShopPage() {
  const { categorySlug } = useParams();
  const location = useLocation();
  const navigate = useNavigate();

  const activeCategory = categorySlug ? slugToCategory(categorySlug) : null;
  const [page, setPage]       = useState(1);
  const [products, setProducts] = useState([]);
  const [total, setTotal]     = useState(0);
  const [loading, setLoading] = useState(true);

  // Scroll category tabs into view on mobile when active changes
  const activeTabRef = useRef(null);
  useEffect(() => {
    activeTabRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
  }, [categorySlug]);

  // Reset to page 1 when category changes
  useEffect(() => {
    setPage(1);
  }, [categorySlug]);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);

    fetchProductsByCategory({ category: activeCategory, page, perPage: PER_PAGE })
      .then(({ products: p, total: t }) => {
        if (!isMounted) return;
        setProducts(p);
        setTotal(t);
        setLoading(false);
      });

    return () => { isMounted = false; };
  }, [activeCategory, page]);

  const totalPages = Math.ceil(total / PER_PAGE);

  const handleCategory = (slug) => {
    setPage(1);
    navigate(slug ? `/shop/${slug}` : '/shop');
  };

  const handlePage = (p) => {
    setPage(p);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const pageTitle = activeCategory ? activeCategory.toUpperCase() : 'ALL PRODUCTS';

  return (
    <main className="pt-44 pb-24 px-4 md:px-8 max-w-7xl mx-auto">
      {/* ── Header ─────────────────────────────────────────────── */}
      <div className="mb-12">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 font-technical text-[10px] uppercase tracking-[0.25em] text-stone-500 mb-6">
          <Link to="/" className="hover:text-[#ff5500] transition-colors">Home</Link>
          <span>/</span>
          <Link to="/shop" className="hover:text-[#ff5500] transition-colors">Shop</Link>
          {activeCategory && (
            <>
              <span>/</span>
              <span className="text-white">{activeCategory}</span>
            </>
          )}
        </nav>

        <span className="font-technical text-[#ff5500] text-lg">
          {activeCategory ? 'Category' : 'All Products'}
        </span>
        <h1 className="font-headline text-6xl md:text-8xl text-white mt-2 leading-none">
          {pageTitle}
        </h1>
        {!loading && total > 0 && (
          <p className="font-technical text-[10px] text-stone-500 uppercase tracking-[0.25em] mt-3">
            {total} {total === 1 ? 'product' : 'products'}
            {totalPages > 1 && ` — page ${page} of ${totalPages}`}
          </p>
        )}
        <div className="signature-divider mt-4 opacity-30" />
      </div>

      <div className="flex gap-10 items-start">
        {/* ── Sidebar (desktop) ───────────────────────────────── */}
        <aside className="hidden lg:block w-52 flex-shrink-0 sticky top-32">
          <p className="font-technical text-[10px] uppercase tracking-[0.3em] text-stone-500 mb-3">
            Categories
          </p>
          <ul className="space-y-0.5">
            <li>
              <button
                onClick={() => handleCategory(null)}
                className={`w-full text-left px-4 py-2.5 font-technical text-xs uppercase tracking-wide transition-colors ${
                  !activeCategory
                    ? 'bg-[#ff5500] text-white'
                    : 'text-stone-400 hover:text-white hover:bg-white/5'
                }`}
              >
                All Products
              </button>
            </li>
            {CATEGORIES.map((cat) => (
              <li key={cat.slug}>
                <button
                  onClick={() => handleCategory(cat.slug)}
                  className={`w-full text-left px-4 py-2.5 font-technical text-xs uppercase tracking-wide transition-colors ${
                    activeCategory === cat.name
                      ? 'bg-[#ff5500] text-white'
                      : 'text-stone-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  {cat.name}
                </button>
              </li>
            ))}
          </ul>
        </aside>

        {/* ── Main content ─────────────────────────────────────── */}
        <div className="flex-1 min-w-0">
          {/* Mobile category tabs */}
          <div className="lg:hidden mb-8 -mx-4 px-4 overflow-x-auto scrollbar-hide">
            <div className="flex gap-2 pb-2 min-w-max">
              <button
                ref={!activeCategory ? activeTabRef : null}
                onClick={() => handleCategory(null)}
                className={`flex-shrink-0 px-5 py-2 font-technical text-[10px] uppercase tracking-wider clip-parallelogram transition-all ${
                  !activeCategory
                    ? 'bg-[#ff5500] text-white'
                    : 'border border-stone-700 text-stone-400 hover:border-[#ff5500] hover:text-white'
                }`}
              >
                All
              </button>
              {CATEGORIES.map((cat) => (
                <button
                  key={cat.slug}
                  ref={activeCategory === cat.name ? activeTabRef : null}
                  onClick={() => handleCategory(cat.slug)}
                  className={`flex-shrink-0 px-5 py-2 font-technical text-[10px] uppercase tracking-wider clip-parallelogram transition-all ${
                    activeCategory === cat.name
                      ? 'bg-[#ff5500] text-white'
                      : 'border border-stone-700 text-stone-400 hover:border-[#ff5500] hover:text-white'
                  }`}
                >
                  {cat.name}
                </button>
              ))}
            </div>
          </div>

          {/* Product grid */}
          {loading ? (
            <SkeletonGrid />
          ) : products.length === 0 ? (
            <div className="py-24 text-center border border-white/5 bg-[#111111]">
              <p className="font-technical text-[10px] uppercase tracking-[0.3em] text-[#ff5500] mb-4">
                Nothing here yet
              </p>
              <h2 className="font-headline text-4xl text-white mb-6">
                {activeCategory ? `No ${activeCategory} products yet` : 'No products yet'}
              </h2>
              {activeCategory && (
                <button
                  onClick={() => handleCategory(null)}
                  className="clip-parallelogram border border-[#ff5500]/40 px-8 py-3 font-headline text-xl
                             text-white hover:bg-[#ff5500]/10 transition-colors"
                >
                  Browse All Products
                </button>
              )}
            </div>
          ) : (
            <AnimatePresence mode="wait">
              <motion.div
                key={`${categorySlug ?? 'all'}-${page}`}
                className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"
                variants={stagger}
                initial="hidden"
                animate="show"
                exit={{ opacity: 0, transition: { duration: 0.15 } }}
              >
                {products.map((product) => (
                  <ProductCard key={product.id} product={product} location={location} />
                ))}
              </motion.div>
            </AnimatePresence>
          )}

          <Pagination page={page} totalPages={totalPages} onPage={handlePage} />
        </div>
      </div>
    </main>
  );
}
