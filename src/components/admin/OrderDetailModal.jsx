import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../../lib/supabase';

/* ─── Constants ──────────────────────────────────────────────────── */

const STATUS_OPTIONS = [
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
  const d     = new Date(iso);
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

function SectionLabel({ children }) {
  return (
    <p className="font-technical text-[10px] text-stone-500 uppercase tracking-widest mb-3">
      {children}
    </p>
  );
}

/* ─── Main component ─────────────────────────────────────────────── */

export default function OrderDetailModal({ order, onClose, onUpdated, onDeleted }) {
  const [newStatus,    setNewStatus]    = useState(order.status ?? 'pending');
  const [updating,     setUpdating]     = useState(false);
  const [updateMsg,    setUpdateMsg]    = useState(null); // { type: 'success'|'error', text }
  const [adminNote,    setAdminNote]    = useState(order.admin_notes ?? '');
  const [savingNote,   setSavingNote]   = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting,      setDeleting]      = useState(false);

  /* ── Close on Escape ──────────────────────────────────────────── */
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  /* ── Sync state if parent passes a refreshed order ───────────── */
  useEffect(() => {
    setNewStatus(order.status ?? 'pending');
    setAdminNote(order.admin_notes ?? '');
    setConfirmDelete(false);
  }, [order]);

  /* ── Update status ────────────────────────────────────────────── */
  const handleStatusUpdate = async () => {
    if (newStatus === order.status) return;
    setUpdating(true);
    setUpdateMsg(null);

    const { data, error } = await supabase
      .from('orders')
      .update({ status: newStatus })
      .eq('id', order.id)
      .select()
      .single();

    setUpdating(false);

    if (error) {
      setUpdateMsg({ type: 'error', text: 'Failed to update status. ' + error.message });
      return;
    }

    setUpdateMsg({ type: 'success', text: `Status updated to "${newStatus}".` });
    onUpdated(data);
  };

  /* ── Save admin note ──────────────────────────────────────────── */
  const handleSaveNote = async () => {
    setSavingNote(true);
    setUpdateMsg(null);

    const { data, error } = await supabase
      .from('orders')
      .update({ admin_notes: adminNote.trim() || null })
      .eq('id', order.id)
      .select()
      .single();

    setSavingNote(false);

    if (error) {
      setUpdateMsg({ type: 'error', text: 'Failed to save note. ' + error.message });
      return;
    }

    setUpdateMsg({ type: 'success', text: 'Note saved.' });
    onUpdated(data);
  };

  const handleDeleteOrder = async () => {
    setDeleting(true);
    setUpdateMsg(null);

    const { error } = await supabase
      .from('orders')
      .delete()
      .eq('id', order.id);

    setDeleting(false);

    if (error) {
      setUpdateMsg({ type: 'error', text: 'Failed to delete order. ' + error.message });
      return;
    }

    onDeleted(order.id);
  };

  /* ── Derived values ───────────────────────────────────────────── */
  const items       = Array.isArray(order.items) ? order.items : [];
  const subtotal    = items.reduce((s, i) => s + (i.price ?? 0) * (i.quantity ?? 1), 0);
  const deliveryFee = order.delivery_fee ?? 0;
  const grandTotal  = order.total_amount ?? subtotal + deliveryFee;

  const selectClass =
    'bg-[#080808] border border-white/10 text-white font-body text-sm px-3 py-2 ' +
    'focus:outline-none focus:border-[#ff5500] transition-colors appearance-none cursor-pointer';

  return (
    <AnimatePresence>
      {/* Backdrop */}
      <motion.div
        className="fixed inset-0 bg-black/75 z-50 flex items-center justify-center p-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      >
        {/* Modal panel */}
        <motion.div
          className="bg-[#111111] border border-white/10 w-full max-w-3xl max-h-[90vh]
                     overflow-y-auto relative"
          initial={{ opacity: 0, y: 32, scale: 0.97 }}
          animate={{ opacity: 1, y: 0,  scale: 1 }}
          exit={{ opacity: 0, y: 16, scale: 0.98 }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
          onClick={(e) => e.stopPropagation()}
        >

          {/* ── Header ────────────────────────────────────────────── */}
          <div className="flex items-start justify-between p-6 border-b border-white/10 sticky top-0 bg-[#111111] z-10">
            <div className="space-y-1">
              <div className="flex items-center gap-3">
                <h2
                  className="text-white uppercase"
                  style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.75rem', lineHeight: 1 }}
                >
                  #ORD-{order.id}
                </h2>
                <StatusBadge status={order.status} />
              </div>
              <p className="font-technical text-xs text-stone-500 uppercase tracking-widest">
                {formatDate(order.created_at)}
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-stone-500 hover:text-white transition-colors ml-4 flex-shrink-0"
            >
              <span className="material-symbols-outlined" style={{ fontSize: 22 }}>close</span>
            </button>
          </div>

          <div className="p-6 space-y-6">

            {/* ── Feedback message ──────────────────────────────────── */}
            <AnimatePresence>
              {updateMsg && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className={`flex items-center gap-3 px-4 py-3 border ${
                    updateMsg.type === 'success'
                      ? 'bg-green-950/40 border-green-800/60'
                      : 'bg-red-950/40 border-red-800/60'
                  }`}
                >
                  <span
                    className={`material-symbols-outlined flex-shrink-0 ${
                      updateMsg.type === 'success' ? 'text-green-400' : 'text-red-400'
                    }`}
                    style={{ fontSize: 16, fontVariationSettings: "'FILL' 1" }}
                  >
                    {updateMsg.type === 'success' ? 'check_circle' : 'error'}
                  </span>
                  <p className={`font-body text-sm ${
                    updateMsg.type === 'success' ? 'text-green-400' : 'text-red-400'
                  }`}>
                    {updateMsg.text}
                  </p>
                </motion.div>
              )}
            </AnimatePresence>

            {/* ── Customer info ──────────────────────────────────────── */}
            <section>
              <SectionLabel>Customer Information</SectionLabel>
              <div className="bg-[#161616] border border-white/5 p-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                <InfoRow icon="person"      label="Name"     value={order.customer_name ?? '—'} />
                <InfoRow icon="phone"       label="Phone"    value={order.phone ?? '—'} mono />
                <div className="sm:col-span-2">
                  <p className="font-technical text-[10px] text-stone-600 uppercase tracking-widest mb-1">Fulfillment</p>
                  {order.fulfillment_type === 'pickup' ? (
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 text-[10px] font-technical uppercase tracking-widest bg-blue-500/20 text-blue-400 border border-blue-500/30">
                        <span className="material-symbols-outlined" style={{ fontSize: 13, fontVariationSettings: "'FILL' 1" }}>storefront</span>
                        Pickup — Mirpur DOHS, Dhaka
                      </span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 text-[10px] font-technical uppercase tracking-widest bg-stone-800 text-stone-400 border border-white/10">
                        <span className="material-symbols-outlined" style={{ fontSize: 13, fontVariationSettings: "'FILL' 1" }}>local_shipping</span>
                        Home Delivery
                      </span>
                    </div>
                  )}
                </div>
                {order.fulfillment_type !== 'pickup' && (
                  <>
                    <InfoRow icon="location_on" label="District" value={order.district ?? '—'} />
                    <InfoRow icon="map"         label="Area"     value={order.area ?? '—'} />
                    <div className="sm:col-span-2">
                      <InfoRow icon="home" label="Address" value={order.address ?? '—'} />
                    </div>
                  </>
                )}
              </div>
            </section>

            {/* ── Items ─────────────────────────────────────────────── */}
            <section>
              <SectionLabel>Items Ordered ({items.length})</SectionLabel>
              <div className="space-y-2">
                {items.length === 0 ? (
                  <p className="font-body text-stone-600 text-sm">No item data available.</p>
                ) : (
                  items.map((item, idx) => {
                    const lineTotal = (item.price ?? 0) * (item.quantity ?? 1);
                    return (
                      <div
                        key={idx}
                        className="flex gap-3 bg-[#161616] border border-white/5 p-3"
                      >
                        {/* Thumbnail */}
                        <div className="w-14 h-14 bg-stone-900 flex-shrink-0 overflow-hidden">
                          {item.image ? (
                            <img
                              src={item.image}
                              alt={item.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <span
                                className="material-symbols-outlined text-stone-700"
                                style={{ fontSize: 20 }}
                              >
                                image
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Details */}
                        <div className="flex-1 min-w-0">
                          <p className="font-body text-white text-sm leading-tight line-clamp-2">
                            {item.name ?? 'Unnamed product'}
                          </p>
                          <p className="font-technical text-stone-500 text-xs mt-1 uppercase tracking-widest">
                            Qty: {item.quantity ?? 1} &nbsp;·&nbsp;
                            ৳{(item.price ?? 0).toLocaleString('en-IN')} each
                          </p>
                        </div>

                        {/* Line total */}
                        <div className="flex-shrink-0 text-right">
                          <span
                            className="text-[#ff5500] text-sm"
                            style={{ fontFamily: "'Space Mono', monospace" }}
                          >
                            ৳{lineTotal.toLocaleString('en-IN')}
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Price breakdown */}
              <div className="bg-[#161616] border border-white/5 mt-2 p-4 space-y-2">
                <div className="flex justify-between font-body text-stone-500 text-sm">
                  <span>Subtotal</span>
                  <span style={{ fontFamily: "'Space Mono', monospace" }}>
                    ৳{subtotal.toLocaleString('en-IN')}
                  </span>
                </div>
                <div className="flex justify-between font-body text-stone-500 text-sm">
                  <span>Delivery Fee</span>
                  <span style={{ fontFamily: "'Space Mono', monospace" }}>
                    ৳{deliveryFee.toLocaleString('en-IN')}
                  </span>
                </div>
                <div className="border-t border-white/10 pt-2 flex justify-between items-baseline">
                  <span
                    className="text-white uppercase"
                    style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.1rem' }}
                  >
                    Grand Total
                  </span>
                  <span
                    className="text-[#ff5500] text-xl"
                    style={{ fontFamily: "'Space Mono', monospace" }}
                  >
                    ৳{grandTotal.toLocaleString('en-IN')}
                  </span>
                </div>
              </div>
            </section>

            {/* ── Customer notes ─────────────────────────────────────── */}
            {order.notes && (
              <section>
                <SectionLabel>Customer Notes</SectionLabel>
                <div className="bg-[#161616] border border-white/5 p-4">
                  <p className="font-body text-stone-300 text-sm leading-relaxed whitespace-pre-wrap">
                    {order.notes}
                  </p>
                </div>
              </section>
            )}

            {/* ── Status update ──────────────────────────────────────── */}
            <section>
              <SectionLabel>Update Status</SectionLabel>
              <div className="flex items-center gap-3">
                <div className="relative flex-1 max-w-xs">
                  <select
                    value={newStatus}
                    onChange={(e) => { setNewStatus(e.target.value); setUpdateMsg(null); }}
                    disabled={updating}
                    className={`${selectClass} w-full pr-8`}
                  >
                    {STATUS_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value} className="bg-[#080808]">
                        {o.label}
                      </option>
                    ))}
                  </select>
                  <span
                    className="material-symbols-outlined absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-stone-500"
                    style={{ fontSize: 16 }}
                  >
                    expand_more
                  </span>
                </div>

                <button
                  onClick={handleStatusUpdate}
                  disabled={updating || newStatus === order.status}
                  className="bg-[#ff5500] text-white px-6 py-2
                             clip-parallelogram hover:shadow-[0_0_16px_rgba(255,85,0,0.3)]
                             transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed
                             flex items-center gap-2 flex-shrink-0"
                  style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1rem', letterSpacing: '0.05em' }}
                >
                  {updating ? (
                    <>
                      <svg className="animate-spin w-3 h-3" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                      </svg>
                      SAVING…
                    </>
                  ) : (
                    'UPDATE'
                  )}
                </button>
              </div>
              {newStatus === order.status && (
                <p className="font-technical text-[10px] text-stone-600 uppercase tracking-widest mt-2">
                  Select a different status to update.
                </p>
              )}
            </section>

            {/* ── Admin notes ────────────────────────────────────────── */}
            <section>
              <SectionLabel>Admin Notes (Internal)</SectionLabel>
              <textarea
                value={adminNote}
                onChange={(e) => setAdminNote(e.target.value)}
                rows={3}
                placeholder="Internal notes — not visible to customer…"
                className="w-full bg-[#080808] border border-white/10 text-white font-body text-sm p-3
                           focus:outline-none focus:border-[#ff5500] transition-colors resize-none
                           placeholder:text-stone-700"
              />
              <div className="flex justify-end mt-2">
                <button
                  onClick={handleSaveNote}
                  disabled={savingNote}
                  className="font-technical text-xs uppercase tracking-widest px-4 py-2
                             border border-white/20 text-stone-400 hover:text-white
                             hover:border-white/40 transition-colors disabled:opacity-40
                             disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {savingNote ? (
                    <>
                      <svg className="animate-spin w-3 h-3" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                      </svg>
                      Saving…
                    </>
                  ) : (
                    'Save Note'
                  )}
                </button>
              </div>
            </section>

            <section>
              <SectionLabel>Delete Order</SectionLabel>
              <div className="bg-red-950/20 border border-red-900/50 p-4 space-y-3">
                <p className="font-body text-sm text-red-200/80 leading-relaxed">
                  Delete this order permanently. This action cannot be undone.
                </p>
                {confirmDelete ? (
                  <div className="flex flex-wrap items-center gap-3">
                    <button
                      onClick={handleDeleteOrder}
                      disabled={deleting}
                      className="px-4 py-2 bg-red-600 text-white font-technical text-xs uppercase tracking-widest
                                 hover:bg-red-700 transition-colors disabled:opacity-50
                                 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                      {deleting ? (
                        <>
                          <svg className="animate-spin w-3 h-3" viewBox="0 0 24 24" fill="none">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                          </svg>
                          Deleting...
                        </>
                      ) : (
                        'Confirm Delete'
                      )}
                    </button>
                    <button
                      onClick={() => setConfirmDelete(false)}
                      disabled={deleting}
                      className="px-4 py-2 border border-white/15 text-stone-300 font-technical text-xs uppercase tracking-widest
                                 hover:border-white/30 hover:text-white transition-colors disabled:opacity-50
                                 disabled:cursor-not-allowed"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setConfirmDelete(true)}
                    className="px-4 py-2 border border-red-500/60 text-red-300 font-technical text-xs uppercase tracking-widest
                               hover:bg-red-500/10 transition-colors"
                  >
                    Delete Order
                  </button>
                )}
              </div>
            </section>

          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

/* ─── Sub-component ──────────────────────────────────────────────── */

function InfoRow({ icon, label, value, mono }) {
  return (
    <div className="flex items-start gap-2">
      <span
        className="material-symbols-outlined text-stone-600 flex-shrink-0 mt-0.5"
        style={{ fontSize: 15 }}
      >
        {icon}
      </span>
      <div className="min-w-0">
        <p className="font-technical text-[10px] text-stone-600 uppercase tracking-widest">{label}</p>
        <p
          className={`text-stone-200 text-sm mt-0.5 break-words ${mono ? '' : 'font-body'}`}
          style={mono ? { fontFamily: "'Space Mono', monospace", fontSize: '0.8rem' } : {}}
        >
          {value}
        </p>
      </div>
    </div>
  );
}
