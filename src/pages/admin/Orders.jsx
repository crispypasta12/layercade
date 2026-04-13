import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '../../lib/supabase';
import AdminNavbar from '../../components/admin/AdminNavbar';
import OrderDetailModal from '../../components/admin/OrderDetailModal';

/* ─── Constants ──────────────────────────────────────────────────── */

const PAGE_SIZE = 20;

const STATUS_OPTIONS = [
  { value: 'all',       label: 'All Statuses' },
  { value: 'pending',   label: 'Pending' },
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'shipped',   label: 'Shipped' },
  { value: 'delivered', label: 'Delivered' },
  { value: 'cancelled', label: 'Cancelled' },
];

const STATUS_COLORS = {
  pending:   { bg: 'bg-[#ff5500]/20',  text: 'text-[#ff5500]',  label: 'Pending' },
  confirmed: { bg: 'bg-blue-500/20',   text: 'text-blue-400',   label: 'Confirmed' },
  shipped:   { bg: 'bg-purple-500/20', text: 'text-purple-400', label: 'Shipped' },
  delivered: { bg: 'bg-green-500/20',  text: 'text-green-400',  label: 'Delivered' },
  cancelled: { bg: 'bg-red-500/20',    text: 'text-red-400',    label: 'Cancelled' },
};

/* ─── Helpers ────────────────────────────────────────────────────── */

function formatDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  const day   = String(d.getDate()).padStart(2, '0');
  const month = d.toLocaleString('en-GB', { month: 'short' });
  const year  = d.getFullYear();
  const hh    = String(d.getHours()).padStart(2, '0');
  const mm    = String(d.getMinutes()).padStart(2, '0');
  return `${day} ${month} ${year}, ${hh}:${mm}`;
}

function StatusBadge({ status }) {
  const s = STATUS_COLORS[status] ?? { bg: 'bg-stone-800', text: 'text-stone-400', label: status };
  return (
    <span className={`inline-block px-2 py-0.5 text-[10px] font-technical uppercase tracking-widest ${s.bg} ${s.text}`}>
      {s.label}
    </span>
  );
}

function StatCard({ label, value, accent }) {
  return (
    <div className="bg-[#111111] border border-white/10 p-5 flex flex-col gap-1">
      <span className="font-technical text-[10px] text-stone-500 uppercase tracking-widest">{label}</span>
      <span
        className="font-mono text-2xl font-bold"
        style={{ color: accent ? '#ff5500' : '#ffffff', fontFamily: "'Space Mono', monospace" }}
      >
        {value}
      </span>
    </div>
  );
}

/* ─── Main component ─────────────────────────────────────────────── */

