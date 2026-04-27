import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../../lib/supabase';
import { fetchProducts } from '../../data/products';

/* ─── Product search autocomplete ───────────────────────────────── */

function ProductSearch({ value, onChange, onSelect, products }) {
  const [open, setOpen]   = useState(false);
  const [query, setQuery] = useState(value);
  const containerRef      = useRef(null);

  useEffect(() => { setQuery(value); }, [value]);

  useEffect(() => {
    function handler(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const filtered = query.trim()
    ? products.filter((p) => p.name.toLowerCase().includes(query.trim().toLowerCase()))
    : products;

  const select = (p) => { setQuery(p.name); onSelect(p); setOpen(false); };

  return (
    <div ref={containerRef} className="relative">
      <input
        type="text"
        value={query}
        placeholder="Product name…"
        className="w-full bg-[#080808] border border-white/10 text-white text-sm px-3 py-2
                   focus:outline-none focus:border-[#ff5500] transition-colors placeholder:text-stone-700"
        onChange={(e) => { setQuery(e.target.value); onChange(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
      />
      {open && filtered.length > 0 && (
        <div className="absolute left-0 right-0 top-full z-50 bg-[#161616] border border-white/10 border-t-0 max-h-44 overflow-y-auto shadow-lg">
          {filtered.map((p) => (
            <button
              key={p.id}
              onMouseDown={(e) => { e.preventDefault(); select(p); }}
              className="w-full text-left px-3 py-2 flex items-center gap-3 hover:bg-[#ff5500]/10 transition-colors"
            >
              {p.img1 && (
                <img src={p.img1} alt="" className="w-6 h-6 object-cover flex-shrink-0 opacity-70" />
              )}
              <span className="text-sm text-stone-300 truncate">{p.name}</span>
              <span className="ml-auto font-mono text-[11px] text-stone-600 flex-shrink-0"
                    style={{ fontFamily: "'Space Mono', monospace" }}>
                {p.price ? `৳${Number(p.price).toLocaleString('en-IN')}` : ''}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── Main component ─────────────────────────────────────────────── */

export default function CreateOrderModal({ onClose, onCreated }) {
  const [form, setForm] = useState({
    customer_name:   '',
    phone:           '',
    fulfillment_type: 'delivery',
    district:        '',
    area:            '',
    address:         '',
    delivery_fee:    60,
    notes:           '',
    status:          'pending',
  });

  const [items,    setItems]    = useState([{ id: Date.now(), name: '', price: 0, quantity: 1, image: '' }]);
  const [products, setProducts] = useState([]);
  const [saving,   setSaving]   = useState(false);
  const [error,    setError]    = useState(null);

  useEffect(() => {
    fetchProducts().then(setProducts).catch(() => {});
  }, []);

  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  const upd = (key, val) => setForm((f) => ({ ...f, [key]: val }));

  const updateItem = (idx, key, val) =>
    setItems((prev) => prev.map((it, i) => (i === idx ? { ...it, [key]: val } : it)));

  const addItem = () =>
    setItems((prev) => [...prev, { id: Date.now(), name: '', price: 0, quantity: 1, image: '' }]);

  const removeItem = (idx) =>
    setItems((prev) => prev.filter((_, i) => i !== idx));

  /* ── Computed totals ──────────────────────────────────────────── */
  const subtotal    = items.reduce((s, it) => s + (Number(it.price) || 0) * (Number(it.quantity) || 1), 0);
  const deliveryFee = form.fulfillment_type === 'pickup' ? 0 : (Number(form.delivery_fee) || 0);
  const total       = subtotal + deliveryFee;

  /* ── Submit ────────────────────────────────────────────────────── */
  const handleSubmit = async () => {
    setError(null);
    if (!form.customer_name.trim())           { setError('Customer name is required.');      return; }
    if (!form.phone.trim())                   { setError('Phone number is required.');       return; }
    if (items.every((it) => !it.name.trim())) { setError('At least one item is required.');  return; }

    setSaving(true);

    const orderItems = items
      .filter((it) => it.name.trim())
      .map((it) => ({
        id:       it.id,
        name:     it.name.trim(),
        price:    Number(it.price)    || 0,
        quantity: Number(it.quantity) || 1,
        image:    it.image || '',
      }));

    const payload = {
      customer_name:   form.customer_name.trim(),
      phone:           form.phone.trim(),
      fulfillment_type: form.fulfillment_type,
      district:        form.fulfillment_type !== 'pickup' ? form.district.trim()  || null : null,
      area:            form.fulfillment_type !== 'pickup' ? form.area.trim()      || null : null,
      address:         form.fulfillment_type !== 'pickup' ? form.address.trim()   || null : null,
      items:           orderItems,
      total_amount:    total,
      delivery_fee:    deliveryFee,
      notes:           form.notes.trim() || null,
      status:          form.status,
      admin_notes:     null,
    };

    const { data, error: err } = await supabase.from('orders').insert(payload).select().single();
    setSaving(false);

    if (err) { setError('Failed to create order: ' + err.message); return; }
    onCreated(data);
  };

  /* ── Styles ─────────────────────────────────────────────────────── */
  const inputClass =
    'w-full bg-[#080808] border border-white/10 text-white text-sm px-3 py-2 ' +
    'focus:outline-none focus:border-[#ff5500] transition-colors placeholder:text-stone-700';

  const labelClass = 'font-technical text-[10px] text-stone-500 uppercase tracking-widest mb-1.5 block';

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 bg-black/75 z-50 flex items-center justify-center p-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      >
        <motion.div
          className="bg-[#111111] border border-white/10 w-full max-w-2xl max-h-[90vh] overflow-y-auto"
          initial={{ opacity: 0, y: 32, scale: 0.97 }}
          animate={{ opacity: 1, y: 0,  scale: 1 }}
          exit={{ opacity: 0, y: 16, scale: 0.98 }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-white/10 sticky top-0 bg-[#111111] z-10">
            <h2
              className="text-white uppercase"
              style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.75rem', lineHeight: 1 }}
            >
              Create Custom Order
            </h2>
            <button onClick={onClose} className="text-stone-500 hover:text-white transition-colors">
              <span className="material-symbols-outlined" style={{ fontSize: 22 }}>close</span>
            </button>
          </div>

          <div className="p-6 space-y-6">

            {/* Error */}
            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="bg-red-950/40 border border-red-800/60 p-3 flex items-center gap-2"
                >
                  <span
                    className="material-symbols-outlined text-red-400 flex-shrink-0"
                    style={{ fontSize: 15, fontVariationSettings: "'FILL' 1" }}
                  >
                    error
                  </span>
                  <p className="font-body text-red-400 text-sm">{error}</p>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Customer Information */}
            <section>
              <p className="font-technical text-[10px] text-stone-500 uppercase tracking-widest mb-3">
                Customer Information
              </p>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Customer Name *</label>
                  <input
                    className={inputClass}
                    placeholder="Full name"
                    value={form.customer_name}
                    onChange={(e) => upd('customer_name', e.target.value)}
                  />
                </div>
                <div>
                  <label className={labelClass}>Phone *</label>
                  <input
                    className={inputClass}
                    placeholder="+880…"
                    value={form.phone}
                    onChange={(e) => upd('phone', e.target.value)}
                  />
                </div>
              </div>
            </section>

            {/* Fulfillment */}
            <section>
              <p className="font-technical text-[10px] text-stone-500 uppercase tracking-widest mb-3">
                Fulfillment Type
              </p>
              <div className="flex gap-3">
                {[
                  { value: 'delivery', icon: 'local_shipping', label: 'Home Delivery' },
                  { value: 'pickup',   icon: 'storefront',     label: 'Pickup'        },
                ].map(({ value, icon, label }) => (
                  <button
                    key={value}
                    onClick={() => upd('fulfillment_type', value)}
                    className={`flex-1 flex items-center justify-center gap-2 py-2.5 border
                               font-technical text-xs uppercase tracking-widest transition-colors ${
                      form.fulfillment_type === value
                        ? 'border-[#ff5500] bg-[#ff5500]/10 text-[#ff5500]'
                        : 'border-white/10 text-stone-500 hover:border-white/20 hover:text-stone-300'
                    }`}
                  >
                    <span
                      className="material-symbols-outlined"
                      style={{ fontSize: 14, fontVariationSettings: "'FILL' 1" }}
                    >
                      {icon}
                    </span>
                    {label}
                  </button>
                ))}
              </div>

              {form.fulfillment_type === 'delivery' && (
                <div className="grid grid-cols-2 gap-4 mt-4">
                  <div>
                    <label className={labelClass}>District</label>
                    <input
                      className={inputClass}
                      placeholder="e.g. Dhaka"
                      value={form.district}
                      onChange={(e) => upd('district', e.target.value)}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Area</label>
                    <input
                      className={inputClass}
                      placeholder="e.g. Mirpur"
                      value={form.area}
                      onChange={(e) => upd('area', e.target.value)}
                    />
                  </div>
                  <div className="col-span-2">
                    <label className={labelClass}>Address</label>
                    <input
                      className={inputClass}
                      placeholder="Full delivery address"
                      value={form.address}
                      onChange={(e) => upd('address', e.target.value)}
                    />
                  </div>
                </div>
              )}
            </section>

            {/* Order Items */}
            <section>
              <p className="font-technical text-[10px] text-stone-500 uppercase tracking-widest mb-3">
                Order Items
              </p>

              {/* Column headers */}
              <div className="grid grid-cols-12 gap-2 px-1 mb-1.5">
                <div className="col-span-6">
                  <span className="font-technical text-[10px] text-stone-600 uppercase tracking-widest">Product</span>
                </div>
                <div className="col-span-2 text-center">
                  <span className="font-technical text-[10px] text-stone-600 uppercase tracking-widest">Qty</span>
                </div>
                <div className="col-span-3">
                  <span className="font-technical text-[10px] text-stone-600 uppercase tracking-widest">Price (৳)</span>
                </div>
                <div className="col-span-1" />
              </div>

              <div className="space-y-2">
                {items.map((item, idx) => (
                  <div key={item.id} className="grid grid-cols-12 gap-2 items-center">
                    <div className="col-span-6">
                      <ProductSearch
                        value={item.name}
                        products={products}
                        onChange={(name) => updateItem(idx, 'name', name)}
                        onSelect={(p) =>
                          setItems((prev) =>
                            prev.map((it, i) =>
                              i === idx
                                ? { ...it, name: p.name, price: p.price || 0, image: p.img1 || '' }
                                : it
                            )
                          )
                        }
                      />
                    </div>
                    <div className="col-span-2">
                      <input
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={(e) =>
                          updateItem(idx, 'quantity', Math.max(1, parseInt(e.target.value) || 1))
                        }
                        className="w-full bg-[#080808] border border-white/10 text-white text-sm px-3 py-2
                                   focus:outline-none focus:border-[#ff5500] transition-colors text-center"
                        style={{ fontFamily: "'Space Mono', monospace" }}
                      />
                    </div>
                    <div className="col-span-3">
                      <input
                        type="number"
                        min="0"
                        step="1"
                        value={item.price}
                        onChange={(e) => updateItem(idx, 'price', parseFloat(e.target.value) || 0)}
                        className="w-full bg-[#080808] border border-white/10 text-white text-sm px-3 py-2
                                   focus:outline-none focus:border-[#ff5500] transition-colors"
                        style={{ fontFamily: "'Space Mono', monospace" }}
                      />
                    </div>
                    <div className="col-span-1 flex justify-end">
                      {items.length > 1 && (
                        <button
                          onClick={() => removeItem(idx)}
                          className="text-stone-700 hover:text-red-400 transition-colors"
                        >
                          <span className="material-symbols-outlined" style={{ fontSize: 15 }}>
                            remove_circle
                          </span>
                        </button>
                      )}
                    </div>
                    {/* Line total hint */}
                    {item.price > 0 && (
                      <div className="col-span-12 -mt-1 px-1">
                        <span className="font-technical text-[9px] text-stone-700 uppercase tracking-widest">
                          = ৳{((Number(item.price) || 0) * (Number(item.quantity) || 1)).toLocaleString('en-IN')}
                        </span>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <button
                onClick={addItem}
                className="flex items-center gap-1.5 font-technical text-[10px] uppercase tracking-widest
                           text-[#ff5500] hover:text-white transition-colors mt-3"
              >
                <span className="material-symbols-outlined" style={{ fontSize: 13 }}>add</span>
                Add Item
              </button>
            </section>

            {/* Pricing Summary */}
            <section>
              <p className="font-technical text-[10px] text-stone-500 uppercase tracking-widest mb-3">
                Pricing
              </p>
              <div className="bg-[#161616] border border-white/5 p-4 space-y-2">
                {form.fulfillment_type === 'delivery' && (
                  <div className="flex items-center justify-between gap-4">
                    <label className="font-body text-stone-400 text-sm">Delivery Fee (৳)</label>
                    <input
                      type="number"
                      min="0"
                      value={form.delivery_fee}
                      onChange={(e) => upd('delivery_fee', parseFloat(e.target.value) || 0)}
                      className="w-28 bg-[#080808] border border-white/10 text-white text-sm px-3 py-1.5
                                 focus:outline-none focus:border-[#ff5500] transition-colors text-right"
                      style={{ fontFamily: "'Space Mono', monospace" }}
                    />
                  </div>
                )}
                <div className="flex justify-between font-body text-stone-400 text-sm">
                  <span>Subtotal</span>
                  <span style={{ fontFamily: "'Space Mono', monospace" }}>
                    ৳{subtotal.toLocaleString('en-IN')}
                  </span>
                </div>
                {form.fulfillment_type === 'delivery' && (
                  <div className="flex justify-between font-body text-stone-400 text-sm">
                    <span>Delivery Fee</span>
                    <span style={{ fontFamily: "'Space Mono', monospace" }}>
                      ৳{deliveryFee.toLocaleString('en-IN')}
                    </span>
                  </div>
                )}
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
                    ৳{total.toLocaleString('en-IN')}
                  </span>
                </div>
              </div>
            </section>

            {/* Notes + Initial Status */}
            <section className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Customer Notes</label>
                <textarea
                  rows={3}
                  value={form.notes}
                  onChange={(e) => upd('notes', e.target.value)}
                  placeholder="Special instructions…"
                  className="w-full bg-[#080808] border border-white/10 text-white text-sm px-3 py-2
                             focus:outline-none focus:border-[#ff5500] transition-colors resize-none
                             placeholder:text-stone-700"
                />
              </div>
              <div>
                <label className={labelClass}>Initial Status</label>
                <div className="relative">
                  <select
                    value={form.status}
                    onChange={(e) => upd('status', e.target.value)}
                    className="w-full bg-[#080808] border border-white/10 text-white text-sm px-3 py-2
                               focus:outline-none focus:border-[#ff5500] transition-colors
                               appearance-none cursor-pointer pr-8"
                  >
                    {['pending', 'confirmed', 'shipped', 'delivered', 'cancelled'].map((s) => (
                      <option key={s} value={s} className="bg-[#080808]">
                        {s.charAt(0).toUpperCase() + s.slice(1)}
                      </option>
                    ))}
                  </select>
                  <span
                    className="material-symbols-outlined absolute right-2 top-1/2 -translate-y-1/2
                               pointer-events-none text-stone-500"
                    style={{ fontSize: 16 }}
                  >
                    expand_more
                  </span>
                </div>
              </div>
            </section>

            {/* Footer actions */}
            <div className="flex justify-end gap-3 pt-2 border-t border-white/10">
              <button
                onClick={onClose}
                className="px-4 py-2 border border-white/15 text-stone-300 font-technical text-xs uppercase
                           tracking-widest hover:border-white/30 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={saving}
                className="flex items-center gap-2 bg-[#ff5500] text-white px-6 py-2
                           font-technical text-xs uppercase tracking-widest
                           hover:bg-[#e04d00] transition-colors
                           disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? (
                  <>
                    <svg className="animate-spin w-3 h-3" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                    </svg>
                    Creating…
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined" style={{ fontSize: 13 }}>add</span>
                    Create Order
                  </>
                )}
              </button>
            </div>

          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
