import { useState, useEffect, useCallback, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion'; // motion used in modals + ParentGroup
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
} from '@dnd-kit/core';
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
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

function CategoryFormModal({ category, allCategories, defaultParentId, onClose, onSuccess }) {
  const isEdit = category !== null;

  const [name,      setName]      = useState(category?.name ?? '');
  const [slug,      setSlug]      = useState(category?.slug ?? '');
  const [parentId,  setParentId]  = useState(
    category?.parent_id != null
      ? String(category.parent_id)
      : defaultParentId != null
        ? String(defaultParentId)
        : ''
  );
  const [imageUrl,    setImageUrl]    = useState(category?.image_url ?? '');

  const parentOptions = allCategories.filter((c) => c.parent_id === null && c.id !== category?.id);
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

    const row = {
      name:      name.trim(),
      slug:      slug.trim(),
      image_url: imageUrl || null,
      parent_id: parentId ? Number(parentId) : null,
      // sort_order is managed by drag-and-drop; default high so new items go to end
      ...(isEdit ? {} : { sort_order: 9999 }),
    };

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

          {/* Parent category */}
          <div className="space-y-1">
            <label className="font-technical text-[10px] text-stone-400 uppercase tracking-widest block">
              Parent Category{' '}
              <span className="text-stone-600 normal-case tracking-normal">(leave blank for top-level)</span>
            </label>
            <div className="relative">
              <select
                value={parentId}
                onChange={(e) => setParentId(e.target.value)}
                disabled={saving}
                className={inputClass + ' appearance-none cursor-pointer pr-8'}
              >
                <option value="">— None (top-level) —</option>
                {parentOptions.map((p) => (
                  <option key={p.id} value={String(p.id)}>{p.name}</option>
                ))}
              </select>
              <span
                className="material-symbols-outlined absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-stone-500"
                style={{ fontSize: 16 }}
              >
                expand_more
              </span>
            </div>
          </div>

          {/* Category image */}
          <div className="space-y-2">
            <label className="font-technical text-[10px] text-stone-400 uppercase tracking-widest block">
              Card Background Image{' '}
              <span className="text-stone-600 normal-case tracking-normal">(optional)</span>
            </label>

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

            {uploadError && (
              <p className="font-technical text-[10px] text-red-400">{uploadError}</p>
            )}

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
              JPG, PNG or WebP · max 5 MB · shown as card background on the shop page
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

/* ─── Sortable sub-category row ───────────────────────────────────── */

function SubRow({ cat, onEdit, onDelete, isDragOverlay = false }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: cat.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.35 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-3 px-4 py-3 border-b border-white/5 bg-[#0d0d0d]
                  hover:bg-[#141414] transition-colors group
                  ${isDragOverlay ? 'shadow-2xl border border-[#ff5500]/20 bg-[#141414]' : ''}`}
    >
      {/* Indent marker */}
      <div className="w-4 flex-shrink-0 flex justify-end">
        <div className="w-px h-4 bg-white/10" />
      </div>
      <div className="w-3 h-px bg-white/10 flex-shrink-0" />

      {/* Drag handle */}
      <button
        {...attributes}
        {...listeners}
        className="flex-shrink-0 text-stone-700 hover:text-stone-400 transition-colors cursor-grab active:cursor-grabbing touch-none"
        aria-label="Drag to reorder"
        tabIndex={-1}
      >
        <span className="material-symbols-outlined" style={{ fontSize: 18 }}>drag_indicator</span>
      </button>

      {/* Thumbnail */}
      <div className="w-7 h-7 flex-shrink-0 border border-white/10 overflow-hidden bg-[#0a0a0a]">
        {cat.image_url ? (
          <img src={cat.image_url} alt={cat.name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <span className="material-symbols-outlined text-stone-700" style={{ fontSize: 11 }}>image</span>
          </div>
        )}
      </div>

      {/* Name + slug */}
      <div className="flex-1 min-w-0">
        <span className="font-body text-sm text-stone-300 truncate block">{cat.name}</span>
        <span className="font-technical text-[9px] text-stone-600 truncate block">/shop/{cat.slug}</span>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
        <button
          onClick={() => onEdit(cat)}
          className="flex items-center gap-1 font-technical text-[10px] uppercase tracking-widest text-stone-400 hover:text-[#ff5500] transition-colors"
        >
          <span className="material-symbols-outlined" style={{ fontSize: 14 }}>edit</span>
          Edit
        </button>
        <button
          onClick={() => onDelete(cat)}
          className="flex items-center gap-1 font-technical text-[10px] uppercase tracking-widest text-stone-400 hover:text-red-500 transition-colors"
        >
          <span className="material-symbols-outlined" style={{ fontSize: 14 }}>delete</span>
          Delete
        </button>
      </div>
    </div>
  );
}

/* ─── Sortable parent group ───────────────────────────────────────── */

function ParentGroup({
  parent,
  subCategories,
  expanded,
  onToggle,
  onEdit,
  onDelete,
  onAddSub,
  onSubReorder,
  isDragOverlay = false,
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: parent.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.35 : 1,
  };

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } })
  );

  const handleSubDragEnd = (event) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = subCategories.findIndex((s) => s.id === active.id);
    const newIndex = subCategories.findIndex((s) => s.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    onSubReorder(parent.id, arrayMove(subCategories, oldIndex, newIndex));
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`border border-white/10 overflow-hidden
                  ${isDragOverlay ? 'shadow-2xl border-[#ff5500]/20' : ''}`}
    >
      {/* Parent header */}
      <div className={`flex items-center gap-3 px-4 py-4 bg-[#141414] group ${isDragging ? '' : 'hover:bg-[#1a1a1a]'} transition-colors`}>

        {/* Drag handle */}
        <button
          {...attributes}
          {...listeners}
          className="flex-shrink-0 text-stone-600 hover:text-stone-300 transition-colors cursor-grab active:cursor-grabbing touch-none"
          aria-label="Drag to reorder"
          tabIndex={-1}
        >
          <span className="material-symbols-outlined" style={{ fontSize: 20 }}>drag_indicator</span>
        </button>

        {/* Thumbnail */}
        <div className="w-9 h-9 flex-shrink-0 border border-white/10 overflow-hidden bg-[#0a0a0a]">
          {parent.image_url ? (
            <img src={parent.image_url} alt={parent.name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <span className="material-symbols-outlined text-stone-700" style={{ fontSize: 14 }}>folder</span>
            </div>
          )}
        </div>

        {/* Name + badge + slug */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-body text-sm text-white font-medium">{parent.name}</span>
            <span className="font-technical text-[9px] uppercase tracking-widest text-[#ff5500] bg-[#ff5500]/10 px-1.5 py-0.5">
              Parent
            </span>
            {!expanded && subCategories.length > 0 && (
              <span className="font-technical text-[9px] text-stone-600">
                {subCategories.length} sub-{subCategories.length === 1 ? 'category' : 'categories'}
              </span>
            )}
          </div>
          <span className="font-technical text-[9px] text-stone-600">/shop/{parent.slug}</span>
        </div>

        {/* Actions (visible on hover) */}
        <div className="flex items-center gap-3 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
          <button
            onClick={() => onEdit(parent)}
            className="flex items-center gap-1 font-technical text-[10px] uppercase tracking-widest text-stone-400 hover:text-[#ff5500] transition-colors"
          >
            <span className="material-symbols-outlined" style={{ fontSize: 14 }}>edit</span>
            Edit
          </button>
          <button
            onClick={() => onDelete(parent)}
            className="flex items-center gap-1 font-technical text-[10px] uppercase tracking-widest text-stone-400 hover:text-red-500 transition-colors"
          >
            <span className="material-symbols-outlined" style={{ fontSize: 14 }}>delete</span>
            Delete
          </button>
        </div>

        {/* Expand / collapse toggle */}
        <button
          onClick={onToggle}
          className="flex-shrink-0 ml-1 text-stone-500 hover:text-white transition-colors p-1"
          aria-label={expanded ? 'Collapse' : 'Expand'}
        >
          <span
            className={`material-symbols-outlined transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`}
            style={{ fontSize: 18 }}
          >
            expand_more
          </span>
        </button>
      </div>

      {/* Sub-category list */}
      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            {subCategories.length > 0 ? (
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleSubDragEnd}
              >
                <SortableContext
                  items={subCategories.map((s) => s.id)}
                  strategy={verticalListSortingStrategy}
                >
                  {subCategories.map((sub) => (
                    <SubRow
                      key={sub.id}
                      cat={sub}
                      onEdit={onEdit}
                      onDelete={onDelete}
                    />
                  ))}
                </SortableContext>
              </DndContext>
            ) : (
              <div className="px-12 py-4 text-stone-600 font-technical text-[10px] uppercase tracking-widest">
                No sub-categories yet
              </div>
            )}

            {/* Add sub-category shortcut */}
            <div className="px-4 py-3 border-t border-white/5 bg-[#0a0a0a]">
              <button
                onClick={() => onAddSub(parent.id)}
                className="flex items-center gap-2 font-technical text-[10px] uppercase tracking-widest
                           text-stone-500 hover:text-[#ff5500] transition-colors group/add"
              >
                <span
                  className="material-symbols-outlined text-stone-600 group-hover/add:text-[#ff5500] transition-colors"
                  style={{ fontSize: 14 }}
                >
                  add_circle
                </span>
                Add Sub-category
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ─── Main page ───────────────────────────────────────────────────── */

export default function AdminCategories() {
  const [categories,  setCategories]  = useState([]);
  const [parents,     setParents]     = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState(null);
  const [saving,      setSaving]      = useState(false);

  const [expandedIds, setExpandedIds] = useState(new Set());

  const [showModal,       setShowModal]       = useState(false);
  const [editing,         setEditing]         = useState(null);
  const [defaultParentId, setDefaultParentId] = useState(null);
  const [deleting,        setDeleting]        = useState(null);
  const [toast,           setToast]           = useState(null);

  // Active drag item (for DragOverlay)
  const [activeParent, setActiveParent] = useState(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } })
  );

  const showToast = (message, type = 'success') => setToast({ message, type });

  /* ── Fetch ── */

  const fetchCategories = useCallback(async (expandAll = false) => {
    setLoading(true);
    setError(null);
    const { data, error } = await supabase
      .from('categories')
      .select('id, name, slug, sort_order, image_url, parent_id')
      .order('sort_order', { ascending: true });
    setLoading(false);
    if (error) { setError(error.message); return; }
    const rows = data ?? [];
    const newParents = rows.filter((c) => c.parent_id === null);
    setCategories(rows);
    setParents(newParents);
    if (expandAll) {
      setExpandedIds(new Set(newParents.map((p) => p.id)));
    }
  }, []);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { fetchCategories(true); }, [fetchCategories]);

  /* ── Helpers ── */

  const subsFor = (parentId) =>
    categories.filter((c) => c.parent_id === parentId);

  const toggleExpand = (id) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const openAdd = (parentId = null) => {
    setEditing(null);
    setDefaultParentId(parentId);
    setShowModal(true);
  };

  const openEdit = (cat) => {
    setEditing(cat);
    setDefaultParentId(null);
    setShowModal(true);
  };

  /* ── Persist sort order ── */

  const persistOrder = async (items) => {
    setSaving(true);
    const updates = items.map((item, idx) => ({ id: item.id, sort_order: (idx + 1) * 10 }));
    const { error } = await supabase.from('categories').upsert(updates, { onConflict: 'id' });
    setSaving(false);
    if (error) showToast('Failed to save order: ' + error.message, 'error');
  };

  /* ── Parent drag end ── */

  const handleParentDragStart = (event) => {
    const { active } = event;
    setActiveParent(parents.find((p) => p.id === active.id) ?? null);
  };

  const handleParentDragEnd = (event) => {
    setActiveParent(null);
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = parents.findIndex((p) => p.id === active.id);
    const newIndex = parents.findIndex((p) => p.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    const reordered = arrayMove(parents, oldIndex, newIndex);
    setParents(reordered);
    persistOrder(reordered);
  };

  /* ── Sub-category drag end ── */

  const handleSubReorder = (parentId, reorderedSubs) => {
    // Update local categories state
    setCategories((prev) => {
      const withoutSubs = prev.filter((c) => c.parent_id !== parentId);
      return [...withoutSubs, ...reorderedSubs];
    });
    persistOrder(reorderedSubs);
  };

  /* ── Delete ── */

  const handleDelete = async () => {
    if (!deleting) return;
    const name = deleting.name;
    const { error } = await supabase.from('categories').delete().eq('id', deleting.id);
    setDeleting(null);
    if (error) { showToast('Failed to delete: ' + error.message, 'error'); }
    else { fetchCategories(); showToast(`"${name}" deleted.`); }
  };

  /* ── Orphaned categories (safety net) ── */
  const orphaned = categories.filter(
    (c) => c.parent_id !== null && !parents.find((p) => p.id === c.parent_id)
  );

  const parentCount = parents.length;
  const subCount    = categories.filter((c) => c.parent_id !== null).length;

  return (
    <div className="min-h-screen bg-[#080808] text-white">
      <AdminNavbar />

      <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">

        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1
              className="uppercase text-white"
              style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '3rem', lineHeight: 1 }}
            >
              Categories
            </h1>
            <p className="mt-1 font-technical text-[10px] text-stone-500 uppercase tracking-widest">
              {parentCount} parent{parentCount !== 1 ? 's' : ''} · {subCount} sub-{subCount !== 1 ? 'categories' : 'category'}
              {saving && (
                <span className="ml-3 text-[#ff5500] animate-pulse">Saving order…</span>
              )}
            </p>
          </div>

          <div className="flex items-center gap-3 flex-shrink-0">
            <button
              onClick={() => openAdd(null)}
              className="clip-parallelogram bg-[#ff5500] text-white font-technical text-xs uppercase
                         tracking-widest px-8 py-3 flex items-center gap-2
                         hover:shadow-[0_0_20px_rgba(255,85,0,0.3)] transition-all"
            >
              <span className="material-symbols-outlined" style={{ fontSize: 16 }}>add</span>
              Add Category
            </button>
          </div>
        </div>

        {/* Drag hint */}
        {!loading && categories.length > 0 && (
          <p className="font-technical text-[10px] text-stone-600 uppercase tracking-widest flex items-center gap-1.5">
            <span className="material-symbols-outlined" style={{ fontSize: 12 }}>drag_indicator</span>
            Drag the handle to reorder
          </p>
        )}

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

        {/* Loading skeleton */}
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="space-y-px">
                <div className="h-16 bg-[#141414] border border-white/10 animate-pulse" />
                <div className="h-12 bg-[#0d0d0d] border border-white/5 animate-pulse ml-8" />
                <div className="h-12 bg-[#0d0d0d] border border-white/5 animate-pulse ml-8" />
              </div>
            ))}
          </div>
        ) : categories.length === 0 ? (
          <div className="text-center py-24 border border-white/5 bg-[#111111]">
            <p className="font-headline text-4xl text-white mb-4">NO CATEGORIES YET</p>
            <button
              onClick={() => openAdd(null)}
              className="clip-parallelogram bg-[#ff5500] text-white font-technical text-xs
                         uppercase tracking-widest px-8 py-3 flex items-center gap-2 mx-auto
                         hover:shadow-[0_0_20px_rgba(255,85,0,0.3)] transition-all"
            >
              <span className="material-symbols-outlined" style={{ fontSize: 16 }}>add</span>
              Add First Category
            </button>
          </div>
        ) : (
          <>
            {/* Parent groups — draggable */}
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragStart={handleParentDragStart}
              onDragEnd={handleParentDragEnd}
            >
              <SortableContext
                items={parents.map((p) => p.id)}
                strategy={verticalListSortingStrategy}
              >
                <div className="space-y-3">
                  {parents.map((parent) => (
                    <ParentGroup
                      key={parent.id}
                      parent={parent}
                      subCategories={subsFor(parent.id)}
                      expanded={expandedIds.has(parent.id)}
                      onToggle={() => toggleExpand(parent.id)}
                      onEdit={openEdit}
                      onDelete={(cat) => setDeleting(cat)}
                      onAddSub={(parentId) => {
                        setExpandedIds((prev) => new Set([...prev, parentId]));
                        openAdd(parentId);
                      }}
                      onSubReorder={handleSubReorder}
                    />
                  ))}
                </div>
              </SortableContext>

              {/* Drag overlay — renders the dragged parent on top */}
              <DragOverlay>
                {activeParent && (
                  <ParentGroup
                    parent={activeParent}
                    subCategories={[]}
                    expanded={false}
                    onToggle={() => {}}
                    onEdit={() => {}}
                    onDelete={() => {}}
                    onAddSub={() => {}}
                    onSubReorder={() => {}}
                    isDragOverlay
                  />
                )}
              </DragOverlay>
            </DndContext>

            {/* Orphaned sub-categories */}
            {orphaned.length > 0 && (
              <div className="border border-yellow-800/30 bg-yellow-950/10 p-4 space-y-3">
                <p className="font-technical text-[10px] text-yellow-600 uppercase tracking-widest flex items-center gap-1.5">
                  <span className="material-symbols-outlined" style={{ fontSize: 13 }}>warning</span>
                  Orphaned sub-categories (parent deleted)
                </p>
                {orphaned.map((cat) => (
                  <div key={cat.id} className="flex items-center gap-3 px-3 py-2 bg-[#0f0f0f] border border-white/5">
                    <span className="flex-1 font-body text-sm text-stone-500">{cat.name}</span>
                    <span className="font-technical text-[9px] text-stone-600">{cat.slug}</span>
                    <button onClick={() => openEdit(cat)} className="flex items-center gap-1 font-technical text-[10px] uppercase tracking-widest text-stone-400 hover:text-[#ff5500] transition-colors">
                      <span className="material-symbols-outlined" style={{ fontSize: 14 }}>edit</span>Edit
                    </button>
                    <button onClick={() => setDeleting(cat)} className="flex items-center gap-1 font-technical text-[10px] uppercase tracking-widest text-stone-400 hover:text-red-500 transition-colors">
                      <span className="material-symbols-outlined" style={{ fontSize: 14 }}>delete</span>Delete
                    </button>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* Modals */}
      <AnimatePresence>
        {showModal && (
          <CategoryFormModal
            category={editing}
            allCategories={categories}
            defaultParentId={defaultParentId}
            onClose={() => { setShowModal(false); setEditing(null); setDefaultParentId(null); }}
            onSuccess={(msg) => {
              showToast(msg);
              fetchCategories();
              setShowModal(false);
              setEditing(null);
              setDefaultParentId(null);
            }}
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
