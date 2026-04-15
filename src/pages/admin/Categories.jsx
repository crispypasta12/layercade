import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../../lib/supabase';
import AdminNavbar from '../../components/admin/AdminNavbar';
import Toast from '../../components/Toast';

const CLOUD_NAME    = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
const UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;
const MAX_FILE_SIZE = 5 * 1024 * 1024;
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

/* ─── Helpers ─────────────────────────────────────────────────────── */

function generateSlug(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function validateSlug(slug) {
  if (!slug) return 'Slug is required.';
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug)) {
    return 'Lowercase letters, numbers, and hyphens only (no leading/trailing/consecutive hyphens).';
  }
  return null;
}

/* ─── Category form modal ─────────────────────────────────────────── */

function CategoryFormModal({ category, onClose, onSuccess }) {
  const isEdit = category !== null;

  const [name,      setName]      = useState(category?.name       ?? '');
  const [slug,      setSlug]      = useState(category?.slug       ?? '');
  const [sortOrder, setSortOrder] = useState(
    category?.sort_order != null ? String(category.sort_order) : '999',
  );
  const [imageUrl,    setImageUrl]    = useState(category?.image_url ?? '');
  const [uploading,   setUploading]   = useState(false);
  const [uploadPct,   setUploadPct]   = useState(0);
  const [uploadError, setUploadError] = useState(null);
  const fileInputRef = useRef(null);

  const [errors,    setErrors]    = useState({});
  const [saving,    setSaving]    = useState(false);
  const [saveError, setSaveError] = useState(null);

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    if (!ALLOWED_TYPES.includes(file.type)) {
      setUploadError('Only JPG, PNG, and WebP images are allowed.');
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      setUploadError('File must be under 5 MB.');
      return;
    }

    setUploadError(null);
    setUploading(true);
    setUploadPct(0);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', UPLOAD_PRESET);
    formData.append('folder', 'layercade/categories');

    const xhr = new XMLHttpRequest();
    xhr.open('POST', `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`);

    xhr.upload.addEventListener('progress', (evt) => {
      if (evt.lengthComputable) setUploadPct(Math.round((evt.loaded / evt.total) * 100));
    });

    xhr.onload = () => {
      setUploading(false);
      if (xhr.status === 200) {
        setImageUrl(JSON.parse(xhr.responseText).secure_url);
      } else {
        setUploadError('Upload failed. Check your Cloudinary upload preset.');
      }
    };

    xhr.onerror = () => {
      setUploading(false);
      setUploadError('Network error during upload. Please try again.');
    };

    xhr.send(formData);
  };

  const handleNameChange = (val) => {
    setName(val);
    if (!isEdit) setSlug(generateSlug(val));
  };

  const validate = () => {
    const e = {};
    if (!name.trim()) e.name = 'Name is required.';
    const slugErr = validateSlug(slug);
    if (slugErr) e.slug = slugErr;
    if (!sortOrder || isNaN(Number(sortOrder))) e.sortOrder = 'Enter a valid number.';
    return e;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (uploading) return;
    const errs = validate();
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }
    setErrors({});
    setSaving(true);
    setSaveError(null);

    const row = { name: name.trim(), slug: slug.trim(), sort_order: Number(sortOrder), image_url: imageUrl || null };

    if (isEdit) {
      const { error } = await supabase.from('categories').update(row).eq('id', category.id);
      if (error) { setSaveError(error.message); setSaving(false); return; }
      onSuccess('Category updated.');
    } else {
      const { error } = await supabase.from('categories').insert(row);
      if (error) { setSaveError(error.message); setSaving(false); return; }
      onSuccess('Category added.');
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
      onClick={onClose}
    >
      <motion.div
        className="w-full max-w-md bg-[#111111] border border-white/10 p-6"
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
            {isEdit ? 'Edit Category' : 'Add Category'}
          </h2>
          <button
            onClick={onClose}
            disabled={saving || uploading}
            className="text-stone-500 hover:text-[#ff5500] transition-colors disabled:opacity-40"
          >
            <span className="material-symbols-outlined" style={{ fontSize: 22 }}>close</span>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          {/* Name */}
          <div className="space-y-1">
            <label className="font-technical text-[10px] text-stone-400 uppercase tracking-widest block">
              Name *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder="e.g. Gaming Accessories"
              disabled={saving}
              className={inputClass}
            />
            {errors.name && <p className="font-technical text-[10px] text-red-400">{errors.name}</p>}
          </div>

          {/* Slug */}
          <div className="space-y-1">
            <label className="font-technical text-[10px] text-stone-400 uppercase tracking-widest block">
              Slug *
            </label>
            <input
              type="text"
              value={slug}
              onChange={(e) => setSlug(e.target.value.toLowerCase())}
              placeholder="e.g. gaming-accessories"
              disabled={saving}
              className={inputClass}
            />
            {errors.slug && <p className="font-technical text-[10px] text-red-400">{errors.slug}</p>}
            <p className="font-technical text-[10px] text-stone-600">URL: /shop/{slug || '...'}</p>
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
            <p className="font-technical text-[10px] text-stone-600">Lower numbers appear first.</p>
          </div>

          {/* Category image */}
          <div className="space-y-2">
            <label className="font-technical text-[10px] text-stone-400 uppercase tracking-widest block">
              Card Background Image <span className="text-stone-600 normal-case tracking-normal">(optional)</span>
            </label>

            {/* Preview */}
            {imageUrl && !uploading && (
              <div className="relative w-full h-36 overflow-hidden border border-white/10 bg-[#0f0f0f]">
                <img src={imageUrl} alt="Category" className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
                <button
                  type="button"
                  onClick={() => setImageUrl('')}
                  disabled={saving || uploading}
                  className="absolute top-2 right-2 flex items-center justify-center w-7 h-7
                             bg-black/70 border border-white/20 text-stone-300
                             hover:text-red-400 hover:border-red-500/40 transition-colors
                             disabled:opacity-40"
                  aria-label="Remove image"
                >
                  <span className="material-symbols-outlined" style={{ fontSize: 14 }}>close</span>
                </button>
              </div>
            )}

            {/* Upload progress */}
            {uploading && (
              <div className="border border-white/10 border-dashed bg-[#0f0f0f] p-4 flex flex-col items-center gap-2">
                <svg className="animate-spin w-5 h-5 text-[#ff5500]" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
                <p className="font-technical text-[10px] text-stone-400 uppercase tracking-widest">
                  Uploading… {uploadPct}%
                </p>
                <div className="w-full h-1 bg-white/10 overflow-hidden rounded">
                  <div className="h-full bg-[#ff5500] transition-all duration-200" style={{ width: `${uploadPct}%` }} />
                </div>
              </div>
            )}

            {/* Upload error */}
            {uploadError && (
              <p className="font-technical text-[10px] text-red-400">{uploadError}</p>
            )}

            {/* Hidden file input */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleFileSelect}
              className="hidden"
            />

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={saving || uploading}
              className="flex items-center gap-2 font-technical text-xs uppercase tracking-widest
                         bg-[#161616] border border-white/10 px-4 py-2.5 text-stone-300
                         hover:border-[#ff5500] hover:text-white transition-colors
                         disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span className="material-symbols-outlined" style={{ fontSize: 15 }}>image</span>
              {imageUrl ? 'Replace Image' : 'Upload Image'}
            </button>
            <p className="font-technical text-[10px] text-stone-600">
              JPG, PNG or WebP · max 5 MB · shown as card background on the homepage
            </p>
          </div>

          {saveError && (
            <div className="bg-red-950/40 border border-red-800/60 p-3">
              <p className="font-body text-red-400 text-sm">{saveError}</p>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={saving || uploading}
              className="flex-1 py-3 font-technical text-xs uppercase tracking-widest bg-white/10 text-stone-300 hover:bg-white/20 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || uploading}
              className="flex-1 clip-parallelogram bg-[#ff5500] text-white font-technical text-xs uppercase tracking-widest py-3 flex items-center justify-center gap-2 hover:shadow-[0_0_20px_rgba(255,85,0,0.3)] transition-all disabled:opacity-60"
            >
              {saving ? 'Saving...' : uploading ? 'Uploading…' : isEdit ? 'Update' : 'Add Category'}
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}

/* ─── Delete confirmation ─────────────────────────────────────────── */

function DeleteModal({ category, onClose, onConfirm }) {
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
              Delete Category
            </h3>
            <p className="font-body text-stone-400 text-sm leading-relaxed">
              Delete <span className="text-white font-medium">"{category.name}"</span>?
              Existing products in this category won't be deleted, but their category
              label will become unrecognised until updated.
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

export default function AdminCategories() {
  const [categories, setCategories] = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState(null);

  const [showModal, setShowModal] = useState(false);
  const [editing,   setEditing]   = useState(null);
  const [deleting,  setDeleting]  = useState(null);
  const [toast,     setToast]     = useState(null);

  const showToast = (message, type = 'success') => setToast({ message, type });

  const fetchCategories = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .order('sort_order', { ascending: true });
    setLoading(false);
    if (error) { setError(error.message); return; }
    setCategories(data ?? []);
  }, []);

  useEffect(() => { fetchCategories(); }, [fetchCategories]);

  const handleDelete = async () => {
    if (!deleting) return;
    const name = deleting.name;
    const { error } = await supabase.from('categories').delete().eq('id', deleting.id);
    setDeleting(null);
    if (error) { showToast('Failed to delete: ' + error.message, 'error'); }
    else { fetchCategories(); showToast(`"${name}" deleted.`); }
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
              Categories
            </h1>
            <p className="mt-1 font-technical text-[10px] text-stone-500 uppercase tracking-widest">
              {categories.length} total
            </p>
          </div>
          <button
            onClick={() => { setEditing(null); setShowModal(true); }}
            className="clip-parallelogram bg-[#ff5500] text-white font-technical text-xs uppercase
                       tracking-widest px-8 py-3 flex items-center gap-2
                       hover:shadow-[0_0_20px_rgba(255,85,0,0.3)] transition-all"
          >
            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>add</span>
            Add Category
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
              onClick={fetchCategories}
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
        ) : categories.length === 0 ? (
          <div className="text-center py-24 border border-white/5 bg-[#111111]">
            <p className="font-headline text-4xl text-white mb-4">NO CATEGORIES YET</p>
            <button
              onClick={() => { setEditing(null); setShowModal(true); }}
              className="clip-parallelogram bg-[#ff5500] text-white font-technical text-xs
                         uppercase tracking-widest px-8 py-3 flex items-center gap-2 mx-auto
                         hover:shadow-[0_0_20px_rgba(255,85,0,0.3)] transition-all"
            >
              <span className="material-symbols-outlined" style={{ fontSize: 16 }}>add</span>
              Add First Category
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
                    Image
                  </th>
                  <th className="px-4 py-3 text-left font-technical text-[10px] uppercase tracking-widest text-stone-500">
                    Name
                  </th>
                  <th className="px-4 py-3 text-left font-technical text-[10px] uppercase tracking-widest text-stone-500 hidden sm:table-cell">
                    Slug
                  </th>
                  <th className="px-4 py-3 text-right font-technical text-[10px] uppercase tracking-widest text-stone-500 w-32">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {categories.map((cat, idx) => (
                  <motion.tr
                    key={cat.id}
                    className="border-b border-white/5 bg-[#0f0f0f] hover:bg-[#161616] transition-colors"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.15, delay: idx * 0.02 }}
                  >
                    <td className="px-4 py-4">
                      <span className="font-mono text-sm text-stone-600">
                        {String(cat.sort_order).padStart(2, '0')}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <div className="w-10 h-10 border border-white/10 overflow-hidden bg-[#0a0a0a] flex-shrink-0">
                        {cat.image_url ? (
                          <img src={cat.image_url} alt={cat.name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <span className="material-symbols-outlined text-stone-700" style={{ fontSize: 14 }}>image</span>
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <span className="font-body text-sm text-white">{cat.name}</span>
                    </td>
                    <td className="px-4 py-4 hidden sm:table-cell">
                      <span className="font-technical text-[10px] text-stone-500 bg-white/5 px-2 py-1">
                        {cat.slug}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center justify-end gap-4">
                        <button
                          onClick={() => { setEditing(cat); setShowModal(true); }}
                          className="flex items-center gap-1 font-technical text-[10px] uppercase tracking-widest text-stone-400 hover:text-[#ff5500] transition-colors"
                        >
                          <span className="material-symbols-outlined" style={{ fontSize: 15 }}>edit</span>
                          Edit
                        </button>
                        <button
                          onClick={() => setDeleting(cat)}
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
          <CategoryFormModal
            category={editing}
            onClose={() => { setShowModal(false); setEditing(null); }}
            onSuccess={(msg) => { showToast(msg); fetchCategories(); setShowModal(false); setEditing(null); }}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {deleting && (
          <DeleteModal
            category={deleting}
            onClose={() => setDeleting(null)}
            onConfirm={handleDelete}
          />
        )}
      </AnimatePresence>

      <Toast toast={toast} onDismiss={() => setToast(null)} />
    </div>
  );
}
