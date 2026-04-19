import { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import AdminNavbar from '../../components/admin/AdminNavbar';

/* ─── Storage helpers ────────────────────────────────────────────── */

function load(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch { return fallback; }
}
function persist(key, val) { localStorage.setItem(key, JSON.stringify(val)); }

/* ─── Defaults ───────────────────────────────────────────────────── */

const DEFAULT_BUSINESS = {
  name:    'Layercade',
  tagline: '3D Printing Studio',
  address: 'Mirpur DOHS, Dhaka, Bangladesh',
  phone:   '',
  email:   '',
  website: 'layercade.com',
};

const EMPTY_INVOICE = () => ({
  id:            `INV-${Date.now()}`,
  status:        'draft',           // draft | sent | paid | cancelled
  currency:      'BDT',
  date:          new Date().toISOString().split('T')[0],
  due_date:      '',
  client_name:   '',
  client_email:  '',
  client_phone:  '',
  client_address:'',
  notes:         '',
  items:         [{ id: Date.now(), description: '', qty: 1, unit_price: 0 }],
});

const STATUS_META = {
  draft:     { label: 'Draft',     bg: 'bg-stone-800',        text: 'text-stone-400',  border: 'border-stone-700' },
  sent:      { label: 'Sent',      bg: 'bg-blue-500/20',      text: 'text-blue-400',   border: 'border-blue-500/30' },
  paid:      { label: 'Paid',      bg: 'bg-green-500/20',     text: 'text-green-400',  border: 'border-green-500/30' },
  cancelled: { label: 'Cancelled', bg: 'bg-red-500/20',       text: 'text-red-400',    border: 'border-red-500/30' },
};

/* ─── Formatters ─────────────────────────────────────────────────── */

function fmtCurrency(n, currency) {
  const v = (Number(n) || 0).toFixed(2);
  return currency === 'BDT'
    ? `৳${parseFloat(v).toLocaleString('en-IN')}`
    : `$${parseFloat(v).toLocaleString('en-US')}`;
}

function fmtDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso + 'T00:00:00');
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

/* ─── Small atoms ────────────────────────────────────────────────── */

function Label({ children }) {
  return (
    <span className="font-technical text-[10px] text-stone-500 uppercase tracking-widest">
      {children}
    </span>
  );
}

function Field({ label, children }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
    </div>
  );
}

