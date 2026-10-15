import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../../lib/supabase';
import AdminNavbar from '../../components/admin/AdminNavbar';
import PageTagline from '../../components/admin/PageTagline';
import { emptyQuip } from '../../lib/quips';
import Toast from '../../components/Toast';
import {
  STATUSES, STATUS_BY_VALUE, AMS_SLOTS, LOCATIONS, BRANDS, MATERIALS, FINISHES,
  SPOOL_TYPES, MATERIAL_GUIDE, spoolTare, guideFor, remainingGrams, fractionLeft,
  levelColor, isRunningLow, materialLabel, nextCode, isLightHex, formatGrams, formatKg,
} from '../../lib/filament';

const HEX_RE = /^#[0-9a-fA-F]{6}$/;
const today = () => new Date().toISOString().slice(0, 10);

const inputClass =
  'w-full bg-[#161616] border border-white/10 text-white font-body text-sm px-3 py-2.5 ' +
  'focus:outline-none focus:border-[#ff5500] transition-colors placeholder:text-stone-700 disabled:opacity-50';

const labelClass = 'font-technical text-[10px] text-stone-400 uppercase tracking-widest block mb-1';

/* ─── Small building blocks ───────────────────────────────────────── */

/** A spool seen side-on: flange ring, filament in its real colour, hub. */
function SpoolSwatch({ hex, size = 56, dim = false }) {
  const light = isLightHex(hex);
  return (
    <svg width={size} height={size} viewBox="0 0 56 56" className="flex-shrink-0" style={{ opacity: dim ? 0.35 : 1 }}>
      <circle cx="28" cy="28" r="27" fill="#1c1c1c" stroke="#2e2e2e" strokeWidth="1" />
      <circle cx="28" cy="28" r="22" fill={hex} stroke={light ? '#9ca3af' : 'none'} strokeWidth={light ? 1 : 0} />
      {/* winding texture */}
      <circle cx="28" cy="28" r="18" fill="none" stroke="rgba(0,0,0,0.12)" strokeWidth="1" />
      <circle cx="28" cy="28" r="14" fill="none" stroke="rgba(0,0,0,0.10)" strokeWidth="1" />
      <circle cx="28" cy="28" r="9" fill="#111" stroke="#2e2e2e" strokeWidth="1" />
      <circle cx="28" cy="28" r="3.5" fill="#080808" />
    </svg>
  );
}

function LevelBar({ spool, showLabel = true }) {
  const frac = fractionLeft(spool);
  const color = spool.status === 'empty' ? '#4b5563' : levelColor(frac);
  return (
    <div>
      <div className="h-1.5 bg-white/5 overflow-hidden">
        <div className="h-full transition-all duration-500" style={{ width: `${frac * 100}%`, background: color }} />
      </div>
      {showLabel && (
        <div className="flex justify-between mt-1.5 font-technical text-[10px] uppercase tracking-widest">
          <span className="text-stone-400">{formatGrams(remainingGrams(spool))}</span>
          <span style={{ color }}>{Math.round(frac * 100)}%</span>
        </div>
      )}
    </div>
  );
}

function StatusChip({ status }) {
  const s = STATUS_BY_VALUE[status] ?? STATUS_BY_VALUE.open;
  return (
    <span
      className="inline-flex items-center gap-1.5 font-technical text-[9px] uppercase tracking-widest px-2 py-1 whitespace-nowrap"
      style={{ background: `${s.color}1a`, color: s.color, borderLeft: `2px solid ${s.color}` }}
    >
      {s.label}
    </span>
  );
}

function StatCard({ icon, label, value, accent, tone }) {
  return (
    <div className="bg-[#111111] border border-white/10 p-4 md:p-5 flex flex-col gap-1.5">
      <span className="material-symbols-outlined" style={{ fontSize: 20, color: tone ?? '#78716c' }}>{icon}</span>
      <span className="text-2xl md:text-3xl leading-none" style={{ color: accent ? '#ff5500' : '#fff', fontFamily: "'Bebas Neue', sans-serif" }}>
        {value}
      </span>
      <span className="font-technical text-[10px] text-white/60 uppercase tracking-widest">{label}</span>
    </div>
  );
}

function Modal({ children, onClose, busy, wide }) {
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape' && !busy) onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, busy]);

  return (
    <motion.div
      className="fixed inset-0 z-[150] bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center sm:p-4"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      onClick={() => { if (!busy) onClose(); }}
    >
      <motion.div
        className={`w-full ${wide ? 'sm:max-w-2xl' : 'sm:max-w-sm'} max-h-[92vh] overflow-y-auto bg-[#111111] border border-white/10 p-5 sm:p-6`}
        initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 24 }}
        transition={{ duration: 0.22, ease: 'easeOut' }}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </motion.div>
    </motion.div>
  );
}

function ModalHeader({ title, subtitle, onClose, busy }) {
  return (
    <div className="flex items-start justify-between mb-5 gap-4">
      <div>
        <h2 className="text-white uppercase leading-none" style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.75rem' }}>{title}</h2>
        {subtitle && <p className="font-technical text-[10px] text-stone-500 uppercase tracking-widest mt-1">{subtitle}</p>}
      </div>
      <button onClick={() => { if (!busy) onClose(); }} disabled={busy} className="text-stone-500 hover:text-[#ff5500] transition-colors disabled:opacity-40">
        <span className="material-symbols-outlined" style={{ fontSize: 22 }}>close</span>
      </button>
    </div>
  );
}

function PrimaryButton({ children, ...props }) {
  return (
    <button
      {...props}
      className="flex-1 clip-parallelogram bg-[#ff5500] text-white font-technical text-xs uppercase tracking-widest py-3 px-6 flex items-center justify-center gap-2 hover:shadow-[0_0_20px_rgba(255,85,0,0.3)] transition-all disabled:opacity-60"
    >
      {children}
    </button>
  );
}

function SecondaryButton({ children, ...props }) {
  return (
    <button
      type="button"
      {...props}
      className="flex-1 py-3 px-4 font-technical text-xs uppercase tracking-widest bg-white/10 text-stone-300 hover:bg-white/20 transition-colors disabled:opacity-50"
    >
      {children}
    </button>
  );
}

