/**
 * Invoice Maker.
 *
 * Built for a job billed at the end: lines get added over days or weeks, each
 * with photos of what was bought and what it cost us, and the profit updates
 * as you type. Nothing about cost or profit reaches the client — it lives in
 * this editor, in the internal copy of the PDF, and in the invoices table,
 * which only team members can read.
 *
 * Completing an invoice writes it into Orders, so a finished job appears there
 * with every line, photo and price.
 */
import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import AdminNavbar from '../../components/admin/AdminNavbar';
import PageTagline from '../../components/admin/PageTagline';
import InvoiceDocument from '../../components/admin/InvoiceDocument';
import { useCurrentMember } from '../../contexts/CurrentMemberContext';
import { useCompressUploads } from '../../lib/imageCompression';
import { uploadImage } from '../../lib/cloudinaryUpload';
import {
  INVOICE_STATUS_META, MAX_ITEM_IMAGES,
  completeInvoice, createInvoice, deleteInvoice as deleteInvoiceRow, duplicateInvoice,
  emptyLine, fetchInvoices, fetchProductCosts, filledLines, fmtCurrency, fmtDate,
  invoiceTotals, lineProfit, lineRevenue, marginPct, saveInvoice,
} from '../../lib/invoices';

/* ─── Business details ───────────────────────────────────────────────────────
   Letterhead, not invoice data: it's the same on every bill, so it stays in
   this browser rather than earning a table. */

const BUSINESS_KEY = 'inv_business';

const DEFAULT_BUSINESS = {
  name:    'Layercade',
  tagline: '3D Printing Studio',
  address: 'Mirpur DOHS, Dhaka, Bangladesh',
  phone:   '',
  email:   '',
  website: 'layercade.com',
};

function loadBusiness() {
  try {
    const raw = localStorage.getItem(BUSINESS_KEY);
    return raw ? { ...DEFAULT_BUSINESS, ...JSON.parse(raw) } : DEFAULT_BUSINESS;
  } catch { return DEFAULT_BUSINESS; }
}

/* ─── Atoms ──────────────────────────────────────────────────────────────── */

const inputClass =
  'w-full bg-[#0a0a0a] border border-white/10 text-white text-sm px-3 py-2 ' +
  'focus:outline-none focus:border-[#ff5500]/60 transition-colors placeholder-stone-700';

const numberClass = `${inputClass} text-right`;
const monoStyle = { fontFamily: "'Space Mono', monospace" };

function Label({ children }) {
  return <span className="font-technical text-[10px] text-stone-500 uppercase tracking-widest">{children}</span>;
}

function Field({ label, children }) {
  return <div className="space-y-1.5"><Label>{label}</Label>{children}</div>;
}

function Input({ value, onChange, placeholder, type = 'text' }) {
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className={inputClass}
    />
  );
}

function Card({ children, className = '' }) {
  return <div className={`bg-[#111111] border border-white/10 p-5 ${className}`}>{children}</div>;
}

function SectionTitle({ children, right }) {
  return (
    <div className="flex items-center justify-between mb-3">
      <p className="font-technical text-[10px] text-stone-500 uppercase tracking-widest">{children}</p>
      {right}
    </div>
  );
}

function StatusBadge({ status, className = '' }) {
  const m = INVOICE_STATUS_META[status] ?? INVOICE_STATUS_META.draft;
  return (
    <span className={`inline-block px-2.5 py-0.5 text-[10px] font-technical uppercase tracking-widest border ${m.bg} ${m.text} ${m.border} ${className}`}>
      {m.label}
    </span>
  );
}

function Icon({ name, size = 14, className = '', style }) {
  return (
    <span className={`material-symbols-outlined ${className}`} style={{ fontSize: size, ...style }}>
      {name}
    </span>
  );
}

/** Profit reads as money, so it gets a colour: green earned, red underwater. */
function profitTone(profit) {
  if (profit > 0) return 'text-green-400';
  if (profit < 0) return 'text-red-400';
  return 'text-stone-400';
}

/* ─── Sidebar list ───────────────────────────────────────────────────────── */

function InvoiceListItem({ invoice, isActive, onClick, onDelete }) {
  const { revenue, profit } = invoiceTotals(invoice.items);
  return (
    <div
      onClick={onClick}
      className={`group flex items-center gap-3 px-4 py-3 border-b border-white/5 cursor-pointer transition-colors ${
        isActive
          ? 'bg-[#ff5500]/5 border-l-2 border-l-[#ff5500]'
          : 'hover:bg-white/[0.02] border-l-2 border-l-transparent'
      }`}
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span className="font-mono text-[11px] text-[#ff5500]" style={monoStyle}>{invoice.number}</span>
          <StatusBadge status={invoice.status} />
          {invoice.order_id && (
            <span className="font-technical text-[9px] text-stone-500 uppercase tracking-widest">
              #{invoice.order_id}
            </span>
          )}
        </div>
        <p className="text-white text-sm font-body truncate">{invoice.client_name || 'Unnamed client'}</p>
        <p className="font-technical text-[10px] text-stone-600 uppercase tracking-widest">
          {fmtDate(invoice.issue_date)} · {fmtCurrency(revenue, invoice.currency)}
          {revenue > 0 && (
            <span className={profitTone(profit)}> · {fmtCurrency(profit, invoice.currency)}</span>
          )}
        </p>
      </div>
      <button
        onClick={(e) => { e.stopPropagation(); onDelete(invoice); }}
        className="opacity-0 group-hover:opacity-100 text-stone-600 hover:text-red-400 transition-all"
        title="Delete invoice"
      >
        <Icon name="delete" size={15} />
      </button>
    </div>
  );
}

