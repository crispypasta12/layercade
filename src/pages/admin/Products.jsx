import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../../lib/supabase';
import AdminNavbar from '../../components/admin/AdminNavbar';
import ProductFormModal from '../../components/admin/ProductFormModal';
import DeleteConfirmModal from '../../components/admin/DeleteConfirmModal';
import Toast from '../../components/Toast';

function parseProductImages(imageValue, imagesValue) {
  if (Array.isArray(imagesValue)) {
    return imagesValue.filter((value) => typeof value === 'string' && value.trim());
  }

  if (typeof imageValue === 'string') {
    const trimmed = imageValue.trim();
    if (!trimmed) return [];

    if (trimmed.startsWith('[')) {
      try {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed)) {
          return parsed.filter((value) => typeof value === 'string' && value.trim());
        }
      } catch {
        // Fall back to plain string if stored value is not valid JSON.
      }
    }

    return [trimmed];
  }

  return [];
}

/* ─── Constants ──────────────────────────────────────────────────── */

const CATEGORIES = [
  'All Categories',
  'Gaming Accessories',
  'Collectibles',
  'Masks',
  'Headphone Gear',
  'Sculptures',
  'Custom',
];

const STOCK_OPTIONS = [
  { value: 'all',          label: 'All Stock' },
  { value: 'in_stock',     label: 'In Stock' },
  { value: 'out_of_stock', label: 'Out of Stock' },
  { value: 'low_stock',    label: 'Low Stock' },
];

const STOCK_COLORS = {
  in_stock:     { bg: 'bg-green-500/20',  text: 'text-green-400',  label: 'In Stock' },
  out_of_stock: { bg: 'bg-red-500/20',    text: 'text-red-400',    label: 'Out of Stock' },
  low_stock:    { bg: 'bg-yellow-500/20', text: 'text-yellow-400', label: 'Low Stock' },
};

/* ─── Helpers ────────────────────────────────────────────────────── */

function StockBadge({ status }) {
  const s = STOCK_COLORS[status] ?? { bg: 'bg-stone-800', text: 'text-stone-400', label: status };
  return (
    <span className={`inline-block px-2 py-0.5 text-[10px] font-technical uppercase tracking-widest ${s.bg} ${s.text}`}>
      {s.label}
    </span>
  );
}

function CategoryBadge({ category }) {
  return (
    <span className="inline-block px-2 py-0.5 text-[10px] font-technical uppercase tracking-widest bg-blue-500/20 text-blue-400">
      {category}
    </span>
  );
}

function StatCard({ icon, label, value, accent }) {
  return (
    <div className="bg-[#111111] border border-white/10 p-6 flex flex-col gap-2">
      <span className="material-symbols-outlined text-stone-500" style={{ fontSize: 22 }}>{icon}</span>
      <span
        className="font-headline text-3xl"
        style={{ color: accent ? '#ff5500' : '#ffffff', fontFamily: "'Bebas Neue', sans-serif" }}
      >
        {value}
      </span>
      <span className="font-technical text-[10px] text-white/60 uppercase tracking-widest">{label}</span>
    </div>
  );
}

/* ─── Main component ─────────────────────────────────────────────── */