function Input({ value, onChange, placeholder, type = 'text' }) {
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full bg-[#0a0a0a] border border-white/10 text-white text-sm px-3 py-2
                 focus:outline-none focus:border-[#ff5500]/60 transition-colors placeholder-stone-700"
    />
  );
}

function Textarea({ value, onChange, placeholder, rows = 3 }) {
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      rows={rows}
      className="w-full bg-[#0a0a0a] border border-white/10 text-white text-sm px-3 py-2
                 focus:outline-none focus:border-[#ff5500]/60 transition-colors placeholder-stone-700 resize-none"
    />
  );
}

function Card({ children, className = '' }) {
  return (
    <div className={`bg-[#111111] border border-white/10 p-5 ${className}`}>
      {children}
    </div>
  );
}

function SectionTitle({ children }) {
  return (
    <p className="font-technical text-[10px] text-stone-500 uppercase tracking-widest mb-3">
      {children}
    </p>
  );
}

function StatusBadge({ status, className = '' }) {
  const m = STATUS_META[status] ?? STATUS_META.draft;
  return (
    <span className={`inline-block px-2.5 py-0.5 text-[10px] font-technical uppercase tracking-widest border ${m.bg} ${m.text} ${m.border} ${className}`}>
      {m.label}
    </span>
  );
}

/* ─── Invoice list item ──────────────────────────────────────────── */

function InvoiceListItem({ inv, isActive, onClick, onDelete }) {
  const subtotal = inv.items.reduce((s, it) => s + (it.qty || 0) * (it.unit_price || 0), 0);
  return (
    <div
      onClick={onClick}
      className={`group flex items-center gap-3 px-4 py-3 border-b border-white/5 cursor-pointer transition-colors ${
        isActive ? 'bg-[#ff5500]/5 border-l-2 border-l-[#ff5500]' : 'hover:bg-white/[0.02] border-l-2 border-l-transparent'
      }`}
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span className="font-mono text-[11px] text-[#ff5500]" style={{ fontFamily: "'Space Mono', monospace" }}>
            {inv.id}
          </span>
          <StatusBadge status={inv.status} />
        </div>
        <p className="text-white text-sm font-body truncate">{inv.client_name || 'Unnamed client'}</p>
        <p className="font-technical text-[10px] text-stone-600 uppercase tracking-widest">
          {fmtDate(inv.date)} · {fmtCurrency(subtotal, inv.currency)}
        </p>
      </div>
      <button
        onClick={(e) => { e.stopPropagation(); onDelete(inv.id); }}
        className="opacity-0 group-hover:opacity-100 text-stone-600 hover:text-red-400 transition-all"
      >
        <span className="material-symbols-outlined" style={{ fontSize: 15 }}>delete</span>
      </button>
    </div>
  );
}

/* ─── Line items editor ──────────────────────────────────────────── */

function LineItemsEditor({ items, onChange, currency }) {
  const updateItem = (idx, key, val) => {
    onChange(items.map((it, i) => i === idx ? { ...it, [key]: val } : it));
  };
  const addItem = () => onChange([...items, { id: Date.now(), description: '', qty: 1, unit_price: 0 }]);
  const removeItem = (idx) => onChange(items.filter((_, i) => i !== idx));

  return (
    <div className="space-y-2">
      {/* Header */}
      <div className="grid grid-cols-12 gap-2 px-1">
        <div className="col-span-6"><Label>Description</Label></div>
        <div className="col-span-2"><Label>Qty</Label></div>
        <div className="col-span-3"><Label>Unit Price</Label></div>
        <div className="col-span-1" />
      </div>

      {/* Rows */}
      {items.map((it, idx) => {
        const lineTotal = (it.qty || 0) * (it.unit_price || 0);
        return (
          <div key={it.id} className="grid grid-cols-12 gap-2 items-center">
            <div className="col-span-6">
              <input
                type="text"
                value={it.description}
                onChange={(e) => updateItem(idx, 'description', e.target.value)}
                placeholder="Item description…"
                className="w-full bg-[#0a0a0a] border border-white/10 text-white text-sm px-3 py-2
                           focus:outline-none focus:border-[#ff5500]/60 transition-colors placeholder-stone-700"
              />
            </div>
            <div className="col-span-2">
              <input
                type="number"
                value={it.qty}
                onChange={(e) => updateItem(idx, 'qty', parseFloat(e.target.value) || 0)}
                min="0"
                step="1"
                className="w-full bg-[#0a0a0a] border border-white/10 text-white text-sm px-3 py-2
                           focus:outline-none focus:border-[#ff5500]/60 transition-colors text-center"
                style={{ fontFamily: "'Space Mono', monospace" }}
              />
            </div>
            <div className="col-span-3">
              <input
                type="number"
                value={it.unit_price}
                onChange={(e) => updateItem(idx, 'unit_price', parseFloat(e.target.value) || 0)}
                min="0"
                step="1"
                className="w-full bg-[#0a0a0a] border border-white/10 text-white text-sm px-3 py-2
                           focus:outline-none focus:border-[#ff5500]/60 transition-colors"
                style={{ fontFamily: "'Space Mono', monospace" }}
              />
            </div>
            <div className="col-span-1 flex items-center justify-end">
              {items.length > 1 && (
                <button
                  onClick={() => removeItem(idx)}
                  className="text-stone-700 hover:text-red-400 transition-colors"
                >
                  <span className="material-symbols-outlined" style={{ fontSize: 15 }}>remove_circle</span>
                </button>
              )}
            </div>
            {/* Line total hint */}
            {lineTotal > 0 && (
              <div className="col-span-12 -mt-1 px-1">
                <span className="font-technical text-[9px] text-stone-700 uppercase tracking-widest">
                  = {fmtCurrency(lineTotal, currency)}
                </span>
              </div>
            )}
          </div>
        );
      })}

      <button
        onClick={addItem}
        className="flex items-center gap-1.5 font-technical text-[10px] uppercase tracking-widest
                   text-[#ff5500] hover:text-white transition-colors mt-1"
      >
        <span className="material-symbols-outlined" style={{ fontSize: 13 }}>add</span>
        Add Line Item
      </button>
    </div>
  );
}

/* ─── PDF Invoice Template ───────────────────────────────────────── */
/* This renders a clean, printable invoice. Dark bg is stripped for PDF. */

function InvoiceTemplate({ inv, business }) {
  const subtotal = inv.items.reduce((s, it) => s + (it.qty || 0) * (it.unit_price || 0), 0);
  const fmt = (n) => fmtCurrency(n, inv.currency);

  return (
    <div
      style={{
        width: '794px',          // A4 width at 96 dpi
        minHeight: '1123px',     // A4 height at 96 dpi
        background: '#ffffff',
        color: '#111111',
        fontFamily: 'Georgia, serif',
        padding: '60px 64px',
        boxSizing: 'border-box',
        position: 'relative',
      }}
    >
      {/* Top accent bar */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '6px', background: '#ff5500' }} />

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '48px' }}>
        {/* Business */}
        <div>
          <div style={{
            fontFamily: 'Arial Black, Arial, sans-serif',
            fontSize: '28px',
            fontWeight: '900',
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
            color: '#0a0a0a',
            lineHeight: 1,
          }}>
            {business.name}
          </div>
          {business.tagline && (
            <div style={{ fontSize: '10px', letterSpacing: '0.2em', textTransform: 'uppercase', color: '#888', marginTop: '4px' }}>
              {business.tagline}
            </div>
          )}
          <div style={{ marginTop: '12px', fontSize: '11px', color: '#555', lineHeight: 1.7 }}>
            {business.address && <div>{business.address}</div>}
            {business.phone   && <div>{business.phone}</div>}
            {business.email   && <div>{business.email}</div>}
            {business.website && <div>{business.website}</div>}
          </div>
        </div>

        {/* Invoice meta */}
        <div style={{ textAlign: 'right' }}>
          <div style={{
            fontFamily: 'Arial Black, Arial, sans-serif',
            fontSize: '36px',
            fontWeight: '900',
            letterSpacing: '0.04em',
            textTransform: 'uppercase',
            color: '#ff5500',
            lineHeight: 1,
          }}>
            Invoice
          </div>
          <div style={{ fontSize: '12px', color: '#888', marginTop: '8px', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
            {inv.id}
          </div>
          <div style={{ marginTop: '14px', fontSize: '11px', color: '#555', lineHeight: 1.8 }}>
            <div><span style={{ color: '#999' }}>Date: </span>{fmtDate(inv.date)}</div>
            {inv.due_date && <div><span style={{ color: '#999' }}>Due: </span>{fmtDate(inv.due_date)}</div>}
            <div style={{ marginTop: '4px' }}>
              <span style={{
                display: 'inline-block',
                padding: '2px 8px',
                background: inv.status === 'paid' ? '#dcfce7' : inv.status === 'sent' ? '#dbeafe' : '#f3f4f6',
                color: inv.status === 'paid' ? '#166534' : inv.status === 'sent' ? '#1d4ed8' : '#374151',
                fontSize: '10px',
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                fontFamily: 'Arial, sans-serif',
                fontWeight: 'bold',
              }}>
                {STATUS_META[inv.status]?.label ?? inv.status}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Divider */}
      <div style={{ height: '1px', background: '#e5e7eb', marginBottom: '32px' }} />

      {/* Bill to */}
      <div style={{ marginBottom: '36px' }}>
        <div style={{ fontSize: '9px', letterSpacing: '0.2em', textTransform: 'uppercase', color: '#ff5500', marginBottom: '8px', fontFamily: 'Arial, sans-serif', fontWeight: 'bold' }}>
          Bill To
        </div>
        <div style={{ fontSize: '15px', fontWeight: 'bold', color: '#111', marginBottom: '4px' }}>
          {inv.client_name || '—'}
        </div>
        <div style={{ fontSize: '11px', color: '#555', lineHeight: 1.7 }}>
          {inv.client_email   && <div>{inv.client_email}</div>}
          {inv.client_phone   && <div>{inv.client_phone}</div>}
          {inv.client_address && <div style={{ whiteSpace: 'pre-line' }}>{inv.client_address}</div>}
        </div>
      </div>

      {/* Line items table */}
      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '24px', fontSize: '12px' }}>
        <thead>
          <tr style={{ background: '#0a0a0a' }}>
            <th style={{ padding: '10px 14px', textAlign: 'left', color: '#fff', fontFamily: 'Arial, sans-serif', fontWeight: 'bold', fontSize: '9px', letterSpacing: '0.14em', textTransform: 'uppercase' }}>
              Description
            </th>
            <th style={{ padding: '10px 14px', textAlign: 'center', color: '#fff', fontFamily: 'Arial, sans-serif', fontWeight: 'bold', fontSize: '9px', letterSpacing: '0.14em', textTransform: 'uppercase', width: '80px' }}>
              Qty
            </th>
            <th style={{ padding: '10px 14px', textAlign: 'right', color: '#fff', fontFamily: 'Arial, sans-serif', fontWeight: 'bold', fontSize: '9px', letterSpacing: '0.14em', textTransform: 'uppercase', width: '120px' }}>
              Unit Price
            </th>
            <th style={{ padding: '10px 14px', textAlign: 'right', color: '#fff', fontFamily: 'Arial, sans-serif', fontWeight: 'bold', fontSize: '9px', letterSpacing: '0.14em', textTransform: 'uppercase', width: '120px' }}>
              Total
            </th>
          </tr>
        </thead>
        <tbody>
          {inv.items.filter((it) => it.description || it.unit_price).map((it, idx) => {
            const lineTotal = (it.qty || 0) * (it.unit_price || 0);
            return (
              <tr
                key={it.id}
                style={{ background: idx % 2 === 0 ? '#ffffff' : '#f9fafb', borderBottom: '1px solid #f0f0f0' }}
              >
                <td style={{ padding: '11px 14px', color: '#222' }}>{it.description || '—'}</td>
                <td style={{ padding: '11px 14px', textAlign: 'center', color: '#555', fontFamily: 'monospace' }}>{it.qty}</td>
                <td style={{ padding: '11px 14px', textAlign: 'right', color: '#555', fontFamily: 'monospace' }}>{fmt(it.unit_price)}</td>
                <td style={{ padding: '11px 14px', textAlign: 'right', color: '#222', fontFamily: 'monospace', fontWeight: 'bold' }}>{fmt(lineTotal)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {/* Totals */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '40px' }}>
        <div style={{ width: '260px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderTop: '1px solid #e5e7eb' }}>
            <span style={{ fontSize: '11px', color: '#888', fontFamily: 'Arial, sans-serif' }}>Subtotal</span>
            <span style={{ fontSize: '12px', color: '#222', fontFamily: 'monospace', fontWeight: 'bold' }}>{fmt(subtotal)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 14px', background: '#0a0a0a', marginTop: '4px' }}>
            <span style={{ fontSize: '11px', color: '#ccc', fontFamily: 'Arial, sans-serif', fontWeight: 'bold', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Total Due</span>
            <span style={{ fontSize: '16px', color: '#ff5500', fontFamily: 'monospace', fontWeight: 'bold' }}>{fmt(subtotal)}</span>
          </div>
        </div>
      </div>

      {/* Notes */}
      {inv.notes && (
        <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: '24px', marginBottom: '24px' }}>
          <div style={{ fontSize: '9px', letterSpacing: '0.2em', textTransform: 'uppercase', color: '#999', marginBottom: '8px', fontFamily: 'Arial, sans-serif', fontWeight: 'bold' }}>
            Notes
          </div>
          <div style={{ fontSize: '11px', color: '#555', lineHeight: 1.7, whiteSpace: 'pre-line' }}>
            {inv.notes}
          </div>
        </div>
      )}

      {/* Footer */}
      <div style={{ position: 'absolute', bottom: '36px', left: '64px', right: '64px', borderTop: '1px solid #e5e7eb', paddingTop: '14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: '10px', color: '#bbb', fontFamily: 'Arial, sans-serif', letterSpacing: '0.06em' }}>
          {business.name} · {business.website || business.email || business.phone || ''}
        </span>
        <span style={{ fontSize: '10px', color: '#ff5500', fontFamily: 'Arial Black, Arial, sans-serif', fontWeight: '900', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
          Thank you
        </span>
      </div>
    </div>
  );
}

/* ─── Editor panel ───────────────────────────────────────────────── */

function InvoiceEditor({ invoice, onChange, business }) {
  const upd = (key, val) => onChange({ ...invoice, [key]: val });

  return (
    <div className="space-y-5">
      {/* Header row */}
      <Card>
        <SectionTitle>Invoice Details</SectionTitle>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <Field label="Invoice ID">
            <Input value={invoice.id} onChange={(v) => upd('id', v)} placeholder="INV-001" />
          </Field>
          <Field label="Status">
            <select
              value={invoice.status}
              onChange={(e) => upd('status', e.target.value)}
              className="w-full bg-[#0a0a0a] border border-white/10 text-white text-sm px-3 py-2
                         focus:outline-none focus:border-[#ff5500]/60 transition-colors"
            >
              {Object.entries(STATUS_META).map(([k, v]) => (
                <option key={k} value={k}>{v.label}</option>
              ))}
            </select>
          </Field>
          <Field label="Currency">
            <select
              value={invoice.currency}
              onChange={(e) => upd('currency', e.target.value)}
              className="w-full bg-[#0a0a0a] border border-white/10 text-white text-sm px-3 py-2
                         focus:outline-none focus:border-[#ff5500]/60 transition-colors"
            >
              <option value="BDT">BDT (৳)</option>
              <option value="USD">USD ($)</option>
            </select>
          </Field>
          <div className="grid grid-cols-2 gap-2 col-span-2 sm:col-span-1">
            <Field label="Invoice Date">
              <Input type="date" value={invoice.date} onChange={(v) => upd('date', v)} />
            </Field>
            <Field label="Due Date">
              <Input type="date" value={invoice.due_date} onChange={(v) => upd('due_date', v)} />
            </Field>
          </div>
        </div>
      </Card>

      {/* Client */}
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
      </Card>

      {/* Line items */}
      <Card>
        <SectionTitle>Line Items</SectionTitle>
        <LineItemsEditor
          items={invoice.items}
          onChange={(items) => upd('items', items)}
          currency={invoice.currency}
        />

        {/* Subtotal summary */}
        <div className="mt-5 pt-4 border-t border-white/10 flex justify-end">
          <div className="space-y-1.5 text-right">
            <div className="flex items-center gap-6 justify-end">
              <span className="font-technical text-[10px] text-stone-500 uppercase tracking-widest">Subtotal</span>
              <span className="font-mono text-sm text-white" style={{ fontFamily: "'Space Mono', monospace" }}>
                {fmtCurrency(invoice.items.reduce((s, it) => s + (it.qty || 0) * (it.unit_price || 0), 0), invoice.currency)}
              </span>
            </div>
          </div>
        </div>
      </Card>

      {/* Notes */}
      <Card>
        <SectionTitle>Notes</SectionTitle>
        <Textarea
          value={invoice.notes}
          onChange={(v) => upd('notes', v)}
          placeholder="Payment terms, bank details, thank-you message…"
          rows={3}
        />
      </Card>
    </div>
  );
}

/* ─── Business settings modal ────────────────────────────────────── */

function BusinessModal({ business, onSave, onClose }) {
  const [form, setForm] = useState(business);
  const upd = (key, val) => setForm((f) => ({ ...f, [key]: val }));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 8 }}
        className="bg-[#111111] border border-white/10 w-full max-w-md p-6 space-y-4"
      >
        <div className="flex items-center justify-between">
          <p className="font-technical text-xs text-white uppercase tracking-widest">Business Details</p>
          <button onClick={onClose} className="text-stone-600 hover:text-white transition-colors">
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>close</span>
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
              <Input value={form[key]} onChange={(v) => upd(key, v)} placeholder={label} />
            </Field>
          ))}
        </div>
        <div className="flex gap-3 pt-2">
          <button
            onClick={() => { onSave(form); onClose(); }}
            className="flex-1 py-2.5 bg-[#ff5500] text-white font-technical text-xs uppercase tracking-widest
                       hover:bg-[#e04d00] transition-colors"
          >
            Save
          </button>
          <button
            onClick={onClose}
            className="flex-1 py-2.5 border border-white/10 text-stone-400 font-technical text-xs
                       uppercase tracking-widest hover:text-white transition-colors"
          >
            Cancel
          </button>
        </div>
      </motion.div>
    </div>
  );
}

/* ─── Delete confirm ─────────────────────────────────────────────── */

function DeleteModal({ invId, onConfirm, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.97 }}
        className="bg-[#111111] border border-white/10 w-full max-w-sm p-6 space-y-4"
      >
        <p className="font-technical text-xs text-white uppercase tracking-widest">Delete Invoice?</p>
        <p className="text-stone-400 text-sm">
          Invoice <span className="font-mono text-[#ff5500]" style={{ fontFamily: "'Space Mono', monospace" }}>{invId}</span> will be permanently deleted.
        </p>
        <div className="flex gap-3">
          <button
            onClick={onConfirm}
            className="flex-1 py-2 bg-red-600/20 border border-red-600/40 text-red-400
                       font-technical text-xs uppercase tracking-widest hover:bg-red-600/30 transition-colors"
          >
            Delete
          </button>
          <button
            onClick={onClose}
            className="flex-1 py-2 border border-white/10 text-stone-400 font-technical text-xs
                       uppercase tracking-widest hover:text-white transition-colors"
          >
            Cancel
          </button>
        </div>
      </motion.div>
    </div>
  );
}

/* ─── Main page ──────────────────────────────────────────────────── */

export default function InvoiceMaker() {
  const [invoices,       setInvoices]       = useState(() => load('invoices', []));
  const [activeId,       setActiveId]       = useState(null);
  const [business,       setBusiness]       = useState(() => load('inv_business', DEFAULT_BUSINESS));
  const [showBusiness,   setShowBusiness]   = useState(false);
  const [showPreview,    setShowPreview]    = useState(false);
  const [deleteTarget,   setDeleteTarget]   = useState(null);
  const [exporting,      setExporting]      = useState(false);
  const [sidebarOpen,    setSidebarOpen]    = useState(true);

  const previewRef = useRef(null);

  const activeInvoice = invoices.find((inv) => inv.id === activeId) ?? null;

  /* ── Persist on change ─────────────────────────────────────────── */
  useEffect(() => { persist('invoices', invoices); }, [invoices]);
  useEffect(() => { persist('inv_business', business); }, [business]);

  /* ── Invoice CRUD ──────────────────────────────────────────────── */
  const createNew = () => {
    const inv = EMPTY_INVOICE();
    setInvoices((prev) => [inv, ...prev]);
    setActiveId(inv.id);
    setShowPreview(false);
  };

  const updateActive = useCallback((updated) => {
    setInvoices((prev) => prev.map((inv) => inv.id === updated.id ? updated : inv));
  }, []);

  const deleteInvoice = (id) => {
    setInvoices((prev) => prev.filter((inv) => inv.id !== id));
    if (activeId === id) setActiveId(invoices.find((inv) => inv.id !== id)?.id ?? null);
    setDeleteTarget(null);
  };

  /* ── PDF export ────────────────────────────────────────────────── */
  const exportPDF = async () => {
    if (!previewRef.current || !activeInvoice) return;
    setExporting(true);
    try {
      const canvas = await html2canvas(previewRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false,
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

      const pdfW = pdf.internal.pageSize.getWidth();
      const pdfH = pdf.internal.pageSize.getHeight();
      const imgAspect = canvas.height / canvas.width;
      const imgH = pdfW * imgAspect;

      if (imgH <= pdfH) {
        pdf.addImage(imgData, 'PNG', 0, 0, pdfW, imgH);
      } else {
        // Multi-page: slice canvas into page-height chunks
        let yOffset = 0;
        const pageHeightPx = Math.floor((pdfH / pdfW) * canvas.width);
        let page = 0;
        while (yOffset < canvas.height) {
          if (page > 0) pdf.addPage();
          const sliceH = Math.min(pageHeightPx, canvas.height - yOffset);
          const sliceCanvas = document.createElement('canvas');
          sliceCanvas.width = canvas.width;
          sliceCanvas.height = sliceH;
          const ctx = sliceCanvas.getContext('2d');
          ctx.drawImage(canvas, 0, yOffset, canvas.width, sliceH, 0, 0, canvas.width, sliceH);
          pdf.addImage(sliceCanvas.toDataURL('image/png'), 'PNG', 0, 0, pdfW, (sliceH / canvas.width) * pdfW);
          yOffset += sliceH;
          page++;
        }
      }

      pdf.save(`${activeInvoice.id}.pdf`);
    } finally {
      setExporting(false);
    }
  };

  /* ── Stats ─────────────────────────────────────────────────────── */
  const stats = {
    total: invoices.length,
    paid:  invoices.filter((i) => i.status === 'paid').length,
    draft: invoices.filter((i) => i.status === 'draft').length,
    revenue: invoices
      .filter((i) => i.status === 'paid')
      .reduce((s, i) => s + i.items.reduce((a, it) => a + (it.qty || 0) * (it.unit_price || 0), 0), 0),
  };

  return (
    <div className="min-h-screen bg-[#080808] text-white">
      <AdminNavbar />

      {/* ── Page header ───────────────────────────────────────────── */}
      <div className="px-6 py-6 border-b border-white/10 flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1
            className="uppercase tracking-tight text-white leading-none"
            style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '2.5rem' }}
          >
            Invoice Maker
          </h1>
          <p className="font-technical text-xs text-stone-500 uppercase tracking-widest mt-1">
            Create &amp; export professional invoices
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setShowBusiness(true)}
            className="flex items-center gap-2 px-3 py-2 bg-[#111111] border border-white/10 text-stone-400
                       font-technical text-xs uppercase tracking-widest hover:text-white hover:border-white/20 transition-colors"
          >
            <span className="material-symbols-outlined" style={{ fontSize: 14 }}>business</span>
            Business Info
          </button>
          <button
            onClick={createNew}
            className="flex items-center gap-2 px-4 py-2 bg-[#ff5500] text-white
                       font-technical text-xs uppercase tracking-widest hover:bg-[#e04d00] transition-colors"
          >
            <span className="material-symbols-outlined" style={{ fontSize: 14 }}>add</span>
            New Invoice
          </button>
        </div>
      </div>

      {/* ── Stats bar ─────────────────────────────────────────────── */}
      <div className="px-6 py-4 border-b border-white/5 grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Total Invoices', value: stats.total },
          { label: 'Paid',           value: stats.paid },
          { label: 'Drafts',         value: stats.draft },
          { label: 'Paid Revenue',   value: fmtCurrency(stats.revenue, 'BDT') },
        ].map(({ label, value }) => (
          <div key={label} className="bg-[#111111] border border-white/10 px-4 py-3">
            <p className="font-technical text-[10px] text-stone-500 uppercase tracking-widest">{label}</p>
            <p className="font-mono text-lg font-bold text-[#ff5500] mt-0.5" style={{ fontFamily: "'Space Mono', monospace" }}>
              {value}
            </p>
          </div>
        ))}
      </div>

      {/* ── Main content ──────────────────────────────────────────── */}
      <div className="flex h-[calc(100vh-220px)] min-h-[500px]">

        {/* ── Sidebar: invoice list ──────────────────────────────── */}
        <div className={`flex-shrink-0 border-r border-white/10 flex flex-col transition-all duration-300 ${sidebarOpen ? 'w-72' : 'w-0 overflow-hidden'}`}>
          <div className="px-4 py-3 border-b border-white/5 flex items-center justify-between">
            <span className="font-technical text-[10px] text-stone-500 uppercase tracking-widest">
              {invoices.length} Invoice{invoices.length !== 1 ? 's' : ''}
            </span>
          </div>
          <div className="flex-1 overflow-y-auto">
            {invoices.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-40 text-center px-4">
                <span className="material-symbols-outlined text-stone-800 mb-2" style={{ fontSize: 32, fontVariationSettings: "'FILL' 1" }}>
                  receipt_long
                </span>
                <p className="font-technical text-[10px] text-stone-700 uppercase tracking-widest">
                  No invoices yet
                </p>
              </div>
            ) : (
              invoices.map((inv) => (
                <InvoiceListItem
                  key={inv.id}
                  inv={inv}
                  isActive={inv.id === activeId}
                  onClick={() => { setActiveId(inv.id); setShowPreview(false); }}
                  onDelete={(id) => setDeleteTarget(id)}
                />
              ))
            )}
          </div>
        </div>

        {/* ── Editor / Preview area ──────────────────────────────── */}
        <div className="flex-1 flex flex-col overflow-hidden">

          {/* Toolbar */}
          {activeInvoice && (
            <div className="flex items-center justify-between gap-3 px-5 py-3 border-b border-white/10 bg-[#0d0d0d] flex-wrap">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setSidebarOpen((v) => !v)}
                  className="text-stone-600 hover:text-white transition-colors"
                  title="Toggle sidebar"
                >
                  <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
                    {sidebarOpen ? 'left_panel_close' : 'left_panel_open'}
                  </span>
                </button>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs text-[#ff5500]" style={{ fontFamily: "'Space Mono', monospace" }}>
                    {activeInvoice.id}
                  </span>
                  <StatusBadge status={activeInvoice.status} />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowPreview((v) => !v)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 border font-technical text-xs uppercase tracking-widest transition-colors ${
                    showPreview
                      ? 'bg-[#ff5500]/10 border-[#ff5500]/40 text-[#ff5500]'
                      : 'border-white/10 text-stone-400 hover:text-white hover:border-white/20'
                  }`}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: 13 }}>
                    {showPreview ? 'edit' : 'preview'}
                  </span>
                  {showPreview ? 'Edit' : 'Preview'}
                </button>
                <button
                  onClick={exportPDF}
                  disabled={exporting}
                  className="flex items-center gap-1.5 px-4 py-1.5 bg-[#ff5500] text-white
                             font-technical text-xs uppercase tracking-widest hover:bg-[#e04d00]
                             transition-colors disabled:opacity-50 disabled:cursor-wait"
                >
                  {exporting ? (
                    <>
                      <span className="material-symbols-outlined animate-spin" style={{ fontSize: 13 }}>progress_activity</span>
                      Exporting…
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined" style={{ fontSize: 13 }}>download</span>
                      Export PDF
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Content */}
          <div className="flex-1 overflow-y-auto">
            {!activeInvoice ? (
              <div className="flex flex-col items-center justify-center h-full text-center px-8">
                <span
                  className="material-symbols-outlined text-stone-800 mb-4"
                  style={{ fontSize: 56, fontVariationSettings: "'FILL' 1" }}
                >
                  receipt_long
                </span>
                <h2
                  className="text-stone-600 uppercase mb-2"
                  style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.8rem' }}
                >
                  No Invoice Selected
                </h2>
                <p className="font-technical text-[10px] text-stone-700 uppercase tracking-widest mb-5">
                  Select an invoice from the sidebar or create a new one
                </p>
                <button
                  onClick={createNew}
                  className="flex items-center gap-2 px-5 py-2.5 bg-[#ff5500] text-white
                             font-technical text-xs uppercase tracking-widest hover:bg-[#e04d00] transition-colors"
                >
                  <span className="material-symbols-outlined" style={{ fontSize: 14 }}>add</span>
                  New Invoice
                </button>
              </div>
            ) : showPreview ? (
              /* ── Preview mode ─────────────────────────────────── */
              <div className="p-6 flex justify-center bg-stone-950 min-h-full">
                <div className="shadow-2xl" style={{ transform: 'scale(0.85)', transformOrigin: 'top center', marginBottom: '-15%' }}>
                  <div ref={previewRef}>
                    <InvoiceTemplate inv={activeInvoice} business={business} />
                  </div>
                </div>
              </div>
            ) : (
              /* ── Edit mode ────────────────────────────────────── */
              <div className="p-5 max-w-3xl mx-auto">
                <InvoiceEditor
                  invoice={activeInvoice}
                  onChange={updateActive}
                  business={business}
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Hidden full-size render for PDF capture ─────────────── */}
      {activeInvoice && !showPreview && (
        <div style={{ position: 'fixed', left: '-9999px', top: 0, pointerEvents: 'none', zIndex: -1 }}>
          <div ref={previewRef}>
            <InvoiceTemplate inv={activeInvoice} business={business} />
          </div>
        </div>
      )}

      {/* ── Modals ──────────────────────────────────────────────── */}
      <AnimatePresence>
        {showBusiness && (
          <BusinessModal
            business={business}
            onSave={(b) => { setBusiness(b); persist('inv_business', b); }}
            onClose={() => setShowBusiness(false)}
          />
        )}
        {deleteTarget && (
          <DeleteModal
            invId={deleteTarget}
            onConfirm={() => deleteInvoice(deleteTarget)}
            onClose={() => setDeleteTarget(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