function GuideBox({ material, finish }) {
  const g = guideFor(material, finish);
  if (!g) {
    return (
      <div className="bg-[#161616] p-4 font-body text-xs text-stone-500">
        No print guide for this material yet — set the material to see temperatures and drying.
      </div>
    );
  }
  const rows = [['Nozzle', `${g.nozzle}°C`], ['Bed', `${g.bed}°C`], ['Dry', g.dry], ['Enclosure', g.enclosure]];
  return (
    <div className="bg-[#161616] p-4 space-y-3">
      <p className="font-technical text-[10px] text-[#ff5500] uppercase tracking-widest">Print guide · {g.key}</p>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {rows.map(([k, v]) => (
          <div key={k}>
            <p className="font-technical text-[9px] text-stone-500 uppercase tracking-widest">{k}</p>
            <p className="font-technical text-xs text-white mt-0.5">{v}</p>
          </div>
        ))}
      </div>
      <p className="font-body text-xs text-stone-400 leading-relaxed">{g.notes}</p>
    </div>
  );
}

/* ─── AMS strip ───────────────────────────────────────────────────── */

function AmsStrip({ spools, onOpen }) {
  return (
    <section className="bg-[#111111] border border-white/10 p-4 md:p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-[#ff5500]" style={{ fontSize: 18 }}>print</span>
          <h2 className="font-technical text-[11px] text-white uppercase tracking-widest">Loaded in AMS · Bambu P1S</h2>
        </div>
      </div>
      <div className="flex md:grid md:grid-cols-4 gap-3 overflow-x-auto h-scroll -mx-1 px-1 pb-2 snap-x">
        {AMS_SLOTS.map((slot, i) => {
          const spool = spools.find((s) => s.location === slot && s.status !== 'empty');
          if (!spool) {
            return (
              <div key={slot} className="min-w-[200px] md:min-w-0 snap-start border border-dashed border-white/15 p-4 flex items-center gap-3">
                <div className="w-12 h-12 border border-dashed border-white/15 rounded-full flex items-center justify-center font-technical text-xs text-stone-600">{i + 1}</div>
                <div>
                  <p className="font-technical text-[10px] text-stone-500 uppercase tracking-widest">Slot {i + 1}</p>
                  <p className="font-body text-sm text-stone-600">Empty</p>
                </div>
              </div>
            );
          }
          return (
            <button
              key={slot}
              onClick={() => onOpen(spool)}
              className="min-w-[200px] md:min-w-0 snap-start text-left bg-[#161616] hover:bg-[#1c1c1c] p-4 transition-colors group"
              style={{ borderTop: `2px solid ${spool.hex}` }}
            >
              <div className="flex items-center gap-3 mb-3">
                <SpoolSwatch hex={spool.hex} size={48} />
                <div className="min-w-0">
                  <p className="font-technical text-[10px] text-stone-500 uppercase tracking-widest">Slot {i + 1}</p>
                  <p className="font-body text-sm text-white truncate group-hover:text-[#ff7733] transition-colors">{spool.color_name}</p>
                  <p className="font-technical text-[10px] text-stone-400 truncate">{materialLabel(spool)}</p>
                </div>
              </div>
              <LevelBar spool={spool} />
            </button>
          );
        })}
      </div>
    </section>
  );
}

/* ─── Breakdown ───────────────────────────────────────────────────── */

function Breakdown({ spools }) {
  const active = spools.filter((s) => s.status !== 'empty');

  const byMaterial = useMemo(() => {
    const m = new Map();
    for (const s of active) {
      const key = s.material || 'Unknown';
      const e = m.get(key) ?? { key, spools: 0, sealed: 0, grams: 0 };
      e.spools += 1;
      if (s.status === 'sealed') e.sealed += 1;
      e.grams += remainingGrams(s);
      m.set(key, e);
    }
    return [...m.values()].sort((a, b) => b.grams - a.grams);
  }, [active]);

  const plaByFinish = useMemo(() => {
    const m = new Map();
    for (const s of active.filter((x) => x.material === 'PLA')) {
      const key = s.finish && s.finish !== '—' ? s.finish : 'Unspecified';
      const e = m.get(key) ?? { key, spools: 0, grams: 0 };
      e.spools += 1;
      e.grams += remainingGrams(s);
      m.set(key, e);
    }
    return [...m.values()].sort((a, b) => b.grams - a.grams);
  }, [active]);

  const maxG = Math.max(1, ...byMaterial.map((r) => r.grams));
  const maxF = Math.max(1, ...plaByFinish.map((r) => r.grams));

  const Row = ({ label, grams, max, meta }) => (
    <div className="space-y-1">
      <div className="flex justify-between items-baseline gap-3">
        <span className="font-body text-sm text-white">{label}</span>
        <span className="font-technical text-[10px] text-stone-400 whitespace-nowrap">{meta} · {formatKg(grams)}</span>
      </div>
      <div className="h-1 bg-white/5">
        <div className="h-full bg-[#ff5500]" style={{ width: `${(grams / max) * 100}%` }} />
      </div>
    </div>
  );

  return (
    <section className="grid grid-cols-1 md:grid-cols-2 gap-3">
      <div className="bg-[#111111] border border-white/10 p-4 md:p-5 space-y-3">
        <h3 className="font-technical text-[11px] text-white uppercase tracking-widest mb-1">By material</h3>
        {byMaterial.map((r) => (
          <Row key={r.key} label={r.key} grams={r.grams} max={maxG}
               meta={`${r.spools} spool${r.spools !== 1 ? 's' : ''}${r.sealed ? ` · ${r.sealed} sealed` : ''}`} />
        ))}
      </div>
      <div className="bg-[#111111] border border-white/10 p-4 md:p-5 space-y-3">
        <h3 className="font-technical text-[11px] text-white uppercase tracking-widest mb-1">PLA by finish</h3>
        {plaByFinish.length === 0
          ? <p className="font-body text-sm text-stone-500">No PLA in stock.</p>
          : plaByFinish.map((r) => (
            <Row key={r.key} label={r.key} grams={r.grams} max={maxF} meta={`${r.spools} spool${r.spools !== 1 ? 's' : ''}`} />
          ))}
      </div>
    </section>
  );
}