export default function AdminProducts() {
  const [products,   setProducts]   = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState(null);

  // Filters
  const [categoryFilter, setCategoryFilter] = useState('All Categories');
  const [stockFilter,    setStockFilter]    = useState('all');
  const [searchInput,    setSearchInput]    = useState('');
  const [search,         setSearch]         = useState('');
  const [isSearching,    setIsSearching]    = useState(false);
  const debounceRef = useRef(null);

  // Modal + toast state
  const [showProductModal, setShowProductModal] = useState(false);
  const [editingProduct,   setEditingProduct]   = useState(null);
  const [deletingProduct,  setDeletingProduct]  = useState(null);
  const [toast,            setToast]            = useState(null);

  /* ── Fetch products ────────────────────────────────────────────── */
  const fetchProducts = useCallback(async () => {
    setLoading(true);
    setError(null);

    const { data, error } = await supabase
      .from('products')
      .select('*')
      .order('sort_order', { ascending: true });

    setLoading(false);

    if (error) {
      setError('Failed to load products. ' + error.message);
      return;
    }

    setProducts(
      (data ?? []).map((product) => {
        const images = parseProductImages(product.image, product.images);
        return {
          ...product,
          images,
          image: images[0] ?? '',
        };
      }),
    );
  }, []);

  useEffect(() => { fetchProducts(); }, [fetchProducts]);

  /* ── Search debounce (500ms) ───────────────────────────────────── */
  useEffect(() => {
    const normalized = searchInput.trim().toLowerCase();
    if (normalized === search) { setIsSearching(false); return; }
    setIsSearching(true);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setSearch(normalized);
      setIsSearching(false);
    }, 500);
    return () => clearTimeout(debounceRef.current);
  }, [searchInput]); // eslint-disable-line react-hooks/exhaustive-deps

  const applySearchNow = () => {
    clearTimeout(debounceRef.current);
    const normalized = searchInput.trim().toLowerCase();
    setSearch(normalized);
    setIsSearching(false);
  };

  /* ── Client-side filtering ─────────────────────────────────────── */
  const filtered = products.filter((p) => {
    if (categoryFilter !== 'All Categories' && p.category !== categoryFilter) return false;
    if (stockFilter !== 'all' && p.stock_status !== stockFilter) return false;
    if (search && !p.name.toLowerCase().includes(search) && !p.category.toLowerCase().includes(search)) return false;
    return true;
  });

  /* ── Stats ─────────────────────────────────────────────────────── */
  const totalProducts    = products.length;
  const featuredCount    = products.filter((p) => p.featured).length;
  const outOfStockCount  = products.filter((p) => p.stock_status === 'out_of_stock').length;
  const inventoryValue   = products
    .filter((p) => p.stock_status !== 'out_of_stock')
    .reduce((sum, p) => sum + Number(p.price), 0);

  /* ── Handlers ──────────────────────────────────────────────────── */
  const handleAddProduct = () => {
    setEditingProduct(null);
    setShowProductModal(true);
  };

  const handleEditProduct = (product) => {
    setEditingProduct(product);
    setShowProductModal(true);
  };

  const handleDeleteClick = (product) => {
    setDeletingProduct(product);
  };

  const handleDeleteConfirm = async () => {
    if (!deletingProduct) return;
    const name = deletingProduct.name;
    const { error } = await supabase
      .from('products')
      .delete()
      .eq('id', deletingProduct.id);

    setDeletingProduct(null);

    if (error) {
      showToast('Failed to delete product: ' + error.message, 'error');
    } else {
      setProducts((prev) => prev.filter((p) => p.id !== deletingProduct.id));
      showToast(`"${name}" deleted.`);
    }
  };

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
  };

  const handleModalClose = () => {
    setShowProductModal(false);
    setEditingProduct(null);
  };

  const handleModalSuccess = (message) => {
    showToast(message);
    fetchProducts();
  };

  /* ── Shared input class ────────────────────────────────────────── */
  const selectClass =
    'bg-[#161616] border border-white/10 text-white font-body text-sm px-3 py-2 ' +
    'focus:outline-none focus:border-[#ff5500] transition-colors appearance-none cursor-pointer';

  /* ── Render ─────────────────────────────────────────────────────── */
  return (
    <div className="min-h-screen bg-[#080808] text-white">
      <AdminNavbar />

      <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">

        {/* ── Page header ─────────────────────────────────────────── */}
        <div className="flex items-center justify-between gap-4">
          <h1
            className="uppercase tracking-tight text-white"
            style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '3rem', lineHeight: 1 }}
          >
            Products
          </h1>
          <button
            onClick={handleAddProduct}
            disabled={loading}
            className="clip-parallelogram bg-[#ff5500] text-white font-technical text-xs uppercase
                       tracking-widest px-8 py-3 flex items-center gap-2
                       hover:shadow-[0_0_20px_rgba(255,85,0,0.3)] transition-all
                       disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>add</span>
            Add New Product
          </button>
        </div>

        {/* ── Stats cards ─────────────────────────────────────────── */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard icon="inventory_2"  label="Total Products"      value={totalProducts}                           />
          <StatCard icon="star"         label="Featured Products"    value={featuredCount}      accent               />
          <StatCard icon="remove_shopping_cart" label="Out of Stock" value={outOfStockCount}                        />
          <StatCard icon="payments"     label="Inventory Value"      value={`৳${inventoryValue.toLocaleString('en-IN')}`} accent />
        </div>

        {/* ── Filters ─────────────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-3">
          {/* Category */}
          <div className="relative">
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className={selectClass + ' w-full sm:w-auto'}
              style={{ paddingRight: '2rem' }}
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c} className="bg-[#161616]">{c}</option>
              ))}
            </select>
            <span
              className="material-symbols-outlined absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-stone-500"
              style={{ fontSize: 16 }}
            >
              expand_more
            </span>
          </div>

          {/* Stock status */}
          <div className="relative">
            <select
              value={stockFilter}
              onChange={(e) => setStockFilter(e.target.value)}
              className={selectClass + ' w-full sm:w-auto'}
              style={{ paddingRight: '2rem' }}
            >
              {STOCK_OPTIONS.map((o) => (
                <option key={o.value} value={o.value} className="bg-[#161616]">{o.label}</option>
              ))}
            </select>
            <span
              className="material-symbols-outlined absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-stone-500"
              style={{ fontSize: 16 }}
            >
              expand_more
            </span>
          </div>

          {/* Search */}
          <div className="relative flex-1 min-w-0 sm:min-w-[200px] sm:max-w-sm">
            <span
              className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-stone-600"
              style={{ fontSize: 16 }}
            >
              search
            </span>
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') applySearchNow(); }}
              placeholder={isSearching ? 'Searching...' : 'Search products...'}
              className="w-full bg-[#161616] border border-white/10 text-white font-body text-sm
                         pl-9 pr-3 py-2 focus:outline-none focus:border-[#ff5500] transition-colors
                         placeholder:text-stone-600"
            />
          </div>
        </div>

        {/* ── Error ───────────────────────────────────────────────── */}
        {error && (
          <div className="bg-red-950/40 border border-red-800/60 p-4 flex items-center gap-3">
            <span
              className="material-symbols-outlined text-red-500 flex-shrink-0"
              style={{ fontSize: 18, fontVariationSettings: "'FILL' 1" }}
            >
              error
            </span>
            <p className="font-body text-red-400 text-sm flex-1">{error}</p>
            <button
              onClick={fetchProducts}
              className="font-technical text-xs uppercase tracking-widest text-red-400 hover:text-red-300 underline"
            >
              Retry
            </button>
          </div>
        )}

        {/* ── Products grid ────────────────────────────────────────── */}
        {loading ? (
          /* Skeleton loaders */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="bg-[#111111] border border-white/10 animate-pulse">
                <div className="aspect-square bg-white/5" />
                <div className="p-4 space-y-3">
                  <div className="h-4 bg-white/5 w-3/4" />
                  <div className="h-4 bg-white/5 w-1/2" />
                  <div className="h-3 bg-white/5 w-1/3" />
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          /* Empty state */
          <div className="text-center py-24 border border-white/5 bg-[#111111]">
            {products.length === 0 ? (
              <>
                <p className="font-headline text-4xl text-white mb-4">NO PRODUCTS YET</p>
                <button
                  onClick={handleAddProduct}
                  className="clip-parallelogram bg-[#ff5500] text-white font-technical text-xs
                             uppercase tracking-widest px-8 py-3 flex items-center gap-2 mx-auto
                             hover:shadow-[0_0_20px_rgba(255,85,0,0.3)] transition-all"
                >
                  <span className="material-symbols-outlined" style={{ fontSize: 16 }}>add</span>
                  Add Your First Product
                </button>
              </>
            ) : (
              <>
                <p className="font-headline text-4xl text-white mb-4">NO PRODUCTS FOUND</p>
                <button
                  onClick={() => { setCategoryFilter('All Categories'); setStockFilter('all'); setSearchInput(''); }}
                  className="font-technical text-xs uppercase tracking-widest text-[#ff5500]
                             border border-[#ff5500]/40 px-6 py-2 hover:bg-[#ff5500]/10 transition-colors"
                >
                  Clear Filters
                </button>
              </>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map((product, idx) => (
              <motion.div
                key={product.id}
                className="bg-[#111111] border border-white/10 hover:border-[#ff5500]/50 transition-colors flex flex-col"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2, delay: idx * 0.03 }}
              >
                {/* Image */}
                <div className="aspect-square overflow-hidden bg-[#161616]">
                  <img
                    src={product.image}
                    alt={product.name}
                    className="w-full h-full object-cover"
                    onError={(e) => { e.target.style.display = 'none'; }}
                  />
                </div>

                {/* Info */}
                <div className="p-4 flex flex-col gap-3 flex-1">
                  {/* Name */}
                  <h3
                    className="text-white text-xl leading-tight line-clamp-1"
                    style={{ fontFamily: "'Bebas Neue', sans-serif" }}
                  >
                    {product.name}
                  </h3>

                  {/* Price */}
                  <p
                    className="text-[#ff5500] text-lg"
                    style={{ fontFamily: "'Space Mono', monospace" }}
                  >
                    ৳{Number(product.price).toLocaleString('en-IN')}
                  </p>

                  {/* Badges row */}
                  <div className="flex flex-wrap gap-2">
                    <CategoryBadge category={product.category} />
                    <StockBadge status={product.stock_status} />
                  </div>

                  {/* Icons row */}
                  <div className="flex gap-2">
                    {product.featured && (
                      <span
                        className="material-symbols-outlined text-yellow-500"
                        style={{ fontSize: 18, fontVariationSettings: "'FILL' 1" }}
                        title="Featured / Best Seller"
                      >
                        star
                      </span>
                    )}
                    {product.new_arrival && (
                      <span
                        className="material-symbols-outlined text-purple-400"
                        style={{ fontSize: 18, fontVariationSettings: "'FILL' 1" }}
                        title="New Arrival"
                      >
                        new_releases
                      </span>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex gap-4 mt-auto pt-2 border-t border-white/5">
                    <button
                      onClick={() => handleEditProduct(product)}
                      className="flex items-center gap-1 font-technical text-[10px] uppercase tracking-widest
                                 text-stone-400 hover:text-[#ff5500] transition-colors"
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: 16 }}>edit</span>
                      Edit
                    </button>
                    <button
                      onClick={() => handleDeleteClick(product)}
                      className="flex items-center gap-1 font-technical text-[10px] uppercase tracking-widest
                                 text-stone-400 hover:text-red-500 transition-colors"
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: 16 }}>delete</span>
                      Delete
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* ── Product form modal (add / edit) ─────────────────────────── */}
      <AnimatePresence>
        {showProductModal && (
          <ProductFormModal
            product={editingProduct}
            onClose={handleModalClose}
            onSuccess={handleModalSuccess}
          />
        )}
      </AnimatePresence>

      {/* ── Delete confirmation modal ────────────────────────────────── */}
      <DeleteConfirmModal
        product={deletingProduct}
        onClose={() => setDeletingProduct(null)}
        onConfirm={handleDeleteConfirm}
      />

      {/* ── Toast notification ───────────────────────────────────────── */}
      <Toast toast={toast} onDismiss={() => setToast(null)} />
    </div>
  );
}
