import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { searchProducts } from '../data/products';

export default function SearchOverlay({ onClose }) {
  const [query, setQuery]               = useState('');
  const [results, setResults]           = useState([]);
  const [loading, setLoading]           = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [searched, setSearched]         = useState(false);

  const inputRef    = useRef(null);
  const debounceRef = useRef(null);
  const listRef     = useRef(null);
  const navigate    = useNavigate();

  // Focus input on mount
  useEffect(() => { inputRef.current?.focus(); }, []);

  // ESC closes
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  // Lock body scroll
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  // Scroll selected result into view
  useEffect(() => {
    if (selectedIndex < 0) return;
    listRef.current
      ?.children[selectedIndex]
      ?.scrollIntoView({ block: 'nearest' });
  }, [selectedIndex]);

  const runSearch = (val) => {
    clearTimeout(debounceRef.current);
    const trimmed = val.trim();

    if (!trimmed) {
      setResults([]);
      setLoading(false);
      setSearched(false);
      return;
    }

    setLoading(true);
    debounceRef.current = setTimeout(async () => {
      const products = await searchProducts(trimmed);
      setResults(products);
      setLoading(false);
      setSearched(true);
    }, 220);
  };

  const handleChange = (e) => {
    const val = e.target.value;
    setQuery(val);
    setSelectedIndex(-1);
    runSearch(val);
  };

  const handleSelect = (product) => {
    onClose();
    navigate(`/products/${product.slug}`);
  };

  const handleKeyDown = (e) => {
    if (!results.length) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((i) => Math.max(i - 1, -1));
    } else if (e.key === 'Enter' && selectedIndex >= 0) {
      handleSelect(results[selectedIndex]);
    }
  };

  const hasQuery   = query.trim().length > 0;
  const noResults  = searched && !loading && hasQuery && results.length === 0;
  const showHints  = !hasQuery;

  return (
    <motion.div
      className="fixed inset-0 z-[150] flex flex-col"
      style={{ backgroundColor: 'rgba(0,0,0,0.97)' }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.15 }}
      onClick={onClose}
    >
      {/* ── Content panel — stop propagation so clicks inside don't close ── */}
      <div
        className="relative w-full max-w-3xl mx-auto px-6 pt-28 flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Input row ─────────────────────────────────────────────────── */}
        <div className="flex items-center gap-4 border-b-2 border-[#ff5500] pb-5">
          <span
            className="material-symbols-outlined text-[#ff5500] flex-shrink-0"
            style={{ fontSize: 26 }}
          >
            search
          </span>

          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            placeholder="Search products…"
            autoComplete="off"
            className="flex-1 bg-transparent text-white placeholder:text-stone-700
                       font-headline text-4xl md:text-5xl focus:outline-none"
          />

          {loading && (
            <span
              className="material-symbols-outlined text-stone-600 animate-spin flex-shrink-0"
              style={{ fontSize: 20 }}
            >
              progress_activity
            </span>
          )}

          <button
            onClick={onClose}
            aria-label="Close search"
            className="flex-shrink-0 text-stone-600 hover:text-stone-300 transition-colors p-1"
          >
            <span className="material-symbols-outlined" style={{ fontSize: 22 }}>close</span>
          </button>
        </div>

        {/* ── Results list ──────────────────────────────────────────────── */}
        <div
          ref={listRef}
          className="mt-2 overflow-y-auto"
          style={{ maxHeight: 'calc(100dvh - 260px)' }}
        >
          <AnimatePresence mode="wait">
            {noResults && (
              <motion.p
                key="no-results"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="py-12 text-center font-technical text-[10px] uppercase
                           tracking-[0.3em] text-stone-600"
              >
                No products found for &ldquo;{query}&rdquo;
              </motion.p>
            )}

            {results.length > 0 && (
              <motion.div
                key="results"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
              >
                {results.map((product, i) => (
                  <button
                    key={product.id}
                    onClick={() => handleSelect(product)}
                    onMouseEnter={() => setSelectedIndex(i)}
                    className={`w-full flex items-center gap-5 px-4 py-3.5 text-left
                               border-b border-white/5 transition-colors group ${
                      i === selectedIndex
                        ? 'bg-[#ff5500]/10 border-l-2 border-l-[#ff5500] pl-[14px]'
                        : 'hover:bg-white/[0.03] border-l-2 border-l-transparent'
                    }`}
                  >
                    {/* Thumbnail */}
                    <div className="w-14 h-14 flex-shrink-0 border border-white/10 overflow-hidden bg-[#161616]">
                      {product.img1 ? (
                        <img
                          src={product.img1}
                          alt={product.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <span
                            className="material-symbols-outlined text-stone-700"
                            style={{ fontSize: 18 }}
                          >
                            image
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="font-technical text-[10px] uppercase tracking-[0.2em] text-[#ff5500]">
                        {product.category}
                      </p>
                      <h4 className="font-headline text-2xl text-white leading-snug truncate">
                        {product.name}
                      </h4>
                    </div>

                    {/* Price */}
                    <p className="font-headline text-xl text-stone-400 group-hover:text-[#ff5500] flex-shrink-0 transition-colors">
                      {product.price.toLocaleString('en-IN')}৳
                    </p>

                    <span
                      className={`material-symbols-outlined flex-shrink-0 transition-colors ${
                        i === selectedIndex ? 'text-[#ff5500]' : 'text-stone-700 group-hover:text-stone-500'
                      }`}
                      style={{ fontSize: 17 }}
                    >
                      arrow_forward
                    </span>
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* ── Keyboard hints (shown when input is empty) ─────────────── */}
        {showHints && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="mt-10 flex flex-wrap items-center justify-center gap-6"
          >
            {[
              { key: 'ESC',  label: 'Close' },
              { key: '↑↓',   label: 'Navigate' },
              { key: '↵',    label: 'Select' },
            ].map(({ key, label }) => (
              <span
                key={key}
                className="flex items-center gap-2 font-technical text-[10px]
                           uppercase tracking-[0.2em] text-stone-700"
              >
                <kbd className="border border-white/10 px-2 py-0.5 text-stone-500 font-mono text-[11px]">
                  {key}
                </kbd>
                {label}
              </span>
            ))}
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}
