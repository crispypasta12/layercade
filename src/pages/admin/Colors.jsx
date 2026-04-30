import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../../lib/supabase';
import AdminNavbar from '../../components/admin/AdminNavbar';
import Toast from '../../components/Toast';

/* ─── Color form modal ────────────────────────────────────────────── */

function ColorFormModal({ color, onClose, onSuccess }) {
  const isEdit = color !== null;

  const [name,      setName]      = useState(color?.name       ?? '');
  const [hex,       setHex]       = useState(color?.hex        ?? '#ffffff');
  const [sortOrder, setSortOrder] = useState(
    color?.sort_order != null ? String(color.sort_order) : '999',
  );
  const [errors,    setErrors]    = useState({});
  const [saving,    setSaving]    = useState(false);
  const [saveError, setSaveError] = useState(null);

  const nameInputRef = useRef(null);

  useEffect(() => {
    const t = setTimeout(() => nameInputRef.current?.focus(), 80);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape' && !saving) onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, saving]);

  const validate = () => {
    const e = {};
    if (!name.trim()) e.name = 'Name is required.';
    if (!hex || !/^#[0-9a-fA-F]{6}$/.test(hex)) e.hex = 'Enter a valid hex color (e.g. #ff5500).';
    if (!sortOrder || isNaN(Number(sortOrder))) e.sortOrder = 'Enter a valid number.';
    return e;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }
    setErrors({});
    setSaving(true);
    setSaveError(null);

    const row = { name: name.trim(), hex: hex.toLowerCase(), sort_order: Number(sortOrder) };

    if (isEdit) {
      const { error } = await supabase.from('colors').update(row).eq('id', color.id);
      if (error) { setSaveError(error.message); setSaving(false); return; }
      onSuccess('Color updated.');
    } else {
      const { error } = await supabase.from('colors').insert(row);
      if (error) {
        setSaveError(
          error.code === '23505'
            ? `A color named "${name.trim()}" already exists.`
            : error.message,
        );
        setSaving(false);
        return;
      }
      onSuccess('Color added.');
    }

    setSaving(false);
    onClose();
  };

  const inputClass =
    'w-full bg-[#161616] border border-white/10 text-white font-body text-sm px-3 py-3 ' +
    'focus:outline-none focus:border-[#ff5500] transition-colors placeholder:text-stone-700';

  return (
    <motion.div
      className="fixed inset-0 z-[150] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={() => { if (!saving) onClose(); }}
    >
      <motion.div
        className="w-full max-w-sm bg-[#111111] border border-white/10 p-6"
        initial={{ opacity: 0, y: 20, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 20, scale: 0.97 }}
        transition={{ duration: 0.25, ease: 'easeOut' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-6">
          <h2
            className="text-white uppercase"
            style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.75rem' }}
          >
            {isEdit ? 'Edit Color' : 'Add Color'}
          </h2>
          <button
            onClick={() => { if (!saving) onClose(); }}
            disabled={saving}
            className="text-stone-500 hover:text-[#ff5500] transition-colors disabled:opacity-40"
          >
            <span className="material-symbols-outlined" style={{ fontSize: 22 }}>close</span>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          {/* Name */}
          <div className="space-y-1">
            <label className="font-technical text-[10px] text-stone-400 uppercase tracking-widest block">
              Color Name *
            </label>
            <input
              ref={nameInputRef}
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Matte Black"
              disabled={saving}
              className={inputClass}
            />
            {errors.name && <p className="font-technical text-[10px] text-red-400">{errors.name}</p>}
          </div>

          {/* Hex + native picker */}
          <div className="space-y-1">
            <label className="font-technical text-[10px] text-stone-400 uppercase tracking-widest block">
              Hex Color *
            </label>
            <div className="flex gap-2 items-stretch">
              {/* Native color picker — clicking the swatch opens OS picker */}
              <label
                className="flex-shrink-0 w-12 h-[46px] border border-white/10 cursor-pointer overflow-hidden relative"
                title="Click to pick a color"
              >
                <input
                  type="color"
                  value={/^#[0-9a-fA-F]{6}$/.test(hex) ? hex : '#ffffff'}
                  onChange={(e) => setHex(e.target.value)}
                  disabled={saving}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                <div className="w-full h-full" style={{ background: /^#[0-9a-fA-F]{6}$/.test(hex) ? hex : '#ffffff' }} />
              </label>
              {/* Manual hex input */}
              <input
                type="text"
                value={hex}
                onChange={(e) => setHex(e.target.value)}
                placeholder="#ffffff"
                maxLength={7}
                disabled={saving}
                className={inputClass + ' flex-1'}
              />
            </div>
            {errors.hex && <p className="font-technical text-[10px] text-red-400">{errors.hex}</p>}
          </div>

          {/* Sort order */}
          <div className="space-y-1">
            <label className="font-technical text-[10px] text-stone-400 uppercase tracking-widest block">
              Sort Order
            </label>
            <input
              type="number"
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value)}
              disabled={saving}
              className={inputClass}
            />
            {errors.sortOrder && <p className="font-technical text-[10px] text-red-400">{errors.sortOrder}</p>}
            <p className="font-technical text-[10px] text-stone-600">Lower numbers appear first in the picker.</p>
          </div>

          {saveError && (
            <div className="bg-red-950/40 border border-red-800/60 p-3">
              <p className="font-body text-red-400 text-sm">{saveError}</p>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={() => { if (!saving) onClose(); }}
              disabled={saving}
              className="flex-1 py-3 font-technical text-xs uppercase tracking-widest bg-white/10 text-stone-300 hover:bg-white/20 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 clip-parallelogram bg-[#ff5500] text-white font-technical text-xs uppercase tracking-widest py-3 flex items-center justify-center gap-2 hover:shadow-[0_0_20px_rgba(255,85,0,0.3)] transition-all disabled:opacity-60"
            >
              {saving ? 'Saving...' : isEdit ? 'Update Color' : 'Add Color'}
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}

/* ─── Delete confirmation ─────────────────────────────────────────── */

function DeleteModal({ color, usageCount, onClose, onConfirm }) {
  return (
    <motion.div
      className="fixed inset-0 z-[150] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        className="w-full max-w-sm bg-[#111111] border border-white/10 p-6 space-y-5"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-3">
          <span
            className="material-symbols-outlined text-red-500 mt-0.5 flex-shrink-0"
            style={{ fontSize: 22, fontVariationSettings: "'FILL' 1" }}
          >
            warning
          </span>
          <div>
            <h3
              className="text-white uppercase mb-2"
              style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.5rem' }}
            >
              Delete Color
            </h3>
            <p className="font-body text-stone-400 text-sm leading-relaxed">
              Delete{' '}
              <span className="text-white font-medium">"{color.name}"</span>?
              {usageCount > 0 && (
                <>
                  {' '}This color is used in{' '}
                  <span className="text-yellow-400">{usageCount} product variant{usageCount !== 1 ? 's' : ''}</span>.
                  Those variants will lose their palette link but keep their saved name and hex.
                </>
              )}
            </p>
          </div>
        </div>
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-3 font-technical text-xs uppercase tracking-widest bg-white/10 text-stone-300 hover:bg-white/20 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 py-3 bg-red-600 text-white font-technical text-xs uppercase tracking-widest hover:bg-red-500 transition-colors"
          >
            Delete
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

/* ─── Main page ───────────────────────────────────────────────────── */

export default function AdminColors() {
  const [colors,  setColors]  = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);

  const [showModal, setShowModal] = useState(false);
  const [editing,   setEditing]   = useState(null);
  const [deleting,  setDeleting]  = useState(null);
  const [deleteUsageCount, setDeleteUsageCount] = useState(0);
  const [toast,     setToast]     = useState(null);

  const showToast = (message, type = 'success') => setToast({ message, type });

  const fetchColors = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data, error } = await supabase
      .from('colors')
      .select('*')
      .order('sort_order', { ascending: true });
    setLoading(false);
    if (error) { setError(error.message); return; }
    setColors(data ?? []);
  }, []);

  useEffect(() => { fetchColors(); }, [fetchColors]);

  const handleDeleteClick = async (color) => {
    // Check usage count before confirming
    const { count } = await supabase
      .from('product_colors')
      .select('id', { count: 'exact', head: true })
      .eq('color_id', color.id);
    setDeleteUsageCount(count ?? 0);
    setDeleting(color);
  };

  const handleDeleteConfirm = async () => {
    if (!deleting) return;
    const name = deleting.name;
    const { error } = await supabase.from('colors').delete().eq('id', deleting.id);
    setDeleting(null);
    if (error) { showToast('Failed to delete: ' + error.message, 'error'); }
    else { fetchColors(); showToast(`"${name}" deleted.`); }
  };

  return (
    <div className="min-h-screen bg-[#080808] text-white">
      <AdminNavbar />

      <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">

        {/* Header */}
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1
              className="uppercase text-white"
              style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '3rem', lineHeight: 1 }}
            >
              Colors
            </h1>
            <p className="mt-1 font-technical text-[10px] text-stone-500 uppercase tracking-widest">
              {colors.length} in palette · used as product color options
            </p>
          </div>
          <button
            onClick={() => { setEditing(null); setShowModal(true); }}
            className="clip-parallelogram bg-[#ff5500] text-white font-technical text-xs uppercase
                       tracking-widest px-8 py-3 flex items-center gap-2
                       hover:shadow-[0_0_20px_rgba(255,85,0,0.3)] transition-all"
          >
            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>add</span>
            Add Color
          </button>
        </div>

        {/* Error */}
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
              onClick={fetchColors}
              className="font-technical text-xs uppercase tracking-widest text-red-400 hover:text-red-300 underline"
            >
              Retry
            </button>
          </div>
        )}

        {/* Table */}
        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-14 bg-[#111111] border border-white/10 animate-pulse" />
            ))}
          </div>
        ) : colors.length === 0 ? (
          <div className="text-center py-24 border border-white/5 bg-[#111111]">
            <p className="font-headline text-4xl text-white mb-4">NO COLORS YET</p>
            <p className="font-body text-stone-500 text-sm mb-6">
              Add colors to build your product variant palette.
            </p>
            <button
              onClick={() => { setEditing(null); setShowModal(true); }}
              className="clip-parallelogram bg-[#ff5500] text-white font-technical text-xs
                         uppercase tracking-widest px-8 py-3 flex items-center gap-2 mx-auto
                         hover:shadow-[0_0_20px_rgba(255,85,0,0.3)] transition-all"
            >
              <span className="material-symbols-outlined" style={{ fontSize: 16 }}>add</span>
              Add First Color
            </button>
          </div>
        ) : (
          <div className="border border-white/10 overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="bg-[#111111] border-b border-white/10">
                  <th className="px-4 py-3 text-left font-technical text-[10px] uppercase tracking-widest text-stone-500 w-20">
                    Order
                  </th>
                  <th className="px-4 py-3 text-left font-technical text-[10px] uppercase tracking-widest text-stone-500 w-14">
                    Swatch
                  </th>
                  <th className="px-4 py-3 text-left font-technical text-[10px] uppercase tracking-widest text-stone-500">
                    Name
                  </th>
                  <th className="px-4 py-3 text-left font-technical text-[10px] uppercase tracking-widest text-stone-500 hidden sm:table-cell">
                    Hex
                  </th>
                  <th className="px-4 py-3 text-right font-technical text-[10px] uppercase tracking-widest text-stone-500 w-32">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {colors.map((c, idx) => (
                  <motion.tr
                    key={c.id}
                    className="border-b border-white/5 bg-[#0f0f0f] hover:bg-[#161616] transition-colors"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.15, delay: idx * 0.02 }}
                  >
                    <td className="px-4 py-4">
                      <span className="font-mono text-sm text-stone-600">
                        {String(c.sort_order).padStart(2, '0')}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <div
                        className="w-8 h-8 border border-white/10 flex-shrink-0"
                        style={{ background: c.hex }}
                        title={c.hex}
                      />
                    </td>
                    <td className="px-4 py-4">
                      <span className="font-body text-sm text-white">{c.name}</span>
                    </td>
                    <td className="px-4 py-4 hidden sm:table-cell">
                      <span className="font-technical text-[10px] text-stone-500 bg-white/5 px-2 py-1">
                        {c.hex}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center justify-end gap-4">
                        <button
                          onClick={() => { setEditing(c); setShowModal(true); }}
                          className="flex items-center gap-1 font-technical text-[10px] uppercase tracking-widest text-stone-400 hover:text-[#ff5500] transition-colors"
                        >
                          <span className="material-symbols-outlined" style={{ fontSize: 15 }}>edit</span>
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeleteClick(c)}
                          className="flex items-center gap-1 font-technical text-[10px] uppercase tracking-widest text-stone-400 hover:text-red-500 transition-colors"
                        >
                          <span className="material-symbols-outlined" style={{ fontSize: 15 }}>delete</span>
                          Delete
                        </button>
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <AnimatePresence>
        {showModal && (
          <ColorFormModal
            color={editing}
            onClose={() => { setShowModal(false); setEditing(null); }}
            onSuccess={(msg) => { showToast(msg); fetchColors(); setShowModal(false); setEditing(null); }}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {deleting && (
          <DeleteModal
            color={deleting}
            usageCount={deleteUsageCount}
            onClose={() => setDeleting(null)}
            onConfirm={handleDeleteConfirm}
          />
        )}
      </AnimatePresence>

      <Toast toast={toast} onDismiss={() => setToast(null)} />
    </div>
  );
}