export default function AdminOrders() {
  const [orders,        setOrders]        = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [error,         setError]         = useState(null);
  const [selectedOrder, setSelectedOrder] = useState(null);

  // Filters
  const [statusFilter, setStatusFilter] = useState('all');
  const [search,       setSearch]       = useState('');
  const [searchInput,  setSearchInput]  = useState('');

  // Pagination
  const [page, setPage] = useState(0);

  /* ── Debounce search input ─────────────────────────────────── */
  useEffect(() => {
    const id = setTimeout(() => {
      setSearch(searchInput.trim().toLowerCase());
      setPage(0);
    }, 500);
    return () => clearTimeout(id);
  }, [searchInput]);

  /* ── Fetch orders ──────────────────────────────────────────── */
  const fetchOrders = useCallback(async () => {
    setLoading(true);
    setError(null);

    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false });

    setLoading(false);

    if (error) {
      setError('Failed to load orders. ' + error.message);
      return;
    }

    setOrders(data ?? []);
  }, []);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);

  /* ── Filtering ─────────────────────────────────────────────── */
  const filtered = orders.filter((o) => {
    if (statusFilter !== 'all' && o.status !== statusFilter) return false;
    if (search) {
      const id   = String(o.id).toLowerCase();
      const name = (o.customer_name ?? '').toLowerCase();
      const ph   = (o.phone ?? '').toLowerCase();
      if (!id.includes(search) && !name.includes(search) && !ph.includes(search)) return false;
    }
    return true;
  });

  /* ── Stats ─────────────────────────────────────────────────── */
  const totalOrders    = orders.length;
  const pendingOrders  = orders.filter((o) => o.status === 'pending').length;
  const completedOrders = orders.filter((o) => o.status === 'delivered').length;
  const totalRevenue   = orders
    .filter((o) => o.status !== 'cancelled')
    .reduce((sum, o) => sum + (o.total_amount ?? 0), 0);

  /* ── Pagination ─────────────────────────────────────────────── */
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated  = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const handleStatusChange = (val) => {
    setStatusFilter(val);
    setPage(0);
  };

  /* ── CSV Export ─────────────────────────────────────────────── */
  const exportCSV = () => {
    const headers = ['Order ID', 'Date', 'Customer', 'Phone', 'District', 'Items', 'Total (৳)', 'Status'];
    const rows = filtered.map((o) => [
      `ORD-${o.id}`,
      formatDate(o.created_at),
      o.customer_name ?? '',
      o.phone ?? '',
      o.district ?? '',
      Array.isArray(o.items) ? o.items.reduce((s, i) => s + (i.quantity ?? 1), 0) : 0,
      o.total_amount ?? 0,
      o.status ?? '',
    ]);
    const csv = [headers, ...rows].map((r) => r.map((c) => `"${c}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `orders-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  /* ── Render ─────────────────────────────────────────────────── */
  const selectClass =
    'bg-[#161616] border border-white/10 text-white font-body text-sm px-3 py-2 ' +
    'focus:outline-none focus:border-[#ff5500] transition-colors appearance-none cursor-pointer';

  return (
    <div className="min-h-screen bg-[#080808] text-white">
      <AdminNavbar />

      <div className="px-6 py-8 max-w-screen-2xl mx-auto space-y-8">

        {/* ── Page title ──────────────────────────────────────────── */}
        <div>
          <h1
            className="uppercase tracking-tight text-white"
            style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '2.5rem', lineHeight: 1 }}
          >
            Orders
          </h1>
          <p className="font-technical text-xs text-stone-500 uppercase tracking-widest mt-1">
            {loading ? 'Loading…' : `${totalOrders} total orders`}
          </p>
        </div>

        {/* ── Stats cards ─────────────────────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Total Orders"     value={totalOrders}                                              />
          <StatCard label="Pending"          value={pendingOrders}   accent                                   />
          <StatCard label="Delivered"        value={completedOrders}                                          />
          <StatCard label="Total Revenue"    value={`৳${totalRevenue.toLocaleString('en-IN')}`} accent        />
        </div>

        {/* ── Filters + Export ────────────────────────────────────── */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Status filter */}
          <div className="relative">
            <select
              value={statusFilter}
              onChange={(e) => handleStatusChange(e.target.value)}
              className={selectClass}
              style={{ paddingRight: '2rem' }}
            >
              {STATUS_OPTIONS.map((o) => (
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
          <div className="relative flex-1 min-w-[200px] max-w-sm">
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
              placeholder="Order ID, name, phone…"
              className="w-full bg-[#161616] border border-white/10 text-white font-body text-sm
                         pl-9 pr-3 py-2 focus:outline-none focus:border-[#ff5500] transition-colors
                         placeholder:text-stone-700"
            />
          </div>

          <div className="ml-auto">
            <button
              onClick={exportCSV}
              disabled={filtered.length === 0}
              className="flex items-center gap-2 bg-[#161616] border border-white/10 px-4 py-2
                         font-technical text-xs uppercase tracking-widest text-stone-300
                         hover:border-[#ff5500] hover:text-[#ff5500] transition-colors
                         disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <span className="material-symbols-outlined" style={{ fontSize: 14 }}>download</span>
              Export CSV
            </button>
          </div>
        </div>

        {/* ── Error ──────────────────────────────────────────────── */}
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
              onClick={fetchOrders}
              className="font-technical text-xs uppercase tracking-widest text-red-400
                         hover:text-red-300 underline"
            >
              Retry
            </button>
          </div>
        )}

        {/* ── Table ──────────────────────────────────────────────── */}
        {loading ? (
          <div className="flex items-center justify-center py-24">
            <svg className="animate-spin w-8 h-8 text-[#ff5500]" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-sm border-collapse">
              <thead>
                <tr className="border-b border-white/10">
                  {['Order ID', 'Date', 'Customer', 'Phone', 'District', 'Items', 'Total', 'Status', ''].map((h) => (
                    <th
                      key={h}
                      className="text-left font-technical text-[10px] text-stone-500 uppercase tracking-widest
                                 py-3 px-4 whitespace-nowrap"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {paginated.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="text-center font-body text-stone-600 py-16">
                      No orders found.
                    </td>
                  </tr>
                ) : (
                  paginated.map((order, idx) => {
                    const itemCount = Array.isArray(order.items)
                      ? order.items.reduce((s, i) => s + (i.quantity ?? 1), 0)
                      : 0;
                    const rowBg = idx % 2 === 0 ? 'bg-[#111111]' : 'bg-[#161616]';
                    return (
                      <motion.tr
                        key={order.id}
                        className={`${rowBg} border-b border-white/5 hover:bg-[#1e1e1e] transition-colors`}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.2, delay: idx * 0.02 }}
                      >
                        <td className="py-3 px-4 font-mono text-[#ff5500] text-xs whitespace-nowrap"
                            style={{ fontFamily: "'Space Mono', monospace" }}>
                          #ORD-{order.id}
                        </td>
                        <td className="py-3 px-4 font-technical text-stone-400 text-xs whitespace-nowrap">
                          {formatDate(order.created_at)}
                        </td>
                        <td className="py-3 px-4 font-body text-white">
                          {order.customer_name ?? '—'}
                        </td>
                        <td className="py-3 px-4 font-technical text-stone-400 text-xs whitespace-nowrap">
                          {order.phone ?? '—'}
                        </td>
                        <td className="py-3 px-4 font-body text-stone-300 text-sm">
                          {order.district ?? '—'}
                        </td>
                        <td className="py-3 px-4 font-technical text-stone-400 text-xs text-center">
                          {itemCount} {itemCount === 1 ? 'item' : 'items'}
                        </td>
                        <td className="py-3 px-4 font-mono text-white text-sm whitespace-nowrap"
                            style={{ fontFamily: "'Space Mono', monospace" }}>
                          ৳{(order.total_amount ?? 0).toLocaleString('en-IN')}
                        </td>
                        <td className="py-3 px-4">
                          <StatusBadge status={order.status} />
                        </td>
                        <td className="py-3 px-4">
                          <button
                            onClick={() => setSelectedOrder(order)}
                            className="font-technical text-[10px] uppercase tracking-widest
                                       text-stone-400 hover:text-[#ff5500] border border-white/10
                                       hover:border-[#ff5500] px-3 py-1.5 transition-colors whitespace-nowrap"
                          >
                            View Details
                          </button>
                        </td>
                      </motion.tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* ── Pagination ──────────────────────────────────────────── */}
        {!loading && totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-white/10 pt-4">
            <p className="font-technical text-xs text-stone-500 uppercase tracking-widest">
              Page {page + 1} of {totalPages} &nbsp;·&nbsp; {filtered.length} results
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0}
                className="font-technical text-xs uppercase tracking-widest px-4 py-2
                           border border-white/10 text-stone-400 hover:text-white
                           hover:border-white/30 transition-colors disabled:opacity-30
                           disabled:cursor-not-allowed flex items-center gap-1"
              >
                <span className="material-symbols-outlined" style={{ fontSize: 14 }}>chevron_left</span>
                Prev
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                disabled={page >= totalPages - 1}
                className="font-technical text-xs uppercase tracking-widest px-4 py-2
                           border border-white/10 text-stone-400 hover:text-white
                           hover:border-white/30 transition-colors disabled:opacity-30
                           disabled:cursor-not-allowed flex items-center gap-1"
              >
                Next
                <span className="material-symbols-outlined" style={{ fontSize: 14 }}>chevron_right</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Order detail modal ───────────────────────────────────── */}
      {selectedOrder && (
        <OrderDetailModal
          order={selectedOrder}
          onClose={() => setSelectedOrder(null)}
          onUpdated={(updated) => {
            setOrders((prev) => prev.map((o) => (o.id === updated.id ? updated : o)));
            setSelectedOrder(updated);
          }}
          onDeleted={(deletedId) => {
            setOrders((prev) => prev.filter((o) => o.id !== deletedId));
            setSelectedOrder(null);
          }}
        />
      )}
    </div>
  );
}