/* ─── Product picker ─────────────────────────────────────────────────────── */

/**
 * Typing a description doubles as a product search. Picking one fills the
 * charged price and our cost from the catalogue, both still editable — a line
 * records what we charged and paid on the day, not what the product says now.
 */
function DescriptionInput({ value, onChange, onPickProduct, products, currency }) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    function handle(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, []);

  const query = value.trim().toLowerCase();
  const matches = (query ? products.filter((p) => p.name.toLowerCase().includes(query)) : products).slice(0, 8);

  return (
    <div ref={containerRef} className="relative">
      <textarea
        rows={1}
        value={value}
        placeholder="What was ordered…"
        onChange={(e) => { onChange(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        className={`${inputClass} resize-y min-h-[38px]`}
      />
      {open && matches.length > 0 && (
        <div className="absolute left-0 right-0 top-full z-50 bg-[#111111] border border-white/10 border-t-0 max-h-52 overflow-y-auto shadow-lg">
          {matches.map((p) => (
            <button
              key={p.id}
              onMouseDown={(e) => { e.preventDefault(); onPickProduct(p); setOpen(false); }}
              className="w-full text-left px-3 py-2 flex items-center gap-3 hover:bg-[#ff5500]/10 transition-colors group"
            >
              {p.image && <img src={p.image} alt="" className="w-6 h-6 object-cover flex-shrink-0 opacity-70 group-hover:opacity-100" />}
              <span className="text-sm text-stone-300 group-hover:text-white truncate">{p.name}</span>
              <span className="ml-auto font-mono text-[10px] text-stone-600 flex-shrink-0 text-right" style={monoStyle}>
                {fmtCurrency(p.price, currency)}
                {p.cost != null && <span className="block text-stone-700">cost {fmtCurrency(p.cost, currency)}</span>}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── Line item photos ───────────────────────────────────────────────────── */

function LinePhotos({ images, onChange, compress }) {
  const fileRef = useRef(null);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState(null);

  const room = MAX_ITEM_IMAGES - images.length;

  const pick = async (files) => {
    const chosen = [...files].slice(0, room);
    if (!chosen.length) return;
    setError(null);
    setBusy(true);
    setProgress(0);
    const uploaded = [];
    try {
      for (const file of chosen) {
        uploaded.push(await uploadImage(file, {
          folder: 'layercade/invoices',
          compress,
          onProgress: setProgress,
        }));
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = '';
      // Keep whatever made it up, even if a later file failed.
      if (uploaded.length) onChange([...images, ...uploaded]);
    }
  };

  return (
    <div className="flex items-start gap-2 flex-wrap">
      {images.map((url) => (
        <div key={url} className="relative group w-14 h-14 bg-stone-900 border border-white/10 overflow-hidden">
          <img src={url} alt="" className="w-full h-full object-cover" />
          <button
            onClick={() => onChange(images.filter((u) => u !== url))}
            className="absolute inset-0 bg-black/70 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity"
            title="Remove photo"
          >
            <Icon name="close" size={16} className="text-red-400" />
          </button>
        </div>
      ))}

      {room > 0 && (
        <button
          onClick={() => fileRef.current?.click()}
          disabled={busy}
          className="w-14 h-14 border border-dashed border-white/15 text-stone-600 hover:text-[#ff5500]
                     hover:border-[#ff5500]/40 transition-colors flex flex-col items-center justify-center
                     disabled:opacity-60 disabled:cursor-wait"
          title="Attach a photo (shows on the client's copy too)"
        >
          {busy ? (
            <span className="font-mono text-[9px] text-[#ff5500]" style={monoStyle}>{progress}%</span>
          ) : (
            <Icon name="add_a_photo" size={16} />
          )}
        </button>
      )}

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => pick(e.target.files)}
      />

      {error && <p className="font-technical text-[9px] text-red-400 w-full leading-tight">{error}</p>}
    </div>
  );
}

/* ─── Line items editor ──────────────────────────────────────────────────── */

function LineItemsEditor({ items, onChange, currency, products, compress }) {
  const update = (idx, patch) => onChange(items.map((line, i) => (i === idx ? { ...line, ...patch } : line)));
  const add = () => onChange([...items, emptyLine()]);
  const remove = (idx) => onChange(items.length > 1 ? items.filter((_, i) => i !== idx) : [emptyLine()]);

  return (
    <div className="space-y-3">
      <div className="hidden md:grid grid-cols-12 gap-2 px-1">
        <div className="col-span-5"><Label>Description</Label></div>
        <div className="col-span-1 text-center"><Label>Qty</Label></div>
        <div className="col-span-2 text-right"><Label>Unit Price</Label></div>
        <div className="col-span-2 text-right"><Label>Unit Cost</Label></div>
        <div className="col-span-2 text-right"><Label>Line Total</Label></div>
      </div>

      {items.map((line, idx) => {
        const revenue = lineRevenue(line);
        const profit = lineProfit(line);
        const margin = marginPct(revenue, profit);
        return (
          <div key={line.id} className="bg-[#0d0d0d] border border-white/5 p-3 space-y-2.5">
            <div className="grid grid-cols-12 gap-2 items-start">
              <div className="col-span-12 md:col-span-5">
                <DescriptionInput
                  value={line.description}
                  currency={currency}
                  products={products}
                  onChange={(v) => update(idx, { description: v })}
                  onPickProduct={(p) => update(idx, {
                    description: p.name,
                    unit_price: p.price,
                    ...(p.cost != null && { cost: p.cost }),
                    productId: p.id,
                  })}
                />
              </div>
              <div className="col-span-3 md:col-span-1">
                <input
                  type="number" min="0" step="1" value={line.qty}
                  onChange={(e) => update(idx, { qty: parseFloat(e.target.value) || 0 })}
                  className={`${inputClass} text-center`} style={monoStyle}
                />
              </div>
              <div className="col-span-4 md:col-span-2">
                <input
                  type="number" min="0" step="1" value={line.unit_price}
                  onChange={(e) => update(idx, { unit_price: parseFloat(e.target.value) || 0 })}
                  className={numberClass} style={monoStyle}
                />
              </div>
              <div className="col-span-4 md:col-span-2">
                <input
                  type="number" min="0" step="1" value={line.cost}
                  onChange={(e) => update(idx, { cost: parseFloat(e.target.value) || 0 })}
                  className={`${numberClass} border-amber-500/20 focus:border-amber-500/60`} style={monoStyle}
                  title="What this item cost us — never shown to the client"
                />
              </div>
              <div className="col-span-10 md:col-span-2 flex md:justify-end items-center">
                <span className="font-mono text-sm text-white" style={monoStyle}>
                  {fmtCurrency(revenue, currency)}
                </span>
              </div>
              <div className="col-span-2 md:col-span-12 flex md:hidden justify-end">
                <button onClick={() => remove(idx)} className="text-stone-700 hover:text-red-400 transition-colors">
                  <Icon name="remove_circle" size={16} />
                </button>
              </div>
            </div>

            <div className="flex items-end justify-between gap-3 flex-wrap">
              <LinePhotos
                images={line.images}
                compress={compress}
                onChange={(images) => update(idx, { images })}
              />
              <div className="flex items-center gap-4 ml-auto">
                <span className="font-technical text-[10px] uppercase tracking-widest text-stone-600">
                  Profit{' '}
                  <span className={`font-mono ${profitTone(profit)}`} style={monoStyle}>
                    {fmtCurrency(profit, currency)}
                  </span>
                  {margin != null && (
                    <span className="text-stone-700"> · {margin.toFixed(0)}%</span>
                  )}
                </span>
                <button
                  onClick={() => remove(idx)}
                  className="hidden md:block text-stone-700 hover:text-red-400 transition-colors"
                  title="Remove line"
                >
                  <Icon name="remove_circle" size={16} />
                </button>
              </div>
            </div>
          </div>
        );
      })}

      <button
        onClick={add}
        className="flex items-center gap-1.5 font-technical text-[10px] uppercase tracking-widest
                   text-[#ff5500] hover:text-white transition-colors"
      >
        <Icon name="add" size={13} />
        Add Line Item
      </button>
    </div>
  );
}

/* ─── Live profit panel ──────────────────────────────────────────────────── */

function ProfitPanel({ items, currency }) {
  const { revenue, cost, profit, margin } = invoiceTotals(filledLines(items));
  return (
    <div className="bg-[#111111] border border-[#ff5500]/20 p-4">
      <div className="flex items-center gap-1.5 mb-3">
        <Icon name="visibility_off" size={13} className="text-amber-500" />
        <p className="font-technical text-[10px] text-amber-500 uppercase tracking-widest">
          Your eyes only — never on the client&apos;s copy
        </p>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Billed',  value: fmtCurrency(revenue, currency), tone: 'text-white' },
          { label: 'Cost',    value: fmtCurrency(cost, currency),    tone: 'text-stone-400' },
          { label: 'Profit',  value: fmtCurrency(profit, currency),  tone: profitTone(profit) },
          { label: 'Margin',  value: margin == null ? '—' : `${margin.toFixed(1)}%`, tone: profitTone(profit) },
        ].map(({ label, value, tone }) => (
          <div key={label}>
            <p className="font-technical text-[9px] text-stone-500 uppercase tracking-widest">{label}</p>
            <p className={`font-mono text-lg font-bold ${tone}`} style={monoStyle}>{value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── Editor ─────────────────────────────────────────────────────────────── */

function InvoiceEditor({ invoice, onChange, products, compress }) {
  const upd = (key, value) => onChange({ ...invoice, [key]: value });

  return (
    <div className="space-y-5">
      <ProfitPanel items={invoice.items} currency={invoice.currency} />

      <Card>
        <SectionTitle>Invoice Details</SectionTitle>
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <Field label="Invoice No.">
              <div className={`${inputClass} font-mono text-[#ff5500] cursor-default`} style={monoStyle}>
                {invoice.number}
              </div>
            </Field>
            <Field label="Status">
              <select
                value={invoice.status}
                onChange={(e) => upd('status', e.target.value)}
                className={inputClass}
              >
                {Object.entries(INVOICE_STATUS_META).map(([key, meta]) => (
                  <option key={key} value={key}>{meta.label}</option>
                ))}
              </select>
            </Field>
            <Field label="Currency">
              <select
                value={invoice.currency}
                onChange={(e) => upd('currency', e.target.value)}
                className={inputClass}
              >
                <option value="BDT">BDT (৳)</option>
                <option value="USD">USD ($)</option>
              </select>
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Invoice Date">
              <Input type="date" value={invoice.issue_date} onChange={(v) => upd('issue_date', v)} />
            </Field>
            <Field label="Due Date">
              <Input type="date" value={invoice.due_date} onChange={(v) => upd('due_date', v)} />
            </Field>
          </div>
        </div>
      </Card>

      <Card>
        <SectionTitle>Client Details</SectionTitle>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Client Name">
            <Input value={invoice.client_name} onChange={(v) => upd('client_name', v)} placeholder="Full name or company" />
          </Field>
          <Field label="Email">
            <Input type="email" value={invoice.client_email} onChange={(v) => upd('client_email', v)} placeholder="client@email.com" />
          </Field>
          <Field label="Phone">
            <Input value={invoice.client_phone} onChange={(v) => upd('client_phone', v)} placeholder="+880 1X XX XXX XXXX" />
          </Field>
          <Field label="Address">
            <Input value={invoice.client_address} onChange={(v) => upd('client_address', v)} placeholder="Street, City, Country" />
          </Field>
        </div>
        <p className="font-technical text-[9px] text-stone-600 uppercase tracking-widest mt-3">
          Name and phone are what the order is filed under
        </p>
      </Card>

      <Card>
        <SectionTitle right={
          <span className="font-technical text-[9px] text-stone-600 uppercase tracking-widest">
            Photos appear on the client&apos;s copy
          </span>
        }>
          Line Items
        </SectionTitle>
        <LineItemsEditor
          items={invoice.items}
          onChange={(items) => upd('items', items)}
          currency={invoice.currency}
          products={products}
          compress={compress}
        />
      </Card>

      <Card>
        <SectionTitle>Notes</SectionTitle>
        <textarea
          value={invoice.notes}
          onChange={(e) => upd('notes', e.target.value)}
          placeholder="Payment terms, bank details, thank-you message…"
          rows={3}
          className={`${inputClass} resize-none`}
        />
      </Card>
    </div>
  );
}

/* ─── Modals ─────────────────────────────────────────────────────────────── */

function Modal({ children, onClose, maxWidth = 'max-w-md' }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 px-4" onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 8 }}
        onClick={(e) => e.stopPropagation()}
        className={`bg-[#111111] border border-white/10 w-full ${maxWidth} p-6 space-y-4`}
      >
        {children}
      </motion.div>
    </div>
  );
}

function BusinessModal({ business, onSave, onClose }) {
  const [form, setForm] = useState(business);
  return (
    <Modal onClose={onClose}>
      <div className="flex items-center justify-between">
        <p className="font-technical text-xs text-white uppercase tracking-widest">Business Details</p>
        <button onClick={onClose} className="text-stone-600 hover:text-white transition-colors">
          <Icon name="close" size={18} />
        </button>
      </div>
      <div className="space-y-3">
        {[
          { key: 'name',    label: 'Business Name' },
          { key: 'tagline', label: 'Tagline / Type' },
          { key: 'address', label: 'Address' },
          { key: 'phone',   label: 'Phone' },
          { key: 'email',   label: 'Email' },
          { key: 'website', label: 'Website' },
        ].map(({ key, label }) => (
          <Field key={key} label={label}>
            <Input value={form[key] ?? ''} onChange={(v) => setForm((f) => ({ ...f, [key]: v }))} placeholder={label} />
          </Field>
        ))}
      </div>
      <div className="flex gap-3 pt-2">
        <button
          onClick={() => { onSave(form); onClose(); }}
          className="flex-1 py-2.5 bg-[#ff5500] text-white font-technical text-xs uppercase tracking-widest hover:bg-[#e04d00] transition-colors"
        >
          Save
        </button>
        <button
          onClick={onClose}
          className="flex-1 py-2.5 border border-white/10 text-stone-400 font-technical text-xs uppercase tracking-widest hover:text-white transition-colors"
        >
          Cancel
        </button>
      </div>
    </Modal>
  );
}

function DeleteModal({ invoice, onConfirm, onClose, busy }) {
  return (
    <Modal onClose={onClose} maxWidth="max-w-sm">
      <p className="font-technical text-xs text-white uppercase tracking-widest">Delete Invoice?</p>
      <p className="text-stone-400 text-sm">
        Invoice <span className="font-mono text-[#ff5500]" style={monoStyle}>{invoice.number}</span> will be
        permanently deleted for everyone.
        {invoice.order_id && ' The order it created stays in Orders.'}
      </p>
      <div className="flex gap-3">
        <button
          onClick={onConfirm}
          disabled={busy}
          className="flex-1 py-2 bg-red-600/20 border border-red-600/40 text-red-400 font-technical text-xs
                     uppercase tracking-widest hover:bg-red-600/30 transition-colors disabled:opacity-50"
        >
          {busy ? 'Deleting…' : 'Delete'}
        </button>
        <button
          onClick={onClose}
          className="flex-1 py-2 border border-white/10 text-stone-400 font-technical text-xs uppercase tracking-widest hover:text-white transition-colors"
        >
          Cancel
        </button>
      </div>
    </Modal>
  );
}

function CompleteModal({ invoice, onConfirm, onClose, busy, error }) {
  const lines = filledLines(invoice.items);
  const { revenue, cost, profit } = invoiceTotals(lines);
  return (
    <Modal onClose={busy ? () => {} : onClose}>
      <p className="font-technical text-xs text-white uppercase tracking-widest">Complete &amp; Send to Orders</p>
      <p className="text-stone-400 text-sm">
        Invoice <span className="font-mono text-[#ff5500]" style={monoStyle}>{invoice.number}</span> becomes an
        order for <span className="text-white">{invoice.client_name || '—'}</span> with all {lines.length} line
        {lines.length === 1 ? '' : 's'}, their photos and prices.
      </p>
      <div className="bg-[#0a0a0a] border border-white/10 p-3 grid grid-cols-3 gap-3">
        {[
          ['Billed', fmtCurrency(revenue, invoice.currency), 'text-white'],
          ['Cost',   fmtCurrency(cost, invoice.currency),    'text-stone-400'],
          ['Profit', fmtCurrency(profit, invoice.currency),  profitTone(profit)],
        ].map(([label, value, tone]) => (
          <div key={label}>
            <p className="font-technical text-[9px] text-stone-500 uppercase tracking-widest">{label}</p>
            <p className={`font-mono text-sm ${tone}`} style={monoStyle}>{value}</p>
          </div>
        ))}
      </div>
      <p className="font-technical text-[9px] text-stone-600 uppercase tracking-widest">
        Costs ride along on the order for your records — the client never sees them
      </p>
      {error && (
        <p className="bg-red-950/40 border border-red-800/60 text-red-300 text-sm p-3">{error}</p>
      )}
      <div className="flex gap-3 pt-1">
        <button
          onClick={onConfirm}
          disabled={busy}
          className="flex-1 py-2.5 bg-[#ff5500] text-white font-technical text-xs uppercase tracking-widest
                     hover:bg-[#e04d00] transition-colors disabled:opacity-60 disabled:cursor-wait"
        >
          {busy ? 'Creating order…' : 'Complete invoice'}
        </button>
        <button
          onClick={onClose}
          disabled={busy}
          className="flex-1 py-2.5 border border-white/10 text-stone-400 font-technical text-xs uppercase tracking-widest hover:text-white transition-colors"
        >
          Cancel
        </button>
      </div>
    </Modal>
  );
}

/* ─── Page ───────────────────────────────────────────────────────────────── */

const SAVE_DEBOUNCE_MS = 700;

export default function InvoiceMaker() {
  const { member } = useCurrentMember();
  const [compress] = useCompressUploads();

  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [activeId, setActiveId] = useState(null);
  const [products, setProducts] = useState([]);

  const [business, setBusiness] = useState(loadBusiness);
  const [showBusiness, setShowBusiness] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [showComplete, setShowComplete] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [completeError, setCompleteError] = useState(null);

  const [previewVariant, setPreviewVariant] = useState(null);   // null = editing
  const [exportVariant, setExportVariant] = useState(null);
  const [exportStage, setExportStage] = useState(null);         // 'laying out' | 'page 2/3'
  const [saveState, setSaveState] = useState('idle');           // idle | saving | saved | error
  const [busyAction, setBusyAction] = useState(null);

  const exportRef = useRef(null);
  const exportResolve = useRef(null);
  const saveTimer = useRef(null);
  const pendingSave = useRef(null);

  const activeInvoice = invoices.find((inv) => inv.id === activeId) ?? null;

  /* ── Load ──────────────────────────────────────────────────────────────── */
  useEffect(() => {
    let live = true;
    fetchInvoices()
      .then((rows) => { if (live) { setInvoices(rows); setActiveId((id) => id ?? rows[0]?.id ?? null); } })
      .catch((err) => { if (live) setLoadError(err.message); })
      .finally(() => { if (live) setLoading(false); });
    fetchProductCosts().then((rows) => { if (live) setProducts(rows); }).catch(() => {});
    return () => { live = false; };
  }, []);

  /* ── Autosave ──────────────────────────────────────────────────────────── */
  const flushSave = useCallback(async () => {
    if (saveTimer.current) { clearTimeout(saveTimer.current); saveTimer.current = null; }
    const pending = pendingSave.current;
    if (!pending) return;
    pendingSave.current = null;
    try {
      await saveInvoice(pending);
      setSaveState('saved');
    } catch (err) {
      setSaveState('error');
      setLoadError(`Couldn't save: ${err.message}`);
    }
  }, []);

  const updateActive = useCallback((updated) => {
    setInvoices((prev) => prev.map((inv) => (inv.id === updated.id ? updated : inv)));
    pendingSave.current = updated;
    setSaveState('saving');
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => { saveTimer.current = null; flushSave(); }, SAVE_DEBOUNCE_MS);
  }, [flushSave]);

  // An invoice half-typed when the tab closes is still worth keeping.
  useEffect(() => () => { flushSave(); }, [flushSave]);
  useEffect(() => {
    const warn = (e) => {
      if (!pendingSave.current) return;
      flushSave();
      e.preventDefault();
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [flushSave]);

  /* ── Invoice actions ───────────────────────────────────────────────────── */
  const createNew = async () => {
    setBusyAction('new');
    await flushSave();
    try {
      const inv = await createInvoice({ memberId: member?.id ?? null });
      setInvoices((prev) => [inv, ...prev]);
      setActiveId(inv.id);
      setPreviewVariant(null);
    } catch (err) {
      setLoadError(`Couldn't create an invoice: ${err.message}`);
    } finally {
      setBusyAction(null);
    }
  };

  const duplicate = async () => {
    if (!activeInvoice) return;
    setBusyAction('duplicate');
    await flushSave();
    try {
      const copy = await duplicateInvoice(activeInvoice, { memberId: member?.id ?? null });
      setInvoices((prev) => [copy, ...prev]);
      setActiveId(copy.id);
      setPreviewVariant(null);
    } catch (err) {
      setLoadError(`Couldn't duplicate: ${err.message}`);
    } finally {
      setBusyAction(null);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    // Drop any queued save for this invoice — the row is about to be gone.
    if (pendingSave.current?.id === deleteTarget.id) {
      pendingSave.current = null;
      if (saveTimer.current) { clearTimeout(saveTimer.current); saveTimer.current = null; }
      setSaveState('idle');
    }
    try {
      await deleteInvoiceRow(deleteTarget.id);
      const left = invoices.filter((inv) => inv.id !== deleteTarget.id);
      setInvoices(left);
      if (deleteTarget.id === activeId) setActiveId(left[0]?.id ?? null);
      setDeleteTarget(null);
    } catch (err) {
      setLoadError(`Couldn't delete: ${err.message}`);
    } finally {
      setDeleting(false);
    }
  };

  const confirmComplete = async () => {
    if (!activeInvoice) return;
    setCompleting(true);
    setCompleteError(null);
    await flushSave();
    try {
      const { invoice: updated } = await completeInvoice(activeInvoice, { business });
      setInvoices((prev) => prev.map((inv) => (inv.id === updated.id ? updated : inv)));
      setShowComplete(false);
    } catch (err) {
      setCompleteError(err.message);
    } finally {
      setCompleting(false);
    }
  };

  /* ── PDF export ────────────────────────────────────────────────────────────
     Each page element is rasterised on its own and placed on its own PDF page,
     so a line item or the totals block can never be sliced in half the way a
     single tall canvas cut into strips would. */
  const onDocumentReady = useCallback(() => {
    exportResolve.current?.();
  }, []);

  const exportPDF = async (variant) => {
    if (!activeInvoice || exportVariant) return;
    await flushSave();
    setExportStage('laying out');
    setExportVariant(variant);

    try {
      // Wait for the document to measure itself and lay out its pages.
      await new Promise((resolve) => {
        exportResolve.current = resolve;
        setTimeout(resolve, 8000);     // never hang on a photo that won't load
      });
      exportResolve.current = null;
      await document.fonts?.ready;
      await new Promise((resolve) => requestAnimationFrame(() => setTimeout(resolve, 80)));

      const pages = [...(exportRef.current?.querySelectorAll('[data-invoice-page]') ?? [])];
      if (!pages.length) throw new Error('nothing to export');

      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4', compress: true });
      const width = pdf.internal.pageSize.getWidth();
      const height = pdf.internal.pageSize.getHeight();

      for (let i = 0; i < pages.length; i += 1) {
        setExportStage(`page ${i + 1}/${pages.length}`);
        const canvas = await html2canvas(pages[i], {
          scale: 2,                  // ~192 dpi: photos stay sharp in print
          useCORS: true,
          backgroundColor: '#ffffff',
          logging: false,
          windowWidth: pages[i].offsetWidth,
        });
        if (i > 0) pdf.addPage();
        pdf.addImage(canvas.toDataURL('image/jpeg', 0.9), 'JPEG', 0, 0, width, height);
      }

      pdf.save(`${activeInvoice.number}${variant === 'internal' ? '-internal' : ''}.pdf`);
    } catch (err) {
      setLoadError(`Export failed: ${err.message}`);
    } finally {
      setExportVariant(null);
      setExportStage(null);
    }
  };

  /* ── Stats ─────────────────────────────────────────────────────────────── */
  const stats = useMemo(() => {
    const live = invoices.filter((inv) => inv.status !== 'cancelled');
    const sum = (rows, key) => rows.reduce((total, inv) => total + invoiceTotals(inv.items)[key], 0);
    return {
      count:   invoices.length,
      drafts:  invoices.filter((inv) => inv.status === 'draft').length,
      billed:  sum(live, 'revenue'),
      profit:  sum(live, 'profit'),
    };
  }, [invoices]);

  const saveLabel = {
    saving: 'Saving…',
    saved:  'Saved',
    error:  'Save failed',
    idle:   '',
  }[saveState];

  /* ── Render ────────────────────────────────────────────────────────────── */
  return (
    <div className="min-h-screen bg-[#080808] text-white">
      <AdminNavbar />

      <div className="px-6 py-6 border-b border-white/10 flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="uppercase tracking-tight text-white leading-none"
              style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '2.5rem' }}>
            Invoice Maker
          </h1>
          <p className="font-technical text-xs text-stone-500 uppercase tracking-widest mt-1">
            Bill a long job · live profit · multi-page PDF
          </p>
          <PageTagline />
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setShowBusiness(true)}
            className="flex items-center gap-2 px-3 py-2 bg-[#111111] border border-white/10 text-stone-400
                       font-technical text-xs uppercase tracking-widest hover:text-white hover:border-white/20 transition-colors"
          >
            <Icon name="business" /> Business Info
          </button>
          <button
            onClick={createNew}
            disabled={busyAction === 'new'}
            className="flex items-center gap-2 px-4 py-2 bg-[#ff5500] text-white font-technical text-xs
                       uppercase tracking-widest hover:bg-[#e04d00] transition-colors disabled:opacity-60"
          >
            <Icon name="add" /> {busyAction === 'new' ? 'Creating…' : 'New Invoice'}
          </button>
        </div>
      </div>

      {/* Stats — profit included, since this page is admin-only. */}
      <div className="px-6 py-4 border-b border-white/5 grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Invoices', value: stats.count },
          { label: 'Drafts',   value: stats.drafts },
          { label: 'Billed',   value: fmtCurrency(stats.billed, 'BDT') },
          { label: 'Profit',   value: fmtCurrency(stats.profit, 'BDT'), tone: profitTone(stats.profit) },
        ].map(({ label, value, tone }) => (
          <div key={label} className="bg-[#111111] border border-white/10 px-4 py-3">
            <p className="font-technical text-[10px] text-stone-500 uppercase tracking-widest">{label}</p>
            <p className={`font-mono text-lg font-bold mt-0.5 ${tone ?? 'text-[#ff5500]'}`} style={monoStyle}>
              {value}
            </p>
          </div>
        ))}
      </div>

      {loadError && (
        <div className="mx-6 mt-4 bg-red-950/40 border border-red-800/60 text-red-300 text-sm p-3 flex items-start gap-2">
          <Icon name="error" size={16} className="flex-shrink-0 mt-0.5" />
          <span className="flex-1">{loadError}</span>
          <button onClick={() => setLoadError(null)} className="text-red-400 hover:text-white">
            <Icon name="close" size={16} />
          </button>
        </div>
      )}

      <div className="flex flex-col lg:flex-row lg:h-[calc(100vh-232px)] lg:min-h-[520px]">
        {/* Sidebar */}
        <div className="flex-shrink-0 w-full lg:w-72 border-b lg:border-b-0 lg:border-r border-white/10 flex flex-col">
          <div className="px-4 py-3 border-b border-white/5">
            <span className="font-technical text-[10px] text-stone-500 uppercase tracking-widest">
              {loading ? 'Loading…' : `${invoices.length} Invoice${invoices.length === 1 ? '' : 's'}`}
            </span>
          </div>
          <div className="flex-1 overflow-y-auto max-h-64 lg:max-h-none">
            {loading ? null : invoices.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-40 text-center px-4">
                <Icon name="receipt_long" size={32} className="text-stone-800 mb-2" style={{ fontVariationSettings: "'FILL' 1" }} />
                <p className="font-technical text-[10px] text-stone-700 uppercase tracking-widest">No invoices yet</p>
              </div>
            ) : (
              invoices.map((inv) => (
                <InvoiceListItem
                  key={inv.id}
                  invoice={inv}
                  isActive={inv.id === activeId}
                  onClick={async () => { await flushSave(); setActiveId(inv.id); setPreviewVariant(null); }}
                  onDelete={setDeleteTarget}
                />
              ))
            )}
          </div>
        </div>

        {/* Editor / preview */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {activeInvoice && (
            <div className="flex items-center justify-between gap-3 px-5 py-3 border-b border-white/10 bg-[#0d0d0d] flex-wrap">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-mono text-xs text-[#ff5500]" style={monoStyle}>{activeInvoice.number}</span>
                <StatusBadge status={activeInvoice.status} />
                {activeInvoice.order_id ? (
                  <Link
                    to="/admin/orders"
                    className="flex items-center gap-1 px-2 py-0.5 border border-green-500/30 bg-green-500/10
                               text-green-400 font-technical text-[10px] uppercase tracking-widest hover:bg-green-500/20 transition-colors"
                  >
                    <Icon name="receipt" size={12} /> Order #{activeInvoice.order_id}
                  </Link>
                ) : (
                  <button
                    onClick={() => { setCompleteError(null); setShowComplete(true); }}
                    className="flex items-center gap-1.5 px-3 py-1 border border-[#ff5500]/40 text-[#ff5500]
                               font-technical text-[10px] uppercase tracking-widest hover:bg-[#ff5500]/10 transition-colors"
                  >
                    <Icon name="task_alt" size={13} /> Complete &amp; send to orders
                  </button>
                )}
                {saveLabel && (
                  <span className={`font-technical text-[9px] uppercase tracking-widest ${
                    saveState === 'error' ? 'text-red-400' : 'text-stone-600'
                  }`}>
                    {saveLabel}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <button
                  onClick={duplicate}
                  disabled={busyAction === 'duplicate'}
                  className="flex items-center gap-1.5 px-3 py-1.5 border border-white/10 text-stone-400
                             font-technical text-xs uppercase tracking-widest hover:text-white hover:border-white/20
                             transition-colors disabled:opacity-60"
                  title="Copy this invoice into a new draft"
                >
                  <Icon name="content_copy" size={13} /> Duplicate
                </button>
                <div className="flex">
                  {[
                    { key: null,       label: 'Edit',     icon: 'edit' },
                    { key: 'client',   label: 'Client',   icon: 'preview' },
                    { key: 'internal', label: 'Internal', icon: 'visibility_off' },
                  ].map(({ key, label, icon }) => (
                    <button
                      key={label}
                      onClick={() => setPreviewVariant(key)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 border font-technical text-xs uppercase tracking-widest transition-colors ${
                        previewVariant === key
                          ? 'bg-[#ff5500]/10 border-[#ff5500]/40 text-[#ff5500]'
                          : 'border-white/10 text-stone-400 hover:text-white hover:border-white/20'
                      } -ml-px first:ml-0`}
                    >
                      <Icon name={icon} size={13} /> {label}
                    </button>
                  ))}
                </div>
                <button
                  onClick={() => exportPDF(previewVariant === 'internal' ? 'internal' : 'client')}
                  disabled={Boolean(exportVariant)}
                  className="flex items-center gap-1.5 px-4 py-1.5 bg-[#ff5500] text-white font-technical text-xs
                             uppercase tracking-widest hover:bg-[#e04d00] transition-colors disabled:opacity-50 disabled:cursor-wait"
                >
                  {exportVariant ? (
                    <><Icon name="progress_activity" size={13} className="animate-spin" /> {exportStage}</>
                  ) : (
                    <><Icon name="download" size={13} /> {previewVariant === 'internal' ? 'Internal PDF' : 'Export PDF'}</>
                  )}
                </button>
              </div>
            </div>
          )}

          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center h-full">
                <Icon name="progress_activity" size={28} className="text-stone-700 animate-spin" />
              </div>
            ) : !activeInvoice ? (
              <div className="flex flex-col items-center justify-center h-full min-h-[320px] text-center px-8">
                <Icon name="receipt_long" size={56} className="text-stone-800 mb-4" style={{ fontVariationSettings: "'FILL' 1" }} />
                <h2 className="text-stone-600 uppercase mb-2" style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.8rem' }}>
                  No Invoice Selected
                </h2>
                <p className="font-technical text-[10px] text-stone-700 uppercase tracking-widest mb-5">
                  Pick one from the list, or start a new bill
                </p>
                <button
                  onClick={createNew}
                  className="flex items-center gap-2 px-5 py-2.5 bg-[#ff5500] text-white font-technical text-xs
                             uppercase tracking-widest hover:bg-[#e04d00] transition-colors"
                >
                  <Icon name="add" /> New Invoice
                </button>
              </div>
            ) : previewVariant ? (
              <div className="p-6 bg-stone-950 min-h-full overflow-x-auto">
                <div className="origin-top mx-auto w-[794px] scale-[0.72] sm:scale-[0.85] lg:scale-100"
                     style={{ transformOrigin: 'top center' }}>
                  <InvoiceDocument invoice={activeInvoice} business={business} variant={previewVariant} />
                </div>
              </div>
            ) : (
              <div className="p-5 max-w-4xl mx-auto">
                <InvoiceEditor
                  invoice={activeInvoice}
                  onChange={updateActive}
                  products={products}
                  compress={compress}
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Off-screen full-size render that the PDF is captured from. */}
      {activeInvoice && exportVariant && (
        <div ref={exportRef} style={{ position: 'fixed', left: -99999, top: 0, pointerEvents: 'none', zIndex: -1 }}>
          <InvoiceDocument
            invoice={activeInvoice}
            business={business}
            variant={exportVariant}
            onReady={onDocumentReady}
          />
        </div>
      )}

      <AnimatePresence>
        {showBusiness && (
          <BusinessModal
            business={business}
            onSave={(next) => {
              setBusiness(next);
              try { localStorage.setItem(BUSINESS_KEY, JSON.stringify(next)); } catch { /* not persisted */ }
            }}
            onClose={() => setShowBusiness(false)}
          />
        )}
        {deleteTarget && (
          <DeleteModal
            invoice={deleteTarget}
            busy={deleting}
            onConfirm={confirmDelete}
            onClose={() => setDeleteTarget(null)}
          />
        )}
        {showComplete && activeInvoice && (
          <CompleteModal
            invoice={activeInvoice}
            busy={completing}
            error={completeError}
            onConfirm={confirmComplete}
            onClose={() => setShowComplete(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
