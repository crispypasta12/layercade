import { useState, useEffect, useMemo } from 'react';
import AdminNavbar from '../../components/admin/AdminNavbar';
import { supabase } from '../../lib/supabase';
import { useCurrentMember } from '../../contexts/CurrentMemberContext';

// ─── Constants ─────────────────────────────────────────────────────────────────
const CATEGORIES = [
  { id: 'food',      label: 'Food & Drinks',   icon: 'restaurant',       color: '#f59e0b' },
  { id: 'transport', label: 'Transport',        icon: 'directions_car',   color: '#3b82f6' },
  { id: 'supplies',  label: 'Office Supplies',  icon: 'inventory_2',      color: '#10b981' },
  { id: 'software',  label: 'Software / Tools', icon: 'code',             color: '#8b5cf6' },
  { id: 'marketing', label: 'Marketing',        icon: 'campaign',         color: '#ec4899' },
  { id: 'utilities', label: 'Utilities',        icon: 'bolt',             color: '#f97316' },
  { id: 'other',     label: 'Other',            icon: 'more_horiz',       color: '#6b7280' },
];

const SPLIT_TYPES = [
  { id: 'equal',      label: 'Equally', icon: 'call_split' },
  { id: 'exact',      label: 'Exact',   icon: 'payments' },
  { id: 'percentage', label: '%',       icon: 'percent' },
  { id: 'shares',     label: 'Shares',  icon: 'pie_chart' },
];

