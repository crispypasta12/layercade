import { useState, useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useCategories } from '../lib/useCategories';
import { fetchProductsByCategory } from '../data/products';
import ProductCard, { fadeUp } from '../components/ProductCard';

const PER_PAGE = 12;

const SORT_OPTIONS = [
  { value: 'featured',   label: 'Featured' },
  { value: 'price_asc',  label: 'Price: Low → High' },
  { value: 'price_desc', label: 'Price: High → Low' },
  { value: 'newest',     label: 'New Arrivals First' },
  { value: 'name_asc',   label: 'Name: A → Z' },
  { value: 'name_desc',  label: 'Name: Z → A' },
];

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

/* ─── Filter bar ─────────────────────────────────────────────────── */
function FilterBar({ sort, onSort, priceMin, priceMax, onApplyPrice, onClear, hasActiveFilters }) {
  const [minInput, setMinInput] = useState(priceMin !== null ? String(priceMin) : '');
  const [maxInput, setMaxInput] = useState(priceMax !== null ? String(priceMax) : '');

  // Sync inputs when parent clears filters
  useEffect(() => { if (priceMin === null) setMinInput(''); }, [priceMin]);
  useEffect(() => { if (priceMax === null) setMaxInput(''); }, [priceMax]);

  const handleApply = () => onApplyPrice(minInput, maxInput);

  return (
    <div className="mb-8 border-b border-white/5 pb-6">
      <div className="flex flex-wrap items-end gap-3">
        {/* ── Sort ── */}
        <div className="flex flex-col gap-1.5">
          <span className="font-technical text-[9px] uppercase tracking-[0.25em] text-stone-500">
            Sort By
          </span>
          <div className="relative">
            <select
              value={sort}
              onChange={(e) => onSort(e.target.value)}
              className="appearance-none bg-[#111111] border border-white/10 text-stone-300
                         font-technical text-[11px] uppercase tracking-wider
                         pl-4 pr-9 py-2.5 min-w-[190px]
                         hover:border-white/20 focus:border-[#ff5500] focus:outline-none
                         transition-colors cursor-pointer"
            >
              {SORT_OPTIONS.map((o) => (
                <option key={o.value} value={o.value} className="bg-[#111111] normal-case tracking-normal">
                  {o.label}
                </option>
              ))}
            </select>
            <span
              className="material-symbols-outlined absolute right-2.5 top-1/2 -translate-y-1/2
                         pointer-events-none text-stone-500"
              style={{ fontSize: 16 }}
            >
              expand_more
            </span>
          </div>
        </div>

        {/* ── Price Range ── */}
        <div className="flex flex-col gap-1.5">
          <span className="font-technical text-[9px] uppercase tracking-[0.25em] text-stone-500">
            Price Range (৳)
          </span>
          <div className="flex items-center gap-2">
            <input
              type="number"
              min="0"
              placeholder="Min"
              value={minInput}
              onChange={(e) => setMinInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleApply()}
              className="w-[88px] bg-[#111111] border border-white/10 text-stone-300
                         font-technical text-[11px] px-3 py-2.5
                         focus:border-[#ff5500] focus:outline-none transition-colors
                         placeholder:text-stone-700"
            />
            <span className="text-stone-600 font-technical text-xs select-none">—</span>
            <input
              type="number"
              min="0"
              placeholder="Max"
              value={maxInput}
              onChange={(e) => setMaxInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleApply()}
              className="w-[88px] bg-[#111111] border border-white/10 text-stone-300
                         font-technical text-[11px] px-3 py-2.5
                         focus:border-[#ff5500] focus:outline-none transition-colors
                         placeholder:text-stone-700"
            />
            <button
              onClick={handleApply}
              className="px-4 py-2.5 bg-[#ff5500] text-white font-technical text-[10px]
                         uppercase tracking-wider hover:bg-[#e64d00] transition-colors"
            >
              Apply
            </button>
          </div>
        </div>

        {/* ── Clear all ── */}
        {hasActiveFilters && (
          <button
            onClick={() => { setMinInput(''); setMaxInput(''); onClear(); }}
            className="flex items-center gap-1.5 self-end px-4 py-2.5 border border-white/10
                       text-stone-500 font-technical text-[10px] uppercase tracking-wider
                       hover:border-[#ff5500]/40 hover:text-[#ff5500] transition-colors"
          >
            <span className="material-symbols-outlined" style={{ fontSize: 12 }}>close</span>
            Clear
          </button>
        )}
      </div>

      {/* ── Active filter pills ── */}
      {hasActiveFilters && (
        <div className="flex flex-wrap gap-2 mt-3">
          {sort !== 'featured' && (
            <span className="flex items-center gap-1.5 px-3 py-1 border border-[#ff5500]/30
                             bg-[#ff5500]/5 font-technical text-[10px] uppercase tracking-wider text-[#ff5500]">
              <span className="material-symbols-outlined" style={{ fontSize: 11 }}>swap_vert</span>
              {SORT_OPTIONS.find((o) => o.value === sort)?.label}
            </span>
          )}
          {(priceMin !== null || priceMax !== null) && (
            <span className="flex items-center gap-1.5 px-3 py-1 border border-[#ff5500]/30
                             bg-[#ff5500]/5 font-technical text-[10px] uppercase tracking-wider text-[#ff5500]">
              <span className="material-symbols-outlined" style={{ fontSize: 11 }}>payments</span>
              {priceMin !== null ? `৳${priceMin.toLocaleString('en-IN')}` : '—'}
              {' '}–{' '}
              {priceMax !== null ? `৳${priceMax.toLocaleString('en-IN')}` : '—'}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

/* ─── Main page ──────────────────────────────────────────────────── */
export default function ShopPage() {
  const { categorySlug } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { categories, loading: categoriesLoading } = useCategories();

  const slugToCategory = (slug) => categories.find((c) => c.slug === slug)?.name ?? null;
  const activeCategory = categorySlug ? slugToCategory(categorySlug) : null;

  const [page, setPage]         = useState(1);
  const [products, setProducts] = useState([]);
  const [total, setTotal]       = useState(0);
  const [loading, setLoading]   = useState(true);

  // Filter state
  const [sort, setSort]         = useState('featured');
  const [priceMin, setPriceMin] = useState(null);
  const [priceMax, setPriceMax] = useState(null);

  const hasActiveFilters = sort !== 'featured' || priceMin !== null || priceMax !== null;

  // Scroll active category tab into view on mobile
  const activeTabRef = useRef(null);
  useEffect(() => {
    activeTabRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
  }, [categorySlug]);

  // Reset to page 1 and clear filters when category changes
  useEffect(() => {
    setPage(1);
    setSort('featured');
    setPriceMin(null);
    setPriceMax(null);
  }, [categorySlug]);

  useEffect(() => {
    // Wait for categories to resolve before fetching when a slug is in the URL
    if (categorySlug && categoriesLoading) return;

    let isMounted = true;
    setLoading(true);

    fetchProductsByCategory({
      category: activeCategory,
      page,
      perPage: PER_PAGE,
      sort,
      priceMin,
      priceMax,
    }).then(({ products: p, total: t }) => {
      if (!isMounted) return;
      setProducts(p);
      setTotal(t);
      setLoading(false);
    });

    return () => { isMounted = false; };
  }, [activeCategory, page, categorySlug, categoriesLoading, sort, priceMin, priceMax]);

  const totalPages = Math.ceil(total / PER_PAGE);

  const handleCategory = (slug) => {
    setPage(1);
    navigate(slug ? `/shop/${slug}` : '/shop');
  };

  const handlePage = (p) => {
    setPage(p);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSort = (newSort) => {
    setSort(newSort);
    setPage(1);
  };

  const handleApplyPrice = (minStr, maxStr) => {
    setPriceMin(minStr ? Number(minStr) : null);
    setPriceMax(maxStr ? Number(maxStr) : null);
    setPage(1);
  };

  const handleClearFilters = () => {
    setSort('featured');
    setPriceMin(null);
    setPriceMax(null);
    setPage(1);
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
            {categories.map((cat) => (
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
              {categories.map((cat) => (
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

          {/* Filter bar */}
          <FilterBar
            sort={sort}
            onSort={handleSort}
            priceMin={priceMin}
            priceMax={priceMax}
            onApplyPrice={handleApplyPrice}
            onClear={handleClearFilters}
            hasActiveFilters={hasActiveFilters}
          />

          {/* Product grid */}
          {loading ? (
            <SkeletonGrid />
          ) : products.length === 0 ? (
            <div className="py-24 text-center border border-white/5 bg-[#111111]">
              <p className="font-technical text-[10px] uppercase tracking-[0.3em] text-[#ff5500] mb-4">
                Nothing here yet
              </p>
              <h2 className="font-headline text-4xl text-white mb-6">
                {hasActiveFilters
                  ? 'No products match your filters'
                  : activeCategory
                    ? `No ${activeCategory} products yet`
                    : 'No products yet'}
              </h2>
              {(hasActiveFilters || activeCategory) && (
                <div className="flex flex-col items-center gap-3">
                  {hasActiveFilters && (
                    <button
                      onClick={handleClearFilters}
                      className="clip-parallelogram border border-[#ff5500]/40 px-8 py-3 font-headline text-xl
                                 text-white hover:bg-[#ff5500]/10 transition-colors"
                    >
                      Clear Filters
                    </button>
                  )}
                  {activeCategory && (
                    <button
                      onClick={() => handleCategory(null)}
                      className="clip-parallelogram border border-white/10 px-8 py-3 font-headline text-xl
                                 text-stone-400 hover:text-white hover:bg-white/5 transition-colors"
                    >
                      Browse All Products
                    </button>
                  )}
                </div>
              )}
            </div>
          ) : (
            <AnimatePresence mode="wait">
              <motion.div
                key={`${categorySlug ?? 'all'}-${page}-${sort}-${priceMin}-${priceMax}`}
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