/* ─── Spool card ──────────────────────────────────────────────────── */

function SpoolCard({ spool, index, onOpen, onWeigh, onMove, onMarkEmpty }) {
  const empty = spool.status === 'empty';
  const low = isRunningLow(spool);
  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.97 }}
      transition={{ duration: 0.18, delay: Math.min(index * 0.015, 0.25) }}
      className={`bg-[#111111] border ${low ? 'border-red-500/40' : 'border-white/10'} hover:border-white/25 transition-colors flex flex-col`}
    >
      <button onClick={() => onOpen(spool)} className="text-left p-4 flex gap-4 items-start flex-1">
        <SpoolSwatch hex={spool.hex} size={64} dim={empty} />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <h3 className={`font-body text-base leading-tight ${empty ? 'text-stone-500 line-through' : 'text-white'}`}>
              {spool.color_name}
            </h3>
            <span className="font-technical text-[10px] text-stone-500 flex-shrink-0">{spool.code}</span>
          </div>
          <p className="font-technical text-[11px] text-stone-400 mt-1 truncate">
            {spool.brand || 'Unknown'} · {materialLabel(spool)}
          </p>
          <div className="flex flex-wrap items-center gap-1.5 mt-2">
            <StatusChip status={spool.status} />
            <span className="font-technical text-[9px] uppercase tracking-widest text-stone-400 bg-white/5 px-2 py-1 inline-flex items-center gap-1">
              <span className="material-symbols-outlined" style={{ fontSize: 11 }}>location_on</span>
              {spool.location || '—'}
            </span>
            {spool.needs_check && (
              <span className="font-technical text-[9px] uppercase tracking-widest text-yellow-300 bg-yellow-400/10 px-2 py-1 inline-flex items-center gap-1">
                <span className="material-symbols-outlined" style={{ fontSize: 11 }}>help</span>
                Needs check
              </span>
            )}
          </div>
        </div>
      </button>

      <div className="px-4 pb-3">
        <LevelBar spool={spool} />
        <div className="flex items-center justify-between mt-2 font-technical text-[9px] uppercase tracking-widest text-stone-600">
          <span className="truncate">
            <span className="normal-case tracking-normal">{spool.hex.toUpperCase()}</span>
            {spool.hex_is_estimate && <span className="text-stone-500"> · approx. colour</span>}
          </span>
          {spool.filament_code && <span>#{spool.filament_code}</span>}
        </div>
      </div>

      <div className="grid grid-cols-3 border-t border-white/5">
        {[
          { icon: 'scale', label: 'Weigh', onClick: () => onWeigh(spool) },
          { icon: 'swap_horiz', label: 'Move', onClick: () => onMove(spool) },
          empty
            ? { icon: 'edit', label: 'Edit', onClick: () => onOpen(spool) }
            : { icon: 'block', label: 'Empty', onClick: () => onMarkEmpty(spool) },
        ].map((a) => (
          <button
            key={a.label}
            onClick={a.onClick}
            className="py-2.5 flex items-center justify-center gap-1.5 font-technical text-[10px] uppercase tracking-widest text-stone-400 hover:text-[#ff5500] hover:bg-white/[0.03] transition-colors"
          >
            <span className="material-symbols-outlined" style={{ fontSize: 15 }}>{a.icon}</span>
            {a.label}
          </button>
        ))}
      </div>
    </motion.article>
  );
}

/* ─── Weigh modal ─────────────────────────────────────────────────── */

function WeighModal({ spool, onClose, onSave }) {
  const [reading, setReading] = useState(spool.scale_reading_g != null ? String(spool.scale_reading_g) : '');
  const [saving, setSaving] = useState(false);
  const ref = useRef(null);
  useEffect(() => { const t = setTimeout(() => ref.current?.focus(), 80); return () => clearTimeout(t); }, []);

  const tare = spoolTare(spool.spool_type);
  const valid = reading !== '' && Number(reading) >= 0;
  const preview = valid ? { ...spool, scale_reading_g: Number(reading) } : spool;

  const submit = async (e) => {
    e.preventDefault();
    if (!valid) return;
    setSaving(true);
    const patch = { scale_reading_g: Number(reading) };
    // A sealed spool that's been weighed has been opened.
    if (spool.status === 'sealed') patch.status = 'open';
    await onSave(spool, patch, `${spool.color_name} weighed: ${formatGrams(remainingGrams(preview))} left.`);
    setSaving(false);
  };

  return (
    <Modal onClose={onClose} busy={saving}>
      <ModalHeader title="Weigh spool" subtitle={`${spool.code} · ${spool.color_name}`} onClose={onClose} busy={saving} />
      <form onSubmit={submit} className="space-y-4">
        <div>
          <label className={labelClass}>Scale reading (g) — spool and all</label>
          <input ref={ref} type="number" inputMode="decimal" min="0" value={reading}
                 onChange={(e) => setReading(e.target.value)} className={inputClass} placeholder="e.g. 742" disabled={saving} />
        </div>
        <div className="bg-[#161616] p-4 space-y-3">
          <div className="grid grid-cols-3 gap-2 text-center font-technical">
            <div>
              <p className="text-[9px] text-stone-500 uppercase tracking-widest">Reading</p>
              <p className="text-sm text-white mt-1">{valid ? formatGrams(Number(reading)) : '—'}</p>
            </div>
            <div>
              <p className="text-[9px] text-stone-500 uppercase tracking-widest">− Empty spool</p>
              <p className="text-sm text-white mt-1">{formatGrams(tare)}</p>
            </div>
            <div>
              <p className="text-[9px] text-stone-500 uppercase tracking-widest">= Filament</p>
              <p className="text-sm mt-1" style={{ color: levelColor(fractionLeft(preview)) }}>{formatGrams(remainingGrams(preview))}</p>
            </div>
          </div>
          <LevelBar spool={preview} showLabel={false} />
          <p className="font-body text-[11px] text-stone-500 leading-relaxed">
            Empty-spool weight for <span className="text-stone-300">{spool.spool_type || 'unknown spool'}</span> is approximate ({tare} g).
            {spool.status === 'sealed' && ' Saving will mark this spool as Open.'}
          </p>
        </div>
        <div className="flex gap-3">
          <SecondaryButton onClick={onClose} disabled={saving}>Cancel</SecondaryButton>
          <PrimaryButton type="submit" disabled={saving || !valid}>{saving ? 'Saving…' : 'Save reading'}</PrimaryButton>
        </div>
      </form>
    </Modal>
  );
}

