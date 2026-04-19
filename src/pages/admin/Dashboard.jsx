import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { supabase } from '../../lib/supabase';
import AdminNavbar from '../../components/admin/AdminNavbar';

/* ─── Constants ──────────────────────────────────────────────────── */

const STATUS_PIPELINE = [
  { key: 'pending',   label: 'Pending',   color: 'text-[#ff5500]',  bg: 'bg-[#ff5500]/10',  border: 'border-[#ff5500]/30' },
  { key: 'confirmed', label: 'Confirmed', color: 'text-blue-400',   bg: 'bg-blue-500/10',   border: 'border-blue-500/30' },
  { key: 'shipped',   label: 'Shipped',   color: 'text-purple-400', bg: 'bg-purple-500/10', border: 'border-purple-500/30' },
  { key: 'delivered', label: 'Delivered', color: 'text-green-400',  bg: 'bg-green-500/10',  border: 'border-green-500/30' },
  { key: 'cancelled', label: 'Cancelled', color: 'text-red-400',    bg: 'bg-red-500/10',    border: 'border-red-500/30' },
];

const QUICK_LINKS = [
  { label: 'Manage Orders',     to: '/admin/orders',     icon: 'receipt_long' },
  { label: 'Manage Products',   to: '/admin/products',   icon: 'inventory_2' },
  { label: 'Manage Categories', to: '/admin/categories', icon: 'category' },
  { label: 'Cost Calculator',   to: '/admin/calculator', icon: 'calculate' },
  { label: 'Invoice Maker',     to: '/admin/invoices',   icon: 'receipt_long' },
];

/* ─── Helpers ────────────────────────────────────────────────────── */

function formatCurrency(n) {
  return `৳${n.toLocaleString('en-IN')}`;
}

function formatDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function todayStart() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(0, 0, 0, 0);
  return d;
}