// ─── Helpers ───────────────────────────────────────────────────────────────────
const fmt = (n) =>
  `৳${Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const initials = (name) =>
  name.split(' ').filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase();

const todayStr = () => new Date().toISOString().split('T')[0];

const fmtDate = (d) =>
  new Date(d + 'T00:00:00').toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  });

const fmtMonth = (key) => {
  const [year, month] = key.split('-');
  return new Date(year, month - 1).toLocaleDateString('en-US', {
    month: 'long', year: 'numeric',
  });
};

const catById = (id) => CATEGORIES.find((c) => c.id === id) ?? CATEGORIES[CATEGORIES.length - 1];

function calcSplits(members, selectedIds, total, splitType, customValues) {
  const selected = members.filter((m) => selectedIds.includes(m.id));
  if (!selected.length || !total) return {};
  const result = {};

  if (splitType === 'equal') {
    const floor = Math.floor((total / selected.length) * 100) / 100;
    selected.forEach((m, i) => {
      if (i === selected.length - 1) {
        result[m.id] = Math.round((total - floor * (selected.length - 1)) * 100) / 100;
      } else {
        result[m.id] = floor;
      }
    });
  } else if (splitType === 'exact') {
    selected.forEach((m) => { result[m.id] = parseFloat(customValues[m.id] || 0); });
  } else if (splitType === 'percentage') {
    selected.forEach((m) => {
      result[m.id] = Math.round(total * parseFloat(customValues[m.id] || 0) / 100 * 100) / 100;
    });
  } else if (splitType === 'shares') {
    const totalShares = selected.reduce((s, m) => s + parseFloat(customValues[m.id] || 1), 0);
    selected.forEach((m) => {
      result[m.id] = Math.round(total * parseFloat(customValues[m.id] || 1) / totalShares * 100) / 100;
    });
  }
  return result;
}

function calculateBalances(members, expenses, splits, settlements) {
  const bal = {};
  members.forEach((m) => { bal[m.id] = 0; });

  expenses.forEach((exp) => {
    const expSplits = splits.filter((s) => s.expense_id === exp.id);
    expSplits.forEach((s) => { bal[s.member_id] = (bal[s.member_id] ?? 0) - Number(s.amount); });
    if (exp.paid_by) bal[exp.paid_by] = (bal[exp.paid_by] ?? 0) + Number(exp.amount);
  });

  settlements.forEach((s) => {
    if (s.from_member) bal[s.from_member] = (bal[s.from_member] ?? 0) + Number(s.amount);
    if (s.to_member)   bal[s.to_member]   = (bal[s.to_member]   ?? 0) - Number(s.amount);
  });

  return bal;
}

function simplifyDebts(balances) {
  const cred = [], debt = [];
  Object.entries(balances).forEach(([id, amt]) => {
    const a = Math.round(amt * 100) / 100;
    if (a > 0.01)  cred.push({ id, a });
    if (a < -0.01) debt.push({ id, a: -a });
  });

  const txns = [];
  let ci = 0, di = 0;
  while (ci < cred.length && di < debt.length) {
    const amt = Math.round(Math.min(cred[ci].a, debt[di].a) * 100) / 100;
    txns.push({ from: debt[di].id, to: cred[ci].id, amount: amt });
    cred[ci].a -= amt;
    debt[di].a -= amt;
    if (cred[ci].a < 0.01) ci++;
    if (debt[di].a < 0.01) di++;
  }
  return txns;
}

// ─── Shared style tokens ───────────────────────────────────────────────────────
const inputBase = {
  width: '100%',
  background: '#161616',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: 4,
  padding: '10px 12px',
  color: '#e5e2e1',
  fontFamily: "'DM Sans', sans-serif",
  fontSize: 14,
  outline: 'none',
  boxSizing: 'border-box',
};
const labelBase = {
  display: 'block',
  fontFamily: "'Space Mono', monospace",
  fontSize: 10,
  textTransform: 'uppercase',
  letterSpacing: '0.1em',
  marginBottom: 6,
  color: '#555',
};
const errStyle = {
  fontFamily: "'Space Mono', monospace",
  fontSize: 10,
  color: '#ef4444',
  marginTop: 4,
  display: 'flex',
  alignItems: 'center',
  gap: 4,
};

// ─── Avatar ────────────────────────────────────────────────────────────────────
function Avatar({ member, size = 28 }) {
  if (!member) return null;
  return (
    <div
      style={{
        width: size, height: size, borderRadius: 4,
        background: member.color || '#555',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontFamily: "'Space Mono', monospace",
        fontSize: Math.max(8, size * 0.35), fontWeight: 700,
        color: '#fff', flexShrink: 0, userSelect: 'none',
      }}
    >
      {initials(member.name)}
    </div>
  );
}

// ─── CategoryIcon ──────────────────────────────────────────────────────────────
function CategoryIcon({ catId, size = 44 }) {
  const cat = catById(catId);
  return (
    <div style={{
      width: size, height: size, borderRadius: 8,
      background: `${cat.color}18`,
      display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
    }}>
      <span className="material-symbols-outlined" style={{ fontSize: size * 0.5, color: cat.color }}>
        {cat.icon}
      </span>
    </div>
  );
}

// ─── AddExpenseModal ───────────────────────────────────────────────────────────
function AddExpenseModal({ members, expense, onSave, onClose }) {
  const isEdit = !!expense;

  const [form, setForm] = useState({
    title:      expense?.title      || '',
    amount:     expense?.amount     || '',
    paid_by:    expense?.paid_by    || members[0]?.id || '',
    split_type: expense?.split_type || 'equal',
    category:   expense?.category   || 'other',
    date:       expense?.date       || todayStr(),
    notes:      expense?.notes      || '',
  });

  const [selectedIds, setSelectedIds] = useState(() => {
    if (expense?.splits?.length) return expense.splits.map((s) => s.member_id);
    return members.map((m) => m.id);
  });

  const [customValues, setCustomValues] = useState(() => {
    if (expense?.splits?.length) {
      return Object.fromEntries(expense.splits.map((s) => [s.member_id, String(s.amount)]));
    }
    return {};
  });

  const [errors, setErrors] = useState({});

  const set = (key, val) => {
    setForm((f) => ({ ...f, [key]: val }));
    if (errors[key]) setErrors((e) => ({ ...e, [key]: null }));
  };

  const toggleMember = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
    if (errors.members) setErrors((e) => ({ ...e, members: null }));
  };

  const total = parseFloat(form.amount) || 0;

  const splitPreview = useMemo(
    () => calcSplits(members, selectedIds, total, form.split_type, customValues),
    [members, selectedIds, total, form.split_type, customValues]
  );

  const validate = () => {
    const e = {};
    if (!form.title.trim())                     e.title   = 'Title is required';
    if (!form.amount || total <= 0)              e.amount  = 'A valid amount is required';
    if (!form.date)                              e.date    = 'Date is required';
    if (!form.paid_by)                           e.paid_by = 'Select who paid';
    if (!selectedIds.length)                     e.members = 'Select at least one member';

    if (form.split_type === 'exact') {
      const sum = selectedIds.reduce((s, id) => s + parseFloat(customValues[id] || 0), 0);
      if (Math.abs(sum - total) > 0.01)
        e.splits = `Must sum to ${fmt(total)} — current: ${fmt(sum)}`;
    }
    if (form.split_type === 'percentage') {
      const sum = selectedIds.reduce((s, id) => s + parseFloat(customValues[id] || 0), 0);
      if (Math.abs(sum - 100) > 0.5)
        e.splits = `Must sum to 100% — current: ${sum.toFixed(1)}%`;
    }

    setErrors(e);
    return !Object.keys(e).length;
  };

  const handleSave = () => {
    if (!validate()) return;
    const splits = Object.entries(splitPreview).map(([member_id, amount]) => ({ member_id, amount }));
    onSave({ ...form, amount: total, splits });
  };

  const inputErr = (key) => ({
    ...inputBase,
    borderColor: errors[key] ? '#ef4444' : 'rgba(255,255,255,0.1)',
    boxShadow:   errors[key] ? '0 0 0 1px #ef444430' : 'none',
  });

  const showCustom = form.split_type !== 'equal' && selectedIds.length > 0;

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '16px' }}
      onClick={onClose}
    >
      <div
        style={{ background: '#111', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, width: '100%', maxWidth: 600, maxHeight: '92vh', overflowY: 'auto', padding: '28px 32px' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
          <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 28, color: '#fff', margin: 0, letterSpacing: '0.02em' }}>
            {isEdit ? 'Edit Expense' : 'Add Expense'}
          </h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#555', cursor: 'pointer', display: 'flex', padding: 4 }}>
            <span className="material-symbols-outlined" style={{ fontSize: 20 }}>close</span>
          </button>
        </div>

        {/* Title + Amount */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 160px', gap: 16, marginBottom: 16 }}>
          <div>
            <label style={{ ...labelBase, color: errors.title ? '#ef4444' : '#555' }}>Title *</label>
            <input
              style={inputErr('title')}
              placeholder="e.g. Team lunch"
              value={form.title}
              onChange={(e) => set('title', e.target.value)}
            />
            {errors.title && <div style={errStyle}><span className="material-symbols-outlined" style={{ fontSize: 12 }}>error</span>{errors.title}</div>}
          </div>
          <div>
            <label style={{ ...labelBase, color: errors.amount ? '#ef4444' : '#555' }}>Amount (৳) *</label>
            <input
              type="number" min="0" step="0.01"
              style={inputErr('amount')}
              placeholder="0.00"
              value={form.amount}
              onChange={(e) => set('amount', e.target.value)}
            />
            {errors.amount && <div style={errStyle}><span className="material-symbols-outlined" style={{ fontSize: 12 }}>error</span>{errors.amount}</div>}
          </div>
        </div>

        {/* Date + Category */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
          <div>
            <label style={{ ...labelBase, color: errors.date ? '#ef4444' : '#555' }}>Date *</label>
            <input
              type="date"
              style={inputErr('date')}
              value={form.date}
              onChange={(e) => set('date', e.target.value)}
            />
            {errors.date && <div style={errStyle}><span className="material-symbols-outlined" style={{ fontSize: 12 }}>error</span>{errors.date}</div>}
          </div>
          <div>
            <label style={labelBase}>Category</label>
            <select style={inputBase} value={form.category} onChange={(e) => set('category', e.target.value)}>
              {CATEGORIES.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
            </select>
          </div>
        </div>

        {/* Paid By */}
        <div style={{ marginBottom: 16 }}>
          <label style={{ ...labelBase, color: errors.paid_by ? '#ef4444' : '#555' }}>Paid By *</label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {members.map((m) => (
              <button
                key={m.id}
                onClick={() => set('paid_by', m.id)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8, padding: '8px 14px',
                  background: form.paid_by === m.id ? `${m.color}20` : '#161616',
                  border: `1px solid ${form.paid_by === m.id ? m.color : 'rgba(255,255,255,0.1)'}`,
                  borderRadius: 4, cursor: 'pointer',
                  color: form.paid_by === m.id ? m.color : '#999',
                  fontFamily: "'DM Sans', sans-serif", fontSize: 13, transition: 'all 0.15s',
                }}
              >
                <Avatar member={m} size={22} />
                {m.name.split(' ')[0]}
              </button>
            ))}
          </div>
          {errors.paid_by && <div style={errStyle}><span className="material-symbols-outlined" style={{ fontSize: 12 }}>error</span>{errors.paid_by}</div>}
        </div>

        {/* Split Type */}
        <div style={{ marginBottom: 16 }}>
          <label style={labelBase}>Split Method</label>
          <div style={{ display: 'flex', gap: 8 }}>
            {SPLIT_TYPES.map((t) => (
              <button
                key={t.id}
                onClick={() => set('split_type', t.id)}
                style={{
                  flex: 1, padding: '8px 4px',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
                  background: form.split_type === t.id ? '#ff550015' : '#161616',
                  border: `1px solid ${form.split_type === t.id ? '#ff5500' : 'rgba(255,255,255,0.1)'}`,
                  borderRadius: 4, cursor: 'pointer',
                  color: form.split_type === t.id ? '#ff5500' : '#666',
                  fontFamily: "'Space Mono', monospace", fontSize: 10, transition: 'all 0.15s',
                }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: 16 }}>{t.icon}</span>
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Split Between */}
        <div style={{ marginBottom: 16 }}>
          <label style={{ ...labelBase, color: errors.members ? '#ef4444' : '#555' }}>Split Between *</label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {members.map((m) => {
              const selected = selectedIds.includes(m.id);
              return (
                <button
                  key={m.id}
                  onClick={() => toggleMember(m.id)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8, padding: '8px 14px',
                    background: selected ? `${m.color}15` : '#161616',
                    border: `1px solid ${selected ? m.color : 'rgba(255,255,255,0.1)'}`,
                    borderRadius: 4, cursor: 'pointer',
                    color: selected ? m.color : '#666',
                    fontFamily: "'DM Sans', sans-serif", fontSize: 13, transition: 'all 0.15s',
                    whiteSpace: 'nowrap',
                  }}
                >
                  <Avatar member={m} size={20} />
                  {m.name.split(' ')[0]}
                  {selected && form.split_type === 'equal' && splitPreview[m.id] != null && (
                    <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 9, color: '#ff5500', marginLeft: 2 }}>
                      {fmt(splitPreview[m.id])}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
          {errors.members && <div style={errStyle}><span className="material-symbols-outlined" style={{ fontSize: 12 }}>error</span>{errors.members}</div>}
        </div>

        {/* Custom split inputs */}
        {showCustom && (
          <div style={{ marginBottom: 16 }}>
            <label style={{ ...labelBase, color: errors.splits ? '#ef4444' : '#555' }}>
              {form.split_type === 'exact' ? 'Exact Amounts'
                : form.split_type === 'percentage' ? 'Percentages (must sum to 100%)'
                : 'Relative Shares'}
            </label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, background: '#161616', borderRadius: 6, padding: '12px 16px' }}>
              {members.filter((m) => selectedIds.includes(m.id)).map((m) => (
                <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <Avatar member={m} size={24} />
                  <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: '#aaa', flex: 1 }}>
                    {m.name.split(' ')[0]}
                  </span>
                  <input
                    type="number" min="0" step={form.split_type === 'shares' ? '1' : '0.01'}
                    style={{ ...inputBase, width: 100, textAlign: 'right', padding: '6px 10px' }}
                    value={customValues[m.id] ?? (form.split_type === 'shares' ? '1' : '')}
                    onChange={(e) => setCustomValues((v) => ({ ...v, [m.id]: e.target.value }))}
                    placeholder={form.split_type === 'shares' ? '1' : '0'}
                  />
                  <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, color: '#555', width: 56, textAlign: 'right' }}>
                    {form.split_type === 'percentage' ? '%'
                      : form.split_type === 'shares' ? 'share'
                      : ''}
                    {form.split_type !== 'exact' && splitPreview[m.id] != null
                      ? ` ≈ ${fmt(splitPreview[m.id])}` : ''}
                  </span>
                </div>
              ))}
            </div>
            {errors.splits && <div style={errStyle}><span className="material-symbols-outlined" style={{ fontSize: 12 }}>error</span>{errors.splits}</div>}
          </div>
        )}

        {/* Notes */}
        <div style={{ marginBottom: 24 }}>
          <label style={labelBase}>Notes (optional)</label>
          <textarea
            style={{ ...inputBase, resize: 'vertical', minHeight: 56 }}
            placeholder="Any additional details..."
            value={form.notes}
            onChange={(e) => set('notes', e.target.value)}
          />
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
          <button
            onClick={onClose}
            style={{ padding: '10px 20px', background: 'none', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 4, color: '#aaa', cursor: 'pointer', fontFamily: "'Space Mono', monospace", fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em' }}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            style={{ padding: '10px 24px', background: '#ff5500', border: 'none', borderRadius: 4, color: '#fff', cursor: 'pointer', fontFamily: "'Space Mono', monospace", fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em' }}
          >
            {isEdit ? 'Update Expense' : 'Add Expense'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── SettleUpModal ─────────────────────────────────────────────────────────────
function SettleUpModal({ members, suggestion, onSave, onClose }) {
  const [form, setForm] = useState({
    from_member: suggestion?.from || members[0]?.id || '',
    to_member:   suggestion?.to   || members[1]?.id || '',
    amount:      suggestion ? String(suggestion.amount) : '',
    date:        todayStr(),
    notes:       '',
  });
  const [errors, setErrors] = useState({});

  const set = (key, val) => {
    setForm((f) => ({ ...f, [key]: val }));
    if (errors[key]) setErrors((e) => ({ ...e, [key]: null }));
  };

  const handleSave = () => {
    const e = {};
    if (!form.from_member)                                             e.from_member = 'Required';
    if (!form.to_member)                                               e.to_member   = 'Required';
    if (form.from_member === form.to_member)                           e.to_member   = 'Must be a different person';
    if (!form.amount || parseFloat(form.amount) <= 0)                  e.amount      = 'Valid amount required';
    if (!form.date)                                                    e.date        = 'Date is required';

    setErrors(e);
    if (Object.keys(e).length) return;
    onSave({ ...form, amount: parseFloat(form.amount) });
  };

  const fromMem = members.find((m) => m.id === form.from_member);
  const toMem   = members.find((m) => m.id === form.to_member);

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1001, padding: 16 }}
      onClick={onClose}
    >
      <div
        style={{ background: '#111', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, width: '100%', maxWidth: 440, padding: '28px 32px' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
          <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 28, color: '#fff', margin: 0 }}>Settle Up</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#555', cursor: 'pointer', display: 'flex', padding: 4 }}>
            <span className="material-symbols-outlined" style={{ fontSize: 20 }}>close</span>
          </button>
        </div>

        {/* Visual payment indicator */}
        {fromMem && toMem && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 20, marginBottom: 24, padding: '18px', background: '#161616', borderRadius: 6, border: '1px solid rgba(255,255,255,0.06)' }}>
            <div style={{ textAlign: 'center' }}>
              <Avatar member={fromMem} size={40} />
              <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: '#aaa', marginTop: 6, fontWeight: 600 }}>
                {fromMem.name.split(' ')[0]}
              </div>
              <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 9, color: '#ef4444' }}>paying</div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
              <span className="material-symbols-outlined" style={{ fontSize: 28, color: '#10b981' }}>arrow_forward</span>
              <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 14, color: '#10b981', fontWeight: 700 }}>
                {fmt(parseFloat(form.amount) || 0)}
              </span>
            </div>
            <div style={{ textAlign: 'center' }}>
              <Avatar member={toMem} size={40} />
              <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: '#aaa', marginTop: 6, fontWeight: 600 }}>
                {toMem.name.split(' ')[0]}
              </div>
              <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 9, color: '#10b981' }}>receiving</div>
            </div>
          </div>
        )}

        {/* From + To */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
          <div>
            <label style={labelBase}>From (Paying)</label>
            <select style={inputBase} value={form.from_member} onChange={(e) => set('from_member', e.target.value)}>
              {members.map((m) => <option key={m.id} value={m.id}>{m.name.split(' ')[0]}</option>)}
            </select>
          </div>
          <div>
            <label style={{ ...labelBase, color: errors.to_member ? '#ef4444' : '#555' }}>To (Receiving)</label>
            <select
              style={{ ...inputBase, borderColor: errors.to_member ? '#ef4444' : 'rgba(255,255,255,0.1)' }}
              value={form.to_member}
              onChange={(e) => set('to_member', e.target.value)}
            >
              {members.map((m) => <option key={m.id} value={m.id}>{m.name.split(' ')[0]}</option>)}
            </select>
            {errors.to_member && <div style={errStyle}><span className="material-symbols-outlined" style={{ fontSize: 12 }}>error</span>{errors.to_member}</div>}
          </div>
        </div>

        {/* Amount + Date */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
          <div>
            <label style={{ ...labelBase, color: errors.amount ? '#ef4444' : '#555' }}>Amount (৳) *</label>
            <input
              type="number" min="0" step="0.01"
              style={{ ...inputBase, borderColor: errors.amount ? '#ef4444' : 'rgba(255,255,255,0.1)' }}
              placeholder="0.00"
              value={form.amount}
              onChange={(e) => set('amount', e.target.value)}
            />
            {errors.amount && <div style={errStyle}><span className="material-symbols-outlined" style={{ fontSize: 12 }}>error</span>{errors.amount}</div>}
          </div>
          <div>
            <label style={{ ...labelBase, color: errors.date ? '#ef4444' : '#555' }}>Date *</label>
            <input
              type="date"
              style={{ ...inputBase, borderColor: errors.date ? '#ef4444' : 'rgba(255,255,255,0.1)' }}
              value={form.date}
              onChange={(e) => set('date', e.target.value)}
            />
            {errors.date && <div style={errStyle}><span className="material-symbols-outlined" style={{ fontSize: 12 }}>error</span>{errors.date}</div>}
          </div>
        </div>

        {/* Notes */}
        <div style={{ marginBottom: 24 }}>
          <label style={labelBase}>Notes (optional)</label>
          <input
            style={inputBase}
            placeholder="e.g. Cash payment, bank transfer…"
            value={form.notes}
            onChange={(e) => set('notes', e.target.value)}
          />
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
          <button
            onClick={onClose}
            style={{ padding: '10px 20px', background: 'none', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 4, color: '#aaa', cursor: 'pointer', fontFamily: "'Space Mono', monospace", fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em' }}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            style={{ padding: '10px 24px', background: '#10b981', border: 'none', borderRadius: 4, color: '#fff', cursor: 'pointer', fontFamily: "'Space Mono', monospace", fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em' }}
          >
            Record Payment
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── ExpenseCard ───────────────────────────────────────────────────────────────
function ExpenseCard({ expense, splits, members, currentMember, onEdit, onDelete }) {
  const cat         = catById(expense.category);
  const payer       = members.find((m) => m.id === expense.paid_by);
  const participants = members.filter((m) =>
    splits.some((s) => s.expense_id === expense.id && s.member_id === m.id)
  );

  const youPaid = currentMember && expense.paid_by === currentMember.id;
  const yourShareRow = currentMember
    ? splits.find((s) => s.expense_id === expense.id && s.member_id === currentMember.id)
    : null;
  const involvesMe = youPaid || !!yourShareRow;

  return (
    <div
      style={{ background: '#111', border: `1px solid ${involvesMe ? '#ff550028' : 'rgba(255,255,255,0.06)'}`, borderRadius: 6, padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 14, transition: 'border-color 0.15s' }}
      onMouseEnter={(e) => (e.currentTarget.style.borderColor = involvesMe ? '#ff550055' : 'rgba(255,255,255,0.12)')}
      onMouseLeave={(e) => (e.currentTarget.style.borderColor = involvesMe ? '#ff550028' : 'rgba(255,255,255,0.06)')}
    >
      <CategoryIcon catId={expense.category} size={42} />

      {/* Main info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 5 }}>
          <span style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 600, fontSize: 15, color: '#e5e2e1', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {expense.title}
          </span>
          <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, color: '#444', flexShrink: 0 }}>
            {fmtDate(expense.date)}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          {payer && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <Avatar member={payer} size={18} />
              <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 9, color: '#666' }}>
                paid
              </span>
            </div>
          )}
          <span style={{ color: '#2a2a2a', fontSize: 10 }}>·</span>
          {/* Participant avatars */}
          <div style={{ display: 'flex', alignItems: 'center' }}>
            {participants.slice(0, 5).map((m, i) => (
              <div key={m.id} style={{ marginLeft: i > 0 ? -6 : 0, zIndex: 10 - i }}>
                <Avatar member={m} size={18} />
              </div>
            ))}
            {participants.length > 5 && (
              <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 9, color: '#666', marginLeft: 4 }}>
                +{participants.length - 5}
              </span>
            )}
          </div>
          <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 9, color: '#444', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            split {expense.split_type}
          </span>
          {expense.notes && (
            <>
              <span style={{ color: '#2a2a2a', fontSize: 10 }}>·</span>
              <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: '#555', fontStyle: 'italic', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 200 }}>
                {expense.notes}
              </span>
            </>
          )}
        </div>
      </div>

      {/* Amount + category */}
      <div style={{ textAlign: 'right', flexShrink: 0 }}>
        <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 17, fontWeight: 700, color: '#fff' }}>
          {fmt(expense.amount)}
        </div>
        <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 9, color: cat.color, textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: 2 }}>
          {cat.label}
        </div>
        {involvesMe && (
          <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 9, color: youPaid ? '#10b981' : '#ff5500', marginTop: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            {youPaid ? 'You paid' : `Your share ${fmt(yourShareRow.amount)}`}
          </div>
        )}
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
        <button
          onClick={() => onEdit(expense)}
          style={{ background: 'none', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 4, padding: '6px', cursor: 'pointer', color: '#666', display: 'flex', alignItems: 'center', transition: 'color 0.15s' }}
          onMouseEnter={(e) => (e.currentTarget.style.color = '#aaa')}
          onMouseLeave={(e) => (e.currentTarget.style.color = '#666')}
        >
          <span className="material-symbols-outlined" style={{ fontSize: 14 }}>edit</span>
        </button>
        <button
          onClick={() => onDelete(expense.id)}
          style={{ background: 'none', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 4, padding: '6px', cursor: 'pointer', color: '#555', display: 'flex', alignItems: 'center', transition: 'color 0.15s' }}
          onMouseEnter={(e) => (e.currentTarget.style.color = '#ef4444')}
          onMouseLeave={(e) => (e.currentTarget.style.color = '#555')}
        >
          <span className="material-symbols-outlined" style={{ fontSize: 14 }}>delete</span>
        </button>
      </div>
    </div>
  );
}

// ─── Main Expenses Page ────────────────────────────────────────────────────────
export default function Expenses() {
  const { member: currentMember } = useCurrentMember();
  const [members,     setMembers]     = useState([]);
  const [expenses,    setExpenses]    = useState([]);
  const [splits,      setSplits]      = useState([]);
  const [settlements, setSettlements] = useState([]);
  const [loading,     setLoading]     = useState(true);

  const [tab,             setTab]             = useState('expenses');
  const [showAddModal,    setShowAddModal]    = useState(false);
  const [editingExpense,  setEditingExpense]  = useState(null);
  const [showSettleModal, setShowSettleModal] = useState(false);
  const [settleSuggestion,setSettleSuggestion]= useState(null);

  const [search,         setSearch]         = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterMember,   setFilterMember]   = useState('');
  const [onlyMine,       setOnlyMine]       = useState(false);

  useEffect(() => { loadAll(); }, []);

  async function loadAll() {
    setLoading(true);
    const [memR, expR, splR, setR] = await Promise.all([
      supabase.from('members').select('*').order('name'),
      supabase.from('expenses').select('*').order('date', { ascending: false }).order('created_at', { ascending: false }),
      supabase.from('expense_splits').select('*'),
      supabase.from('settlements').select('*').order('date', { ascending: false }),
    ]);
    setMembers(memR.data || []);
    setExpenses(expR.data || []);
    setSplits(splR.data || []);
    setSettlements(setR.data || []);
    setLoading(false);
  }

  // ── Computed values ──────────────────────────────────────────────────────────
  const balances = useMemo(
    () => calculateBalances(members, expenses, splits, settlements),
    [members, expenses, splits, settlements]
  );
  const debtTxns = useMemo(() => simplifyDebts({ ...balances }), [balances]);

  const totalSpent = expenses.reduce((s, e) => s + Number(e.amount), 0);
  const totalSettled = settlements.reduce((s, e) => s + Number(e.amount), 0);
  const totalOwed = Object.values(balances).filter((b) => b > 0.01).reduce((s, b) => s + b, 0);

  // Per-member spending totals for balance cards
  const memberStats = useMemo(() => {
    return members.reduce((acc, m) => {
      acc[m.id] = {
        paid: expenses.filter((e) => e.paid_by === m.id).reduce((s, e) => s + Number(e.amount), 0),
        share: splits.filter((s) => s.member_id === m.id).reduce((sum, s) => sum + Number(s.amount), 0),
      };
      return acc;
    }, {});
  }, [members, expenses, splits]);

  // Filtered + grouped expenses
  const filteredExpenses = useMemo(() => {
    return expenses.filter((exp) => {
      if (search && !exp.title.toLowerCase().includes(search.toLowerCase())) return false;
      if (filterCategory && exp.category !== filterCategory) return false;
      if (filterMember && !splits.some((s) => s.expense_id === exp.id && s.member_id === filterMember)) return false;
      if (onlyMine && currentMember) {
        const involved = exp.paid_by === currentMember.id ||
          splits.some((s) => s.expense_id === exp.id && s.member_id === currentMember.id);
        if (!involved) return false;
      }
      return true;
    });
  }, [expenses, splits, search, filterCategory, filterMember, onlyMine, currentMember]);

  const groupedExpenses = useMemo(() => {
    const groups = {};
    filteredExpenses.forEach((exp) => {
      const key = exp.date.substring(0, 7);
      if (!groups[key]) groups[key] = [];
      groups[key].push(exp);
    });
    return Object.entries(groups).sort((a, b) => b[0].localeCompare(a[0]));
  }, [filteredExpenses]);

  // ── Handlers ─────────────────────────────────────────────────────────────────
  async function handleSaveExpense(data) {
    const { splits: newSplits, ...expData } = data;

    if (editingExpense) {
      await supabase.from('expenses').update(expData).eq('id', editingExpense.id);
      await supabase.from('expense_splits').delete().eq('expense_id', editingExpense.id);
      if (newSplits.length) {
        await supabase.from('expense_splits').insert(
          newSplits.map((s) => ({ ...s, expense_id: editingExpense.id }))
        );
      }
    } else {
      const { data: created, error } = await supabase
        .from('expenses')
        .insert([expData])
        .select()
        .single();
      if (created && newSplits.length) {
        await supabase.from('expense_splits').insert(
          newSplits.map((s) => ({ ...s, expense_id: created.id }))
        );
      }
    }

    setShowAddModal(false);
    setEditingExpense(null);
    loadAll();
  }

  async function handleDeleteExpense(id) {
    if (!window.confirm('Delete this expense? This cannot be undone.')) return;
    await supabase.from('expenses').delete().eq('id', id);
    loadAll();
  }

  async function handleSaveSettlement(data) {
    await supabase.from('settlements').insert([data]);
    setShowSettleModal(false);
    setSettleSuggestion(null);
    loadAll();
  }

  async function handleDeleteSettlement(id) {
    if (!window.confirm('Remove this settlement record?')) return;
    await supabase.from('settlements').delete().eq('id', id);
    loadAll();
  }

  function openEdit(expense) {
    const expSplits = splits.filter((s) => s.expense_id === expense.id);
    setEditingExpense({ ...expense, splits: expSplits });
    setShowAddModal(true);
  }

  function openSettle(suggestion = null) {
    setSettleSuggestion(suggestion);
    setShowSettleModal(true);
  }

  // ── Render ────────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: '#080808' }}>
        <AdminNavbar />
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
          <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 12, color: '#444' }}>Loading expenses…</span>
        </div>
      </div>
    );
  }

  const tabBtn = (id, label, icon, badge) => (
    <button
      onClick={() => setTab(id)}
      style={{
        display: 'flex', alignItems: 'center', gap: 6,
        padding: '10px 20px', background: 'none',
        border: 'none', borderBottom: tab === id ? '2px solid #ff5500' : '2px solid transparent',
        color: tab === id ? '#ff5500' : '#666',
        cursor: 'pointer', marginBottom: -1,
        fontFamily: "'Space Mono', monospace", fontSize: 11,
        textTransform: 'uppercase', letterSpacing: '0.05em',
        transition: 'color 0.15s',
      }}
    >
      <span className="material-symbols-outlined" style={{ fontSize: 16 }}>{icon}</span>
      {label}
      {badge != null && (
        <span style={{ background: tab === id ? '#ff550025' : 'rgba(255,255,255,0.06)', color: tab === id ? '#ff5500' : '#555', fontFamily: "'Space Mono', monospace", fontSize: 9, padding: '2px 6px', borderRadius: 2 }}>
          {badge}
        </span>
      )}
    </button>
  );

  return (
    <div style={{ minHeight: '100vh', background: '#080808', color: '#e5e2e1' }}>
      <AdminNavbar />
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '32px 24px' }}>

        {/* ── Page header ── */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 32, gap: 16, flexWrap: 'wrap' }}>
          <div>
            <h1 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 40, color: '#fff', margin: 0, letterSpacing: '0.02em' }}>
              Expenses
            </h1>
            <p style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, color: '#444', margin: '6px 0 0', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
              Track · Split · Settle
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 12, flexWrap: 'wrap' }}>
            {/* Stat chips */}
            {[
              { label: 'Total Spent',    value: fmt(totalSpent),   color: '#fff'     },
              { label: 'Settled',        value: fmt(totalSettled), color: '#10b981'  },
              { label: 'Outstanding',    value: fmt(totalOwed),    color: '#ff5500'  },
            ].map((s) => (
              <div key={s.label} style={{ background: '#111', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 6, padding: '10px 16px', textAlign: 'right' }}>
                <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 15, fontWeight: 700, color: s.color }}>{s.value}</div>
                <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 9, color: '#444', textTransform: 'uppercase', letterSpacing: '0.1em', marginTop: 2 }}>{s.label}</div>
              </div>
            ))}

            <button
              onClick={() => { setEditingExpense(null); setShowAddModal(true); }}
              style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 20px', background: '#ff5500', border: 'none', borderRadius: 4, color: '#fff', cursor: 'pointer', fontFamily: "'Space Mono', monospace", fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: 16 }}>add</span>
              Add Expense
            </button>
          </div>
        </div>

        {/* ── Tabs ── */}
        <div style={{ display: 'flex', gap: 0, marginBottom: 28, borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
          {tabBtn('expenses', 'History',  'receipt_long',         expenses.length)}
          {tabBtn('balances', 'Balances', 'account_balance_wallet', debtTxns.length || null)}
        </div>

        {/* ════════════════════ HISTORY TAB ════════════════════ */}
        {tab === 'expenses' && (
          <div>
            {/* Filter bar */}
            <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
              <div style={{ flex: 1, minWidth: 180, position: 'relative' }}>
                <span className="material-symbols-outlined" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', fontSize: 16, color: '#444', pointerEvents: 'none' }}>search</span>
                <input
                  style={{ ...inputBase, paddingLeft: 34 }}
                  placeholder="Search expenses…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <select
                style={{ ...inputBase, width: 'auto', cursor: 'pointer', color: filterCategory ? '#e5e2e1' : '#555' }}
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
              >
                <option value="">All Categories</option>
                {CATEGORIES.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
              </select>
              <select
                style={{ ...inputBase, width: 'auto', cursor: 'pointer', color: filterMember ? '#e5e2e1' : '#555' }}
                value={filterMember}
                onChange={(e) => setFilterMember(e.target.value)}
              >
                <option value="">All Members</option>
                {members.map((m) => <option key={m.id} value={m.id}>{m.name.split(' ')[0]}</option>)}
              </select>
              {currentMember && (
                <button
                  onClick={() => setOnlyMine((v) => !v)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px',
                    background: onlyMine ? '#ff550018' : '#161616',
                    border: `1px solid ${onlyMine ? '#ff5500' : 'rgba(255,255,255,0.1)'}`,
                    borderRadius: 4, color: onlyMine ? '#ff5500' : '#888', cursor: 'pointer',
                    fontFamily: "'Space Mono', monospace", fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap',
                  }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: 14 }}>person</span>
                  Just Mine
                </button>
              )}
              {(search || filterCategory || filterMember || onlyMine) && (
                <button
                  onClick={() => { setSearch(''); setFilterCategory(''); setFilterMember(''); setOnlyMine(false); }}
                  style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '8px 12px', background: 'none', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 4, color: '#666', cursor: 'pointer', fontFamily: "'Space Mono', monospace", fontSize: 10 }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: 14 }}>filter_alt_off</span>
                  Clear
                </button>
              )}
            </div>

            {/* Grouped expense list */}
            {groupedExpenses.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '80px 0', color: '#333' }}>
                <span className="material-symbols-outlined" style={{ fontSize: 40, display: 'block', marginBottom: 12 }}>receipt_long</span>
                <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 12 }}>
                  {expenses.length === 0 ? 'No expenses yet — add the first one!' : 'No expenses match the filters.'}
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
                {groupedExpenses.map(([monthKey, monthExpenses]) => {
                  const monthTotal = monthExpenses.reduce((s, e) => s + Number(e.amount), 0);
                  return (
                    <div key={monthKey}>
                      {/* Month header */}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                        <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, color: '#555', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                          {fmtMonth(monthKey)}
                        </span>
                        <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.05)', margin: '0 16px' }} />
                        <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 11, color: '#444' }}>
                          {fmt(monthTotal)}
                        </span>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        {monthExpenses.map((exp) => (
                          <ExpenseCard
                            key={exp.id}
                            expense={exp}
                            splits={splits}
                            members={members}
                            currentMember={currentMember}
                            onEdit={openEdit}
                            onDelete={handleDeleteExpense}
                          />
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ════════════════════ BALANCES TAB ════════════════════ */}
        {tab === 'balances' && (
          <div>
            {/* My Balance panel */}
            {currentMember && (() => {
              const myBal = balances[currentMember.id] || 0;
              const iOwe       = debtTxns.filter((t) => t.from === currentMember.id);
              const owedToMe   = debtTxns.filter((t) => t.to   === currentMember.id);
              const isOwed = myBal > 0.01;
              const isOwing = myBal < -0.01;
              const accent = isOwed ? '#10b981' : isOwing ? '#ef4444' : '#666';
              const label  = isOwed ? 'You are owed' : isOwing ? 'You owe' : 'You are settled up';

              return (
                <div style={{
                  background: 'linear-gradient(135deg, #111 0%, #0d0d0d 100%)',
                  border: `1px solid ${accent}33`,
                  borderRadius: 8, padding: '24px 28px', marginBottom: 28,
                }}>
                  {/* Header row */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16, marginBottom: iOwe.length || owedToMe.length ? 20 : 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                      <Avatar member={currentMember} size={48} />
                      <div>
                        <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 9, color: '#666', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                          Signed in as
                        </div>
                        <div style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 600, fontSize: 16, color: '#e5e2e1', marginTop: 2 }}>
                          {currentMember.name}
                        </div>
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 28, fontWeight: 700, color: accent, lineHeight: 1 }}>
                        {isOwed ? '+' : ''}{fmt(myBal)}
                      </div>
                      <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 9, color: `${accent}cc`, textTransform: 'uppercase', letterSpacing: '0.1em', marginTop: 6 }}>
                        {label}
                      </div>
                    </div>
                  </div>

                  {/* Two-column breakdown */}
                  {(iOwe.length > 0 || owedToMe.length > 0) && (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 12 }}>
                      {/* You owe */}
                      <div style={{ background: '#161616', border: '1px solid rgba(239,68,68,0.15)', borderRadius: 6, padding: '14px 16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
                          <span className="material-symbols-outlined" style={{ fontSize: 14, color: '#ef4444' }}>arrow_upward</span>
                          <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, color: '#ef4444', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                            You owe
                          </span>
                        </div>
                        {iOwe.length === 0 ? (
                          <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 11, color: '#444' }}>Nothing owed.</div>
                        ) : (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                            {iOwe.map((txn, i) => {
                              const to = members.find((m) => m.id === txn.to);
                              if (!to) return null;
                              return (
                                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                  <Avatar member={to} size={24} />
                                  <span style={{ flex: 1, fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: '#ccc' }}>
                                    {to.name.split(' ')[0]}
                                  </span>
                                  <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 13, fontWeight: 700, color: '#ef4444' }}>
                                    {fmt(txn.amount)}
                                  </span>
                                  <button
                                    onClick={() => openSettle(txn)}
                                    style={{ padding: '4px 10px', background: '#10b98115', border: '1px solid #10b98135', borderRadius: 4, color: '#10b981', cursor: 'pointer', fontFamily: "'Space Mono', monospace", fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.05em' }}
                                  >
                                    Pay
                                  </button>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>

                      {/* Owed to you */}
                      <div style={{ background: '#161616', border: '1px solid rgba(16,185,129,0.15)', borderRadius: 6, padding: '14px 16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
                          <span className="material-symbols-outlined" style={{ fontSize: 14, color: '#10b981' }}>arrow_downward</span>
                          <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, color: '#10b981', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                            Owed to you
                          </span>
                        </div>
                        {owedToMe.length === 0 ? (
                          <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 11, color: '#444' }}>Nothing owed to you.</div>
                        ) : (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                            {owedToMe.map((txn, i) => {
                              const from = members.find((m) => m.id === txn.from);
                              if (!from) return null;
                              return (
                                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                  <Avatar member={from} size={24} />
                                  <span style={{ flex: 1, fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: '#ccc' }}>
                                    {from.name.split(' ')[0]}
                                  </span>
                                  <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 13, fontWeight: 700, color: '#10b981' }}>
                                    {fmt(txn.amount)}
                                  </span>
                                  <button
                                    onClick={() => openSettle(txn)}
                                    style={{ padding: '4px 10px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 4, color: '#888', cursor: 'pointer', fontFamily: "'Space Mono', monospace", fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.05em' }}
                                  >
                                    Mark Paid
                                  </button>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}

            {/* Balance cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))', gap: 12, marginBottom: 36 }}>
              {members.map((m) => {
                const bal    = balances[m.id] || 0;
                const stats  = memberStats[m.id] || { paid: 0, share: 0 };
                const isOwed = bal > 0.01;
                const isOwing= bal < -0.01;
                const accent = isOwed ? '#10b981' : isOwing ? '#ef4444' : '#444';
                const isMe   = currentMember?.id === m.id;
                return (
                  <div
                    key={m.id}
                    style={{
                      background: isMe ? '#141414' : '#111',
                      border: `1px solid ${isMe ? '#ff550055' : isOwed ? '#10b98128' : isOwing ? '#ef444428' : 'rgba(255,255,255,0.06)'}`,
                      borderRadius: 8, padding: '20px 16px', textAlign: 'center',
                      position: 'relative',
                    }}
                  >
                    {isMe && (
                      <span style={{ position: 'absolute', top: 8, right: 8, fontFamily: "'Space Mono', monospace", fontSize: 8, color: '#ff5500', background: '#ff550018', padding: '2px 6px', borderRadius: 2, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                        You
                      </span>
                    )}
                    <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 10 }}>
                      <Avatar member={m} size={42} />
                    </div>
                    <div style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 600, fontSize: 14, color: '#e5e2e1' }}>
                      {m.name.split(' ')[0]}
                    </div>
                    <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 9, color: '#444', marginBottom: 12 }}>
                      {m.name.split(' ').slice(1).join(' ')}
                    </div>

                    {/* Net balance */}
                    <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 22, fontWeight: 700, color: accent }}>
                      {isOwed ? '+' : ''}{fmt(bal)}
                    </div>
                    <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 9, color: `${accent}99`, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 12 }}>
                      {isOwed ? 'is owed' : isOwing ? 'owes' : 'settled up'}
                    </div>

                    {/* Paid / Share breakdown */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', background: '#161616', borderRadius: 4, padding: '8px 10px' }}>
                      <div style={{ textAlign: 'left' }}>
                        <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 9, color: '#444', textTransform: 'uppercase' }}>Paid</div>
                        <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 11, color: '#aaa' }}>{fmt(stats.paid)}</div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 9, color: '#444', textTransform: 'uppercase' }}>Share</div>
                        <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 11, color: '#aaa' }}>{fmt(stats.share)}</div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Who owes whom */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <h3 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 22, color: '#fff', margin: 0, letterSpacing: '0.02em' }}>
                Who Owes Whom
              </h3>
              <button
                onClick={() => openSettle(null)}
                style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', background: '#10b98115', border: '1px solid #10b98135', borderRadius: 4, color: '#10b981', cursor: 'pointer', fontFamily: "'Space Mono', monospace", fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.05em' }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: 14 }}>payments</span>
                Record Payment
              </button>
            </div>

            {debtTxns.length === 0 ? (
              <div style={{ background: '#111', border: '1px solid #10b98128', borderRadius: 6, padding: '32px', textAlign: 'center', marginBottom: 36 }}>
                <span className="material-symbols-outlined" style={{ fontSize: 36, color: '#10b981', display: 'block', marginBottom: 8 }}>check_circle</span>
                <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 11, color: '#10b981' }}>All settled up!</div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 36 }}>
                {debtTxns.map((txn, i) => {
                  const fromMem = members.find((m) => m.id === txn.from);
                  const toMem   = members.find((m) => m.id === txn.to);
                  if (!fromMem || !toMem) return null;
                  const involvesMe = currentMember && (txn.from === currentMember.id || txn.to === currentMember.id);
                  return (
                    <div
                      key={i}
                      style={{ background: '#111', border: `1px solid ${involvesMe ? '#ff550033' : 'rgba(255,255,255,0.06)'}`, borderRadius: 6, padding: '14px 20px', display: 'flex', alignItems: 'center', gap: 16 }}
                    >
                      {/* From */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                        <Avatar member={fromMem} size={34} />
                        <div>
                          <div style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 600, fontSize: 14, color: '#e5e2e1', display: 'flex', alignItems: 'center', gap: 6 }}>
                            {currentMember?.id === fromMem.id ? 'You' : fromMem.name.split(' ')[0]}
                          </div>
                          <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 9, color: '#ef4444' }}>owes</div>
                        </div>
                      </div>

                      {/* Arrow + amount */}
                      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                        <span className="material-symbols-outlined" style={{ fontSize: 20, color: '#ff5500' }}>arrow_forward</span>
                        <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 15, fontWeight: 700, color: '#ff5500' }}>
                          {fmt(txn.amount)}
                        </span>
                      </div>

                      {/* To */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, justifyContent: 'flex-end', minWidth: 0 }}>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 600, fontSize: 14, color: '#e5e2e1' }}>
                            {currentMember?.id === toMem.id ? 'You' : toMem.name.split(' ')[0]}
                          </div>
                          <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 9, color: '#10b981' }}>receives</div>
                        </div>
                        <Avatar member={toMem} size={34} />
                      </div>

                      <button
                        onClick={() => openSettle(txn)}
                        style={{ marginLeft: 8, flexShrink: 0, padding: '8px 14px', background: '#10b98115', border: '1px solid #10b98135', borderRadius: 4, color: '#10b981', cursor: 'pointer', fontFamily: "'Space Mono', monospace", fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}
                      >
                        Settle
                      </button>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Settlement History */}
            {settlements.length > 0 && (
              <>
                <h3 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 22, color: '#fff', margin: '0 0 14px', letterSpacing: '0.02em' }}>
                  Settlement History
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {settlements.map((s) => {
                    const fromMem = members.find((m) => m.id === s.from_member);
                    const toMem   = members.find((m) => m.id === s.to_member);
                    return (
                      <div
                        key={s.id}
                        style={{ background: '#111', border: '1px solid rgba(255,255,255,0.04)', borderRadius: 6, padding: '11px 18px', display: 'flex', alignItems: 'center', gap: 10 }}
                      >
                        {fromMem && <Avatar member={fromMem} size={26} />}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: '#ccc' }}>
                            <span style={{ color: fromMem?.color || '#aaa', fontWeight: 600 }}>
                              {currentMember?.id === fromMem?.id ? 'You' : fromMem?.name.split(' ')[0] || '?'}
                            </span>
                            {' paid '}
                            <span style={{ color: toMem?.color || '#aaa', fontWeight: 600 }}>
                              {currentMember?.id === toMem?.id ? 'you' : toMem?.name.split(' ')[0] || '?'}
                            </span>
                          </span>
                          {s.notes && (
                            <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: '#555', fontStyle: 'italic', marginLeft: 8 }}>
                              — {s.notes}
                            </span>
                          )}
                        </div>
                        <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 13, fontWeight: 700, color: '#10b981', flexShrink: 0 }}>
                          {fmt(s.amount)}
                        </span>
                        <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, color: '#444', flexShrink: 0 }}>
                          {fmtDate(s.date)}
                        </span>
                        {toMem && <Avatar member={toMem} size={26} />}
                        <button
                          onClick={() => handleDeleteSettlement(s.id)}
                          style={{ background: 'none', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 4, padding: '5px', cursor: 'pointer', color: '#444', display: 'flex', alignItems: 'center', flexShrink: 0, transition: 'color 0.15s' }}
                          onMouseEnter={(e) => (e.currentTarget.style.color = '#ef4444')}
                          onMouseLeave={(e) => (e.currentTarget.style.color = '#444')}
                        >
                          <span className="material-symbols-outlined" style={{ fontSize: 13 }}>delete</span>
                        </button>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* ── Modals ── */}
      {showAddModal && (
        <AddExpenseModal
          members={members}
          expense={editingExpense}
          onSave={handleSaveExpense}
          onClose={() => { setShowAddModal(false); setEditingExpense(null); }}
        />
      )}
      {showSettleModal && (
        <SettleUpModal
          members={members}
          suggestion={settleSuggestion}
          onSave={handleSaveSettlement}
          onClose={() => { setShowSettleModal(false); setSettleSuggestion(null); }}
        />
      )}
    </div>
  );
}