/* ─── Move modal ──────────────────────────────────────────────────── */

function MoveModal({ spool, spools, onClose, onMove }) {
  const [saving, setSaving] = useState(false);

  const pick = async (location) => {
    if (location === spool.location) { onClose(); return; }
    setSaving(true);
    await onMove(spool, location);
    setSaving(false);
  };

  return (
    <Modal onClose={onClose} busy={saving}>
      <ModalHeader title="Move spool" subtitle={`${spool.code} · ${spool.color_name} · now in ${spool.location || '—'}`} onClose={onClose} busy={saving} />
      <div className="space-y-4">
        <div>
          <p className={labelClass}>AMS</p>
          <div className="grid grid-cols-2 gap-2">
            {AMS_SLOTS.map((slot, i) => {
              const occupant = spools.find((s) => s.location === slot && s.status !== 'empty' && s.id !== spool.id);
              const current = spool.location === slot;
              return (
                <button key={slot} onClick={() => pick(slot)} disabled={saving}
                  className={`p-3 text-left border transition-colors disabled:opacity-50 ${current ? 'border-[#ff5500] bg-[#ff5500]/10' : 'border-white/10 bg-[#161616] hover:border-white/30'}`}>
                  <p className="font-technical text-[10px] text-white uppercase tracking-widest">Slot {i + 1}</p>
                  {occupant ? (
                    <p className="font-body text-[11px] text-stone-400 mt-1 flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 inline-block border border-white/20" style={{ background: occupant.hex }} />
                      <span className="truncate">{occupant.color_name}</span>
                    </p>
                  ) : (
                    <p className="font-body text-[11px] text-stone-600 mt-1">Free</p>
                  )}
                </button>
              );
            })}
          </div>
          <p className="font-body text-[11px] text-stone-500 mt-2">
            Picking an occupied slot swaps them: the spool already there moves to Shelf as Open.
          </p>
        </div>
        <div>
          <p className={labelClass}>Storage</p>
          <div className="grid grid-cols-2 gap-2">
            {LOCATIONS.filter((l) => !AMS_SLOTS.includes(l)).map((loc) => (
              <button key={loc} onClick={() => pick(loc)} disabled={saving}
                className={`p-3 text-left font-technical text-[10px] uppercase tracking-widest border transition-colors disabled:opacity-50 ${spool.location === loc ? 'border-[#ff5500] bg-[#ff5500]/10 text-white' : 'border-white/10 bg-[#161616] text-stone-300 hover:border-white/30'}`}>
                {loc}
              </button>
            ))}
          </div>
        </div>
      </div>
    </Modal>
  );
}

/* ─── Add / edit modal ────────────────────────────────────────────── */

const BLANK = {
  status: 'sealed', location: 'Shelf', brand: 'Bambu Lab', material: 'PLA', finish: 'Basic',
  color_name: '', hex: '#ffffff', hex_is_estimate: false, filament_code: '', spool_type: 'Refill (no spool)',
  net_weight_g: '1000', scale_reading_g: '', needs_check: false, notes: '', date_added: today(), last_dried: '',
};

function Select({ value, onChange, options, disabled }) {
  return (
    <select value={value ?? ''} onChange={(e) => onChange(e.target.value)} disabled={disabled} className={inputClass + ' appearance-none cursor-pointer'}>
      {options.map((o) => typeof o === 'string'
        ? <option key={o} value={o}>{o}</option>
        : <option key={o.value} value={o.value}>{o.label ?? o.value}</option>)}
    </select>
  );
}