function monthStart() {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

/* ─── Sub-components ─────────────────────────────────────────────── */

function RevenueCard({ label, value, sub, loading }) {
  return (
    <div className="bg-[#111111] border border-white/10 p-5 flex flex-col gap-1.5">
      <span className="font-technical text-[10px] text-stone-500 uppercase tracking-widest">
        {label}
      </span>
      {loading ? (
        <div className="h-8 w-24 bg-white/5 animate-pulse rounded" />
      ) : (
        <span
          className="font-mono text-2xl font-bold text-[#ff5500]"
          style={{ fontFamily: "'Space Mono', monospace" }}
        >
          {value}
        </span>
      )}
      {sub && (
        <span className="font-technical text-[10px] text-stone-600 uppercase tracking-widest">
          {sub}
        </span>
      )}
    </div>
  );
}

function StatusPipelineCard({ item, count, loading }) {
  return (
    <div className={`border ${item.border} ${item.bg} p-4 flex flex-col gap-2`}>
      <span className={`font-technical text-[10px] uppercase tracking-widest ${item.color}`}>
        {item.label}
      </span>
      {loading ? (
        <div className="h-7 w-10 bg-white/5 animate-pulse rounded" />
      ) : (
        <span
          className="font-mono text-3xl font-bold text-white"
          style={{ fontFamily: "'Space Mono', monospace" }}
        >
          {count}
        </span>
      )}
    </div>
  );
}

function StatusBadge({ status }) {
  const s = STATUS_PIPELINE.find((p) => p.key === status);
  if (!s) return <span className="font-technical text-[10px] text-stone-500">{status}</span>;
  return (
    <span className={`inline-block px-2 py-0.5 text-[10px] font-technical uppercase tracking-widest ${s.bg} ${s.color}`}>
      {s.label}
    </span>
  );
}

/* ─── Main component ─────────────────────────────────────────────── */

export default function AdminDashboard() {
  const [orders,     setOrders]     = useState([]);
  const [lowStock,   setLowStock]   = useState([]);
  const [loading,    setLoading]    = useState(true);

  useEffect(() => {
    Promise.all([
      supabase
        .from('orders')
        .select('id, created_at, customer_name, total_amount, status, items')
        .order('created_at', { ascending: false }),
      supabase
        .from('products')
        .select('id, name, category, price, stock_status, image, images')
        .eq('stock_status', 'low_stock')
        .order('sort_order', { ascending: true }),
    ]).then(([ordersRes, productsRes]) => {
      setOrders(ordersRes.data ?? []);
      setLowStock(productsRes.data ?? []);
      setLoading(false);
    });
  }, []);

  /* ── Derived stats ──────────────────────────────────────────────── */
  const activeOrders = orders.filter((o) => o.status !== 'cancelled');

  const revenue = {
    today:    activeOrders.filter((o) => new Date(o.created_at) >= todayStart())   .reduce((s, o) => s + (o.total_amount ?? 0), 0),
    week:     activeOrders.filter((o) => new Date(o.created_at) >= daysAgo(7))     .reduce((s, o) => s + (o.total_amount ?? 0), 0),
    month:    activeOrders.filter((o) => new Date(o.created_at) >= monthStart())   .reduce((s, o) => s + (o.total_amount ?? 0), 0),
    allTime:  activeOrders.reduce((s, o) => s + (o.total_amount ?? 0), 0),
  };

  const statusCounts = STATUS_PIPELINE.reduce((acc, s) => {
    acc[s.key] = orders.filter((o) => o.status === s.key).length;
    return acc;
  }, {});

  const recentOrders = orders.slice(0, 10);

  const todayStr = new Date().toLocaleDateString('en-GB', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });

  return (
    <div className="min-h-screen bg-[#080808] text-white">
      <AdminNavbar />

      <div className="px-6 py-8 max-w-screen-2xl mx-auto space-y-8">

        {/* ── Header ───────────────────────────────────────────────── */}
        <div className="flex items-end justify-between gap-4">
          <div>
            <h1
              className="uppercase tracking-tight text-white"
              style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '2.5rem', lineHeight: 1 }}
            >
              Dashboard
            </h1>
            <p className="font-technical text-xs text-stone-500 uppercase tracking-widest mt-1">
              {todayStr}
            </p>
          </div>
          {!loading && orders.length > 0 && statusCounts.pending > 0 && (
            <Link
              to="/admin/orders"
              className="flex items-center gap-2 px-4 py-2 bg-[#ff5500]/10 border border-[#ff5500]/40
                         text-[#ff5500] font-technical text-xs uppercase tracking-widest
                         hover:bg-[#ff5500]/20 transition-colors"
            >
              <span
                className="material-symbols-outlined"
                style={{ fontSize: 14, fontVariationSettings: "'FILL' 1" }}
              >
                notifications_active
              </span>
              {statusCounts.pending} pending {statusCounts.pending === 1 ? 'order' : 'orders'}
            </Link>
          )}
        </div>

        {/* ── Revenue cards ────────────────────────────────────────── */}
        <div>
          <p className="font-technical text-[10px] text-stone-500 uppercase tracking-widest mb-3">
            Revenue
          </p>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <RevenueCard label="Today"       value={formatCurrency(revenue.today)}   loading={loading} />
            <RevenueCard label="Last 7 Days" value={formatCurrency(revenue.week)}    loading={loading} />
            <RevenueCard label="This Month"  value={formatCurrency(revenue.month)}   loading={loading} />
            <RevenueCard label="All Time"    value={formatCurrency(revenue.allTime)} loading={loading}
              sub={`${activeOrders.length} active ${activeOrders.length === 1 ? 'order' : 'orders'}`}
            />
          </div>
        </div>

        {/* ── Order pipeline ───────────────────────────────────────── */}
        <div>
          <p className="font-technical text-[10px] text-stone-500 uppercase tracking-widest mb-3">
            Order Pipeline
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {STATUS_PIPELINE.map((item) => (
              <StatusPipelineCard
                key={item.key}
                item={item}
                count={statusCounts[item.key] ?? 0}
                loading={loading}
              />
            ))}
          </div>
        </div>

        {/* ── Main grid: Recent orders + sidebar ───────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* ── Recent orders ──────────────────────────────────────── */}
          <div className="lg:col-span-2">
            <div className="flex items-center justify-between mb-3">
              <p className="font-technical text-[10px] text-stone-500 uppercase tracking-widest">
                Recent Orders
              </p>
              <Link
                to="/admin/orders"
                className="font-technical text-[10px] uppercase tracking-widest text-stone-500
                           hover:text-[#ff5500] transition-colors flex items-center gap-1"
              >
                View All
                <span className="material-symbols-outlined" style={{ fontSize: 12 }}>arrow_forward</span>
              </Link>
            </div>

            <div className="bg-[#111111] border border-white/10 overflow-hidden">
              {loading ? (
                <div className="space-y-px">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="flex items-center gap-4 px-5 py-4 bg-[#161616] animate-pulse">
                      <div className="h-3 w-20 bg-white/5 rounded" />
                      <div className="h-3 w-32 bg-white/5 rounded flex-1" />
                      <div className="h-3 w-16 bg-white/5 rounded" />
                      <div className="h-5 w-16 bg-white/5 rounded" />
                    </div>
                  ))}
                </div>
              ) : recentOrders.length === 0 ? (
                <div className="py-16 text-center">
                  <p className="font-technical text-[10px] text-stone-600 uppercase tracking-widest">
                    No orders yet
                  </p>
                </div>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/10">
                      {['Order', 'Customer', 'Amount', 'Status', 'Date'].map((h) => (
                        <th
                          key={h}
                          className="text-left font-technical text-[10px] text-stone-500
                                     uppercase tracking-widest py-3 px-5 whitespace-nowrap"
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {recentOrders.map((order, idx) => (
                      <motion.tr
                        key={order.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.2, delay: idx * 0.03 }}
                        className={`border-b border-white/5 hover:bg-white/[0.02] transition-colors ${
                          idx % 2 === 0 ? 'bg-[#111111]' : 'bg-[#161616]/50'
                        }`}
                      >
                        <td
                          className="py-3 px-5 font-mono text-[#ff5500] text-xs whitespace-nowrap"
                          style={{ fontFamily: "'Space Mono', monospace" }}
                        >
                          #ORD-{order.id}
                        </td>
                        <td className="py-3 px-5 text-stone-300 font-body whitespace-nowrap">
                          {order.customer_name ?? '—'}
                        </td>
                        <td
                          className="py-3 px-5 text-white text-xs whitespace-nowrap"
                          style={{ fontFamily: "'Space Mono', monospace" }}
                        >
                          ৳{(order.total_amount ?? 0).toLocaleString('en-IN')}
                        </td>
                        <td className="py-3 px-5">
                          <StatusBadge status={order.status} />
                        </td>
                        <td className="py-3 px-5 font-technical text-stone-600 text-[10px] whitespace-nowrap uppercase tracking-wider">
                          {formatDate(order.created_at)}
                        </td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          {/* ── Sidebar ────────────────────────────────────────────── */}
          <div className="space-y-6">

            {/* Low stock alert */}
            <div>
              <p className="font-technical text-[10px] text-stone-500 uppercase tracking-widest mb-3">
                Low Stock Alert
              </p>
              <div className="bg-[#111111] border border-white/10">
                {loading ? (
                  <div className="p-5 space-y-3">
                    {[1,2,3].map((i) => (
                      <div key={i} className="flex gap-3 animate-pulse">
                        <div className="w-10 h-10 bg-white/5 rounded flex-shrink-0" />
                        <div className="flex-1 space-y-2">
                          <div className="h-3 bg-white/5 rounded w-3/4" />
                          <div className="h-2.5 bg-white/5 rounded w-1/2" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : lowStock.length === 0 ? (
                  <div className="px-5 py-8 text-center">
                    <span
                      className="material-symbols-outlined text-green-600 block mb-2"
                      style={{ fontSize: 24, fontVariationSettings: "'FILL' 1" }}
                    >
                      check_circle
                    </span>
                    <p className="font-technical text-[10px] text-stone-600 uppercase tracking-widest">
                      All products well-stocked
                    </p>
                  </div>
                ) : (
                  <div>
                    {lowStock.map((product, idx) => {
                      const img = Array.isArray(product.images) && product.images[0]
                        ? product.images[0]
                        : product.image ?? null;
                      return (
                        <div
                          key={product.id}
                          className={`flex items-center gap-3 px-5 py-3 border-b border-white/5
                                      last:border-b-0 ${idx % 2 === 0 ? '' : 'bg-[#161616]/30'}`}
                        >
                          <div className="w-10 h-10 flex-shrink-0 bg-stone-900 border border-white/10 overflow-hidden">
                            {img ? (
                              <img src={img} alt={product.name} className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <span className="material-symbols-outlined text-stone-700" style={{ fontSize: 14 }}>image</span>
                              </div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-body text-white text-sm truncate">{product.name}</p>
                            <p className="font-technical text-[10px] text-[#ff5500] uppercase tracking-widest truncate">
                              {product.category}
                            </p>
                          </div>
                          <span className="flex-shrink-0 px-2 py-0.5 border border-yellow-700/60 bg-yellow-950/40
                                           font-technical text-[9px] uppercase tracking-widest text-yellow-400">
                            Low
                          </span>
                        </div>
                      );
                    })}
                    <div className="px-5 py-3 border-t border-white/5">
                      <Link
                        to="/admin/products"
                        className="font-technical text-[10px] uppercase tracking-widest text-stone-500
                                   hover:text-[#ff5500] transition-colors flex items-center gap-1"
                      >
                        Manage Products
                        <span className="material-symbols-outlined" style={{ fontSize: 12 }}>arrow_forward</span>
                      </Link>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Quick links */}
            <div>
              <p className="font-technical text-[10px] text-stone-500 uppercase tracking-widest mb-3">
                Quick Links
              </p>
              <div className="space-y-2">
                {QUICK_LINKS.map(({ label, to, icon }) => (
                  <Link
                    key={to}
                    to={to}
                    className="flex items-center gap-3 px-4 py-3 bg-[#111111] border border-white/10
                               text-stone-400 hover:text-white hover:border-white/20 transition-colors group"
                  >
                    <span
                      className="material-symbols-outlined text-stone-600 group-hover:text-[#ff5500] transition-colors"
                      style={{ fontSize: 18 }}
                    >
                      {icon}
                    </span>
                    <span className="font-technical text-xs uppercase tracking-widest flex-1">
                      {label}
                    </span>
                    <span
                      className="material-symbols-outlined text-stone-700 group-hover:text-stone-500 transition-colors"
                      style={{ fontSize: 14 }}
                    >
                      arrow_forward
                    </span>
                  </Link>
                ))}
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