function SpoolFormModal({ spool, spools, onClose, onSaved, onDelete }) {
  const isEdit = Boolean(spool);
  const [form, setForm] = useState(() => isEdit
    ? Object.fromEntries(Object.keys(BLANK).map((k) => [k, spool[k] == null ? '' : spool[k]]))
    : { ...BLANK });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);

  const set = (k) => (v) => setForm((f) => ({ ...f, [k]: v?.target ? (v.target.type === 'checkbox' ? v.target.checked : v.target.value) : v }));

  const preview = { ...form, scale_reading_g: form.scale_reading_g === '' ? null : Number(form.scale_reading_g), net_weight_g: Number(form.net_weight_g) || 0 };

  const validate = () => {
    const e = {};
    if (!form.color_name.trim()) e.color_name = 'Colour name is required.';
    if (!HEX_RE.test(form.hex)) e.hex = 'Enter a hex colour like #0078BF.';
    if (!(Number(form.net_weight_g) > 0)) e.net_weight_g = 'Net weight must be above 0.';
    if (form.scale_reading_g !== '' && !(Number(form.scale_reading_g) >= 0)) e.scale_reading_g = 'Enter a weight in grams.';
    return e;
  };

  const submit = async (ev) => {
    ev.preventDefault();
    const e = validate();
    if (Object.keys(e).length) { setErrors(e); return; }
    setErrors({});
    setSaving(true);
    setSaveError(null);

    const row = {
      status: form.status,
      location: form.location || null,
      brand: form.brand || null,
      material: form.material || null,
      finish: form.finish || null,
      color_name: form.color_name.trim(),
      hex: form.hex.toUpperCase(),
      hex_is_estimate: Boolean(form.hex_is_estimate),
      filament_code: String(form.filament_code).trim() || null,
      spool_type: form.spool_type || null,
      net_weight_g: Number(form.net_weight_g),
      scale_reading_g: form.scale_reading_g === '' ? null : Number(form.scale_reading_g),
      needs_check: Boolean(form.needs_check),
      notes: String(form.notes).trim() || null,
      date_added: form.date_added || null,
      last_dried: form.last_dried || null,
    };

    const query = isEdit
      ? supabase.from('filament_spools').update(row).eq('id', spool.id)
      : supabase.from('filament_spools').insert({
          ...row,
          code: nextCode(spools),
          sort_order: spools.reduce((m, s) => Math.max(m, s.sort_order ?? 0), 0) + 1,
        });
    const { data, error } = await query.select().single();
    setSaving(false);
    if (error) { setSaveError(error.message); return; }
    onSaved(data, isEdit ? `${data.color_name} updated.` : `${data.color_name} added as ${data.code}.`);
  };

  return (
    <Modal onClose={onClose} busy={saving} wide>
      <ModalHeader
        title={isEdit ? form.color_name || 'Edit spool' : 'Add spool'}
        subtitle={isEdit ? `${spool.code}${spool.filament_code ? ` · Bambu #${spool.filament_code}` : ''}` : `Will be ${nextCode(spools)}`}
        onClose={onClose} busy={saving}
      />

      {isEdit && form.needs_check && (
        <div className="mb-5 bg-yellow-400/10 border-l-2 border-yellow-400 p-3 flex items-center justify-between gap-3">
          <p className="font-body text-xs text-yellow-200">Flagged to double-check{spool.notes ? ` — ${spool.notes}` : '.'}</p>
          <button type="button" onClick={() => set('needs_check')(false)}
                  className="font-technical text-[10px] uppercase tracking-widest text-yellow-300 hover:text-white whitespace-nowrap">
            Mark checked
          </button>
        </div>
      )}

      <form onSubmit={submit} className="space-y-5" noValidate>
        {/* Colour */}
        <div className="flex gap-4 items-start">
          <SpoolSwatch hex={HEX_RE.test(form.hex) ? form.hex : '#333333'} size={84} />
          <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Colour name *</label>
              <input value={form.color_name} onChange={set('color_name')} className={inputClass} placeholder="e.g. Marine Blue" disabled={saving} autoFocus={!isEdit} />
              {errors.color_name && <p className="font-technical text-[10px] text-red-400 mt-1">{errors.color_name}</p>}
            </div>
            <div>
              <label className={labelClass}>Hex *</label>
              <div className="flex gap-2">
                <label className="w-11 flex-shrink-0 border border-white/10 cursor-pointer relative overflow-hidden" title="Pick a colour">
                  <input type="color" value={HEX_RE.test(form.hex) ? form.hex : '#ffffff'} onChange={set('hex')} disabled={saving}
                         className="absolute inset-0 opacity-0 cursor-pointer w-full h-full" />
                  <div className="w-full h-full" style={{ background: HEX_RE.test(form.hex) ? form.hex : '#ffffff' }} />
                </label>
                <input value={form.hex} onChange={set('hex')} maxLength={7} className={inputClass + ' uppercase'} disabled={saving} />
              </div>
              {errors.hex && <p className="font-technical text-[10px] text-red-400 mt-1">{errors.hex}</p>}
            </div>
            <label className="sm:col-span-2 flex items-center gap-2 cursor-pointer select-none">
              <input type="checkbox" checked={Boolean(form.hex_is_estimate)} onChange={set('hex_is_estimate')} disabled={saving} className="accent-[#ff5500]" />
              <span className="font-body text-xs text-stone-400">Colour is approximate (no official code)</span>
            </label>
          </div>
        </div>

        {/* Identity */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div><label className={labelClass}>Brand</label><Select value={form.brand} onChange={set('brand')} options={BRANDS} disabled={saving} /></div>
          <div><label className={labelClass}>Material</label><Select value={form.material} onChange={set('material')} options={MATERIALS} disabled={saving} /></div>
          <div><label className={labelClass}>Finish</label><Select value={form.finish} onChange={set('finish')} options={FINISHES} disabled={saving} /></div>
          <div>
            <label className={labelClass}>Filament code</label>
            <input value={form.filament_code} onChange={set('filament_code')} className={inputClass} placeholder="e.g. 11600" disabled={saving} />
          </div>
        </div>

        {/* Where */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div><label className={labelClass}>Status</label><Select value={form.status} onChange={set('status')} options={STATUSES} disabled={saving} /></div>
          <div><label className={labelClass}>Location</label><Select value={form.location} onChange={set('location')} options={LOCATIONS} disabled={saving} /></div>
          <div className="col-span-2"><label className={labelClass}>Spool type</label>
            <Select value={form.spool_type} onChange={set('spool_type')} options={SPOOL_TYPES.map((t) => ({ value: t.value, label: `${t.value} · ${t.tare} g` }))} disabled={saving} />
          </div>
        </div>

        {/* Weight */}
        <div className="bg-[#161616] p-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Net weight (g)</label>
              <input type="number" min="1" value={form.net_weight_g} onChange={set('net_weight_g')} className={inputClass + ' bg-[#111111]'} disabled={saving} />
              {errors.net_weight_g && <p className="font-technical text-[10px] text-red-400 mt-1">{errors.net_weight_g}</p>}
            </div>
            <div>
              <label className={labelClass}>Scale reading (g)</label>
              <input type="number" min="0" value={form.scale_reading_g} onChange={set('scale_reading_g')} className={inputClass + ' bg-[#111111]'} placeholder="Not weighed" disabled={saving} />
              {errors.scale_reading_g && <p className="font-technical text-[10px] text-red-400 mt-1">{errors.scale_reading_g}</p>}
            </div>
          </div>
          <LevelBar spool={preview} />
          <p className="font-body text-[11px] text-stone-500">
            {preview.scale_reading_g == null
              ? (form.status === 'empty' ? 'Empty spools count as 0 g.' : 'Not weighed yet — counted as full net weight.')
              : `Reading minus ${spoolTare(form.spool_type)} g empty spool.`}
          </p>
        </div>

        {/* Dates + notes */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelClass}>Date added</label>
            <input type="date" value={form.date_added} onChange={set('date_added')} className={inputClass} disabled={saving} />
          </div>
          <div>
            <label className={labelClass}>Last dried</label>
            <div className="flex gap-2">
              <input type="date" value={form.last_dried} onChange={set('last_dried')} className={inputClass} disabled={saving} />
              <button type="button" onClick={() => set('last_dried')(today())} disabled={saving}
                      className="px-3 font-technical text-[9px] uppercase tracking-widest bg-white/10 text-stone-300 hover:bg-white/20 whitespace-nowrap">
                Today
              </button>
            </div>
          </div>
        </div>
        <div>
          <label className={labelClass}>Notes</label>
          <textarea rows={2} value={form.notes} onChange={set('notes')} className={inputClass + ' resize-none'} disabled={saving} />
        </div>
        <label className="flex items-center gap-2 cursor-pointer select-none">
          <input type="checkbox" checked={Boolean(form.needs_check)} onChange={set('needs_check')} disabled={saving} className="accent-[#ff5500]" />
          <span className="font-body text-xs text-stone-400">Needs check (details not confirmed)</span>
        </label>

        <GuideBox material={form.material} finish={form.finish} />

        {saveError && (
          <div className="bg-red-950/40 border border-red-800/60 p-3">
            <p className="font-body text-red-400 text-sm">{saveError}</p>
          </div>
        )}

        <div className="flex gap-3 pt-1">
          {isEdit && (
            <button type="button" onClick={() => onDelete(spool)} disabled={saving}
                    className="px-4 py-3 font-technical text-xs uppercase tracking-widest text-stone-500 hover:text-red-400 transition-colors disabled:opacity-50">
              Delete
            </button>
          )}
          <SecondaryButton onClick={onClose} disabled={saving}>Cancel</SecondaryButton>
          <PrimaryButton type="submit" disabled={saving}>{saving ? 'Saving…' : isEdit ? 'Save changes' : 'Add spool'}</PrimaryButton>
        </div>
      </form>
    </Modal>
  );
}

function DeleteModal({ spool, onClose, onConfirm }) {
  const [busy, setBusy] = useState(false);
  return (
    <Modal onClose={onClose} busy={busy}>
      <ModalHeader title="Delete spool" onClose={onClose} busy={busy} />
      <p className="font-body text-stone-400 text-sm leading-relaxed mb-5">
        Delete <span className="text-white">{spool.code} · {spool.color_name}</span> from inventory? If it's just used up,
        mark it Empty instead so it stays in the history.
      </p>
      <div className="flex gap-3">
        <SecondaryButton onClick={onClose} disabled={busy}>Cancel</SecondaryButton>
        <button
          onClick={async () => { setBusy(true); await onConfirm(spool); setBusy(false); }}
          disabled={busy}
          className="flex-1 py-3 bg-red-600 text-white font-technical text-xs uppercase tracking-widest hover:bg-red-500 transition-colors disabled:opacity-60"
        >
          {busy ? 'Deleting…' : 'Delete'}
        </button>
      </div>
    </Modal>
  );
}

/* ─── Material guide ──────────────────────────────────────────────── */

function MaterialGuide() {
  const [open, setOpen] = useState(false);
  return (
    <section className="bg-[#111111] border border-white/10">
      <button onClick={() => setOpen((o) => !o)} className="w-full flex items-center justify-between p-4 md:p-5 text-left">
        <span className="flex items-center gap-2">
          <span className="material-symbols-outlined text-[#ff5500]" style={{ fontSize: 18 }}>menu_book</span>
          <span className="font-technical text-[11px] text-white uppercase tracking-widest">Material guide</span>
        </span>
        <span className="material-symbols-outlined text-stone-500 transition-transform" style={{ fontSize: 20, transform: open ? 'rotate(180deg)' : 'none' }}>expand_more</span>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden">
            <div className="overflow-x-auto px-4 md:px-5 pb-5">
              <table className="w-full min-w-[640px]">
                <thead>
                  <tr className="border-b border-white/10">
                    {['Material', 'Nozzle °C', 'Bed °C', 'Dry', 'Enclosure', 'Notes'].map((h) => (
                      <th key={h} className="py-2 pr-4 text-left font-technical text-[9px] uppercase tracking-widest text-stone-500">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {MATERIAL_GUIDE.map((g) => (
                    <tr key={g.key} className="border-b border-white/5 align-top">
                      <td className="py-2.5 pr-4 font-body text-sm text-white whitespace-nowrap">{g.key}</td>
                      <td className="py-2.5 pr-4 font-technical text-xs text-stone-300 whitespace-nowrap">{g.nozzle}</td>
                      <td className="py-2.5 pr-4 font-technical text-xs text-stone-300 whitespace-nowrap">{g.bed}</td>
                      <td className="py-2.5 pr-4 font-technical text-xs text-stone-300 whitespace-nowrap">{g.dry}</td>
                      <td className="py-2.5 pr-4 font-technical text-xs text-stone-300 whitespace-nowrap">{g.enclosure}</td>
                      <td className="py-2.5 font-body text-xs text-stone-400">{g.notes}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}

/* ─── Page ────────────────────────────────────────────────────────── */

const SORTS = [
  { value: 'default', label: 'Default order' },
  { value: 'remaining', label: 'Least remaining' },
  { value: 'colour', label: 'Colour A–Z' },
  { value: 'recent', label: 'Recently updated' },
];

export default function AdminInventory() {
  const [spools,  setSpools]  = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);
  const [toast,   setToast]   = useState(null);

  const [search,     setSearch]     = useState('');
  const [statusF,    setStatusF]    = useState('all');
  const [materialF,  setMaterialF]  = useState('all');
  const [locationF,  setLocationF]  = useState('all');
  const [checkOnly,  setCheckOnly]  = useState(false);
  const [showEmpty,  setShowEmpty]  = useState(false);
  const [sort,       setSort]       = useState('default');

  const [editing,  setEditing]  = useState(undefined); // undefined = closed, null = new, object = edit
  const [weighing, setWeighing] = useState(null);
  const [moving,   setMoving]   = useState(null);
  const [deleting, setDeleting] = useState(null);

  const showToast = useCallback((message, type = 'success') => setToast({ message, type }), []);

  const querySpools = () => supabase.from('filament_spools').select('*').order('sort_order', { ascending: true });

  const applySpools = ({ data, error }) => {
    setLoading(false);
    if (error) { setError(error.message); return; }
    setError(null);
    setSpools(data ?? []);
  };

  const fetchSpools = () => { setLoading(true); querySpools().then(applySpools); };

  useEffect(() => {
    let ignore = false;
    querySpools().then((res) => { if (!ignore) applySpools(res); });
    return () => { ignore = true; };
  }, []);

  const replace = (row) => setSpools((list) => {
    const i = list.findIndex((s) => s.id === row.id);
    return i === -1 ? [...list, row] : list.map((s) => (s.id === row.id ? row : s));
  });

  const update = useCallback(async (spool, patch, message) => {
    const { data, error } = await supabase.from('filament_spools').update(patch).eq('id', spool.id).select().single();
    if (error) { showToast('Could not save: ' + error.message, 'error'); return false; }
    replace(data);
    if (message) showToast(message);
    return true;
  }, [showToast]);

  /* Moving into an occupied AMS slot bumps the occupant to the shelf. */
  const move = async (spool, location) => {
    const intoAms = AMS_SLOTS.includes(location);
    const occupant = intoAms && spools.find((s) => s.location === location && s.status !== 'empty' && s.id !== spool.id);
    if (occupant) {
      const ok = await update(occupant, { location: 'Shelf', status: 'open' });
      if (!ok) return;
    }
    const patch = { location };
    if (intoAms) patch.status = 'in_ams';
    else if (spool.status === 'in_ams') patch.status = 'open';
    const ok = await update(spool, patch,
      occupant ? `${spool.color_name} → ${location}; ${occupant.color_name} → Shelf.` : `${spool.color_name} → ${location}.`);
    if (ok) setMoving(null);
  };

  const remove = async (spool) => {
    const { error } = await supabase.from('filament_spools').delete().eq('id', spool.id);
    if (error) { showToast('Could not delete: ' + error.message, 'error'); return; }
    setSpools((list) => list.filter((s) => s.id !== spool.id));
    setDeleting(null);
    setEditing(undefined);
    showToast(`${spool.code} deleted.`);
  };

  /* ── Derived ── */
  const active = useMemo(() => spools.filter((s) => s.status !== 'empty'), [spools]);
  const stats = useMemo(() => ({
    total:  active.length,
    sealed: active.filter((s) => s.status === 'sealed').length,
    inAms:  active.filter((s) => s.status === 'in_ams').length,
    open:   active.filter((s) => s.status === 'open').length,
    low:    active.filter((s) => isRunningLow(s) || s.status === 'low').length,
    grams:  active.reduce((sum, s) => sum + remainingGrams(s), 0),
    check:  spools.filter((s) => s.needs_check).length,
    empty:  spools.length - active.length,
  }), [spools, active]);

  const statusCounts = useMemo(() => {
    const c = { all: active.length };
    for (const s of STATUSES) c[s.value] = spools.filter((x) => x.status === s.value).length;
    return c;
  }, [spools, active]);

  const materialsInUse = useMemo(() => [...new Set(spools.map((s) => s.material || 'Unknown'))].sort(), [spools]);
  const locationsInUse = useMemo(() => LOCATIONS.filter((l) => spools.some((s) => s.location === l)), [spools]);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    let list = spools.filter((s) => {
      if (statusF === 'all' ? (!showEmpty && s.status === 'empty') : s.status !== statusF) return false;
      if (materialF !== 'all' && (s.material || 'Unknown') !== materialF) return false;
      if (locationF !== 'all' && s.location !== locationF) return false;
      if (checkOnly && !s.needs_check) return false;
      if (q) {
        const hay = [s.code, s.color_name, s.brand, s.material, s.finish, s.location, s.filament_code, s.notes, s.hex].join(' ').toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
    if (sort === 'remaining') list = [...list].sort((a, b) => fractionLeft(a) - fractionLeft(b));
    if (sort === 'colour') list = [...list].sort((a, b) => a.color_name.localeCompare(b.color_name));
    if (sort === 'recent') list = [...list].sort((a, b) => String(b.updated_at).localeCompare(String(a.updated_at)));
    return list;
  }, [spools, search, statusF, materialF, locationF, checkOnly, showEmpty, sort]);

  const filtersActive = search || statusF !== 'all' || materialF !== 'all' || locationF !== 'all' || checkOnly;
  const clearFilters = () => { setSearch(''); setStatusF('all'); setMaterialF('all'); setLocationF('all'); setCheckOnly(false); };

  const chip = (active_) =>
    `px-3 py-1.5 font-technical text-[10px] uppercase tracking-widest whitespace-nowrap transition-colors border ${
      active_ ? 'bg-[#ff5500] border-[#ff5500] text-white' : 'bg-[#111111] border-white/10 text-stone-400 hover:text-white hover:border-white/30'}`;

  return (
    <div className="min-h-screen bg-[#080808] text-white">
      <AdminNavbar />

      <div className="max-w-7xl mx-auto px-4 py-8 space-y-6">
        {/* Header */}
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="uppercase text-white" style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '3rem', lineHeight: 1 }}>
              Inventory
            </h1>
            <p className="mt-1 font-technical text-[10px] text-stone-500 uppercase tracking-widest">
              {loading ? 'Loading…' : `${stats.total} spools · ${formatKg(stats.grams)} on hand`}
            </p>
            <PageTagline />
          </div>
          <button
            onClick={() => setEditing(null)}
            className="clip-parallelogram bg-[#ff5500] text-white font-technical text-xs uppercase tracking-widest px-8 py-3 flex items-center gap-2 hover:shadow-[0_0_20px_rgba(255,85,0,0.3)] transition-all"
          >
            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>add</span>
            Add spool
          </button>
        </div>

        {error && (
          <div className="bg-red-950/40 border border-red-800/60 p-4 flex items-center gap-3">
            <span className="material-symbols-outlined text-red-500" style={{ fontSize: 18 }}>error</span>
            <p className="font-body text-red-400 text-sm flex-1">{error}</p>
            <button onClick={fetchSpools} className="font-technical text-xs uppercase tracking-widest text-red-400 hover:text-red-300 underline">Retry</button>
          </div>
        )}

        {loading ? (
          <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
              {Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-28 bg-[#111111] border border-white/10 animate-pulse" />)}
            </div>
            <div className="h-40 bg-[#111111] border border-white/10 animate-pulse" />
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
              {Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-52 bg-[#111111] border border-white/10 animate-pulse" />)}
            </div>
          </div>
        ) : (
          <>
            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
              <StatCard icon="inventory" label="Spools" value={stats.total} />
              <StatCard icon="lock" label="Sealed" value={stats.sealed} tone="#60a5fa" />
              <StatCard icon="print" label="In AMS" value={stats.inAms} tone="#34d399" />
              <StatCard icon="lock_open" label="Open" value={stats.open} tone="#fbbf24" />
              <StatCard icon="warning" label="Running low" value={stats.low} tone="#f87171" accent={stats.low > 0} />
              <StatCard icon="scale" label="Filament on hand" value={formatKg(stats.grams)} accent />
            </div>

            {stats.check > 0 && !checkOnly && (
              <button
                onClick={() => { clearFilters(); setCheckOnly(true); }}
                className="w-full text-left bg-yellow-400/[0.06] border-l-2 border-yellow-400 px-4 py-3 flex items-center gap-3 hover:bg-yellow-400/10 transition-colors"
              >
                <span className="material-symbols-outlined text-yellow-300" style={{ fontSize: 18 }}>help</span>
                <span className="font-body text-sm text-yellow-100 flex-1">
                  {stats.check} spool{stats.check !== 1 ? 's have' : ' has'} details to confirm (brand, material or colour name).
                </span>
                <span className="font-technical text-[10px] uppercase tracking-widest text-yellow-300">Review →</span>
              </button>
            )}

            <AmsStrip spools={spools} onOpen={(s) => setEditing(s)} />
            <Breakdown spools={spools} />

            {/* Filters */}
            <section className="space-y-3">
              <div className="flex flex-col md:flex-row gap-3">
                <div className="relative flex-1">
                  <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-stone-600" style={{ fontSize: 18 }}>search</span>
                  <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search colour, brand, code, notes…"
                         className={inputClass + ' pl-10 bg-[#111111]'} />
                </div>
                <div className="grid grid-cols-3 md:flex gap-3">
                  <select value={materialF} onChange={(e) => setMaterialF(e.target.value)} className={inputClass + ' bg-[#111111] md:w-40'}>
                    <option value="all">All materials</option>
                    {materialsInUse.map((m) => <option key={m} value={m}>{m}</option>)}
                  </select>
                  <select value={locationF} onChange={(e) => setLocationF(e.target.value)} className={inputClass + ' bg-[#111111] md:w-40'}>
                    <option value="all">All locations</option>
                    {locationsInUse.map((l) => <option key={l} value={l}>{l}</option>)}
                  </select>
                  <select value={sort} onChange={(e) => setSort(e.target.value)} className={inputClass + ' bg-[#111111] md:w-44'}>
                    {SORTS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                  </select>
                </div>
              </div>

              <div className="flex gap-2 overflow-x-auto h-scroll pb-2 -mx-4 px-4 md:mx-0 md:px-0 md:flex-wrap">
                <button className={chip(statusF === 'all')} onClick={() => setStatusF('all')}>All · {statusCounts.all}</button>
                {STATUSES.map((s) => (
                  <button key={s.value} className={chip(statusF === s.value)} onClick={() => setStatusF(s.value)}>
                    <span className="inline-block w-1.5 h-1.5 mr-1.5 align-middle" style={{ background: s.color }} />
                    {s.label} · {statusCounts[s.value]}
                  </button>
                ))}
                <span className="w-px bg-white/10 mx-1 flex-shrink-0" />
                <button className={chip(checkOnly)} onClick={() => setCheckOnly((v) => !v)}>Needs check · {stats.check}</button>
                {statusF === 'all' && stats.empty > 0 && (
                  <button className={chip(showEmpty)} onClick={() => setShowEmpty((v) => !v)}>
                    {showEmpty ? 'Hide' : 'Show'} empty · {stats.empty}
                  </button>
                )}
              </div>
            </section>

            {/* Grid */}
            {visible.length === 0 ? (
              <div className="text-center py-20 bg-[#111111] border border-white/5">
                <p className="text-4xl text-white mb-3" style={{ fontFamily: "'Bebas Neue', sans-serif" }}>
                  {spools.length === 0 ? 'No spools yet' : 'Nothing matches'}
                </p>
                <p className="font-body text-stone-500 text-sm mb-2">
                  {spools.length === 0 ? 'Add your first spool to start tracking filament.' : 'Try a different search or filter.'}
                </p>
                <p className="font-body text-sm text-stone-600 mb-6">
                  {emptyQuip('inventory', spools.length > 0, spools.length)}
                </p>
                {filtersActive && (
                  <button onClick={clearFilters} className="font-technical text-xs uppercase tracking-widest text-[#ff5500] hover:text-white">
                    Clear filters
                  </button>
                )}
              </div>
            ) : (
              <motion.div layout className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
                <AnimatePresence>
                  {visible.map((s, i) => (
                    <SpoolCard
                      key={s.id} spool={s} index={i}
                      onOpen={(x) => setEditing(x)}
                      onWeigh={(x) => setWeighing(x)}
                      onMove={(x) => setMoving(x)}
                      onMarkEmpty={(x) => update(x, { status: 'empty' }, `${x.color_name} marked empty.`)}
                    />
                  ))}
                </AnimatePresence>
              </motion.div>
            )}

            <MaterialGuide />
          </>
        )}
      </div>

      <AnimatePresence>
        {editing !== undefined && (
          <SpoolFormModal
            key={editing?.id ?? 'new'}
            spool={editing}
            spools={spools}
            onClose={() => setEditing(undefined)}
            onSaved={(row, msg) => { replace(row); setEditing(undefined); showToast(msg); }}
            onDelete={(s) => { setEditing(undefined); setDeleting(s); }}
          />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {weighing && (
          <WeighModal
            spool={weighing}
            onClose={() => setWeighing(null)}
            onSave={async (s, patch, msg) => { if (await update(s, patch, msg)) setWeighing(null); }}
          />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {moving && <MoveModal spool={moving} spools={spools} onClose={() => setMoving(null)} onMove={move} />}
      </AnimatePresence>
      <AnimatePresence>
        {deleting && <DeleteModal spool={deleting} onClose={() => setDeleting(null)} onConfirm={remove} />}
      </AnimatePresence>

      <Toast toast={toast} onDismiss={() => setToast(null)} />
    </div>
  );
}
