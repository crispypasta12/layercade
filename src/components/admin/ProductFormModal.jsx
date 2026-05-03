import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { parseProductImages } from '../../lib/productImages';
import { supabase } from '../../lib/supabase';
import { useCategories } from '../../lib/useCategories';
import { useColors } from '../../lib/useColors';

const STOCK_OPTIONS = [
  { value: 'in_stock', label: 'In Stock' },
  { value: 'out_of_stock', label: 'Out of Stock' },
  { value: 'low_stock', label: 'Low Stock' },
];

const CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
const UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;

const MAX_IMAGE_COUNT = 6;
const MAX_FILE_SIZE = 5 * 1024 * 1024;
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

function generateSlug(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function categoryToFolder(category) {
  return category.toLowerCase().replace(/\s+/g, '-');
}

function validateSlug(slug) {
  if (!slug) return 'Slug is required.';
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug)) {
    return 'Lowercase letters, numbers, and hyphens only (no leading/trailing/consecutive hyphens).';
  }
  return null;
}

function Field({ label, error, children }) {
  return (
    <div className="space-y-1">
      <label className="font-technical text-[10px] text-stone-400 uppercase tracking-widest block">
        {label}
      </label>
      {children}
      {error && <p className="font-technical text-[10px] text-red-400">{error}</p>}
    </div>
  );
}

function ColorSwatchPicker({ colors, selectedId, onSelect, onClose }) {
  return (
    <div
      className="absolute z-50 top-full left-0 mt-1 bg-[#1c1c1c] border border-white/10 p-3 shadow-2xl"
      style={{ minWidth: 218 }}
    >
      <p className="font-technical text-[9px] uppercase tracking-widest text-stone-600 mb-2">Pick from palette</p>
      <div className="grid grid-cols-5 gap-1.5 mb-3">
        {colors.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => { onSelect(c); onClose(); }}
            title={c.name}
            className={`w-8 h-8 border-2 transition-all ${
              selectedId === c.id
                ? 'border-[#ff5500] scale-110'
                : 'border-transparent hover:border-white/40'
            }`}
            style={{ background: c.hex }}
          />
        ))}
      </div>
      <button
        type="button"
        onClick={onClose}
        className="font-technical text-[9px] uppercase tracking-widest text-stone-600 hover:text-stone-300 transition-colors"
      >
        Close
      </button>
    </div>
  );
}

function VariantRow({
  variant, index, total, globalColors,
  uploading, uploadProgress, uploadError,
  onChange, onRemove, onMoveUp, onMoveDown, onImageUpload,
  disabled,
}) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const pickerRef = useRef(null);

  useEffect(() => {
    if (!pickerOpen) return;
    const handler = (e) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target)) setPickerOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [pickerOpen]);

  const safeHex = /^#[0-9a-fA-F]{6}$/.test(variant.hex) ? variant.hex : '#888888';

  return (
    <div className="border border-white/10 bg-[#0d0d0d] p-3 space-y-3">
      {/* Swatch + name + reorder/remove */}
      <div className="flex items-center gap-2">
        <div className="relative flex-shrink-0" ref={pickerRef}>
          <button
            type="button"
            onClick={() => !disabled && setPickerOpen((v) => !v)}
            disabled={disabled}
            title="Pick from global palette"
            className="w-9 h-9 border border-white/10 hover:border-[#ff5500]/60 transition-colors flex-shrink-0"
            style={{ background: safeHex }}
          />
          {pickerOpen && (
            <ColorSwatchPicker
              colors={globalColors}
              selectedId={variant.color_id}
              onSelect={(c) => onChange({ color_id: c.id, hex: c.hex, name: variant.name || c.name })}
              onClose={() => setPickerOpen(false)}
            />
          )}
        </div>

        <input
          type="text"
          value={variant.name}
          onChange={(e) => onChange({ name: e.target.value })}
          placeholder="Color name (e.g. Matte Black)"
          disabled={disabled}
          className="flex-1 bg-[#161616] border border-white/10 text-white font-body text-sm px-3 py-2 focus:outline-none focus:border-[#ff5500] transition-colors placeholder:text-stone-700 min-w-0"
        />

        <div className="flex items-center gap-0.5 flex-shrink-0">
          <button
            type="button" onClick={onMoveUp} disabled={disabled || index === 0}
            className="p-1 text-stone-600 hover:text-white transition-colors disabled:opacity-25 disabled:cursor-not-allowed"
          >
            <span className="material-symbols-outlined" style={{ fontSize: 15 }}>arrow_upward</span>
          </button>
          <button
            type="button" onClick={onMoveDown} disabled={disabled || index === total - 1}
            className="p-1 text-stone-600 hover:text-white transition-colors disabled:opacity-25 disabled:cursor-not-allowed"
          >
            <span className="material-symbols-outlined" style={{ fontSize: 15 }}>arrow_downward</span>
          </button>
          <button
            type="button" onClick={onRemove} disabled={disabled}
            className="p-1 text-stone-600 hover:text-red-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span className="material-symbols-outlined" style={{ fontSize: 15 }}>delete</span>
          </button>
        </div>
      </div>

      {/* Custom hex */}
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={safeHex}
          onChange={(e) => onChange({ hex: e.target.value, color_id: null })}
          disabled={disabled}
          className="w-8 h-7 border-0 bg-transparent cursor-pointer p-0 flex-shrink-0"
        />
        <input
          type="text"
          value={variant.hex}
          onChange={(e) => {
            const val = e.target.value;
            if (/^#?[0-9a-fA-F]{0,6}$/.test(val)) {
              onChange({ hex: val.startsWith('#') ? val : '#' + val, color_id: null });
            }
          }}
          disabled={disabled}
          placeholder="#000000"
          maxLength={7}
          className="w-24 bg-[#161616] border border-white/10 text-stone-300 font-technical text-xs px-2 py-1 focus:outline-none focus:border-[#ff5500] transition-colors uppercase tracking-widest"
        />
        <span className="font-technical text-[9px] text-stone-600 uppercase tracking-widest">
          custom hex · or tap swatch for palette
        </span>
      </div>

      {/* Image + stock + price */}
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0">
          {variant.image ? (
            <div className="relative w-14 h-14 border border-white/10">
              <img src={variant.image} alt="" className="w-full h-full object-cover" />
              <button
                type="button"
                onClick={() => onChange({ image: '', images: [] })}
                disabled={disabled}
                className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-red-600 hover:bg-red-500 text-white flex items-center justify-center transition-colors disabled:opacity-50"
              >
                <span className="material-symbols-outlined" style={{ fontSize: 10 }}>close</span>
              </button>
            </div>
          ) : uploading ? (
            <div className="w-14 h-14 border border-dashed border-white/20 flex flex-col items-center justify-center gap-1">
              <svg className="animate-spin w-3.5 h-3.5 text-[#ff5500]" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
              <span className="font-technical text-[9px] text-stone-500">{uploadProgress}%</span>
            </div>
          ) : (
            <button
              type="button"
              onClick={onImageUpload}
              disabled={disabled}
              className="w-14 h-14 border border-dashed border-white/20 hover:border-[#ff5500]/60 text-stone-600 hover:text-stone-400 flex flex-col items-center justify-center gap-0.5 transition-colors disabled:opacity-50"
            >
              <span className="material-symbols-outlined" style={{ fontSize: 18 }}>image</span>
              <span className="font-technical text-[8px] uppercase tracking-widest">Photo</span>
            </button>
          )}
          {uploadError && (
            <p className="font-technical text-[8px] text-red-400 mt-1 w-14 leading-tight">{uploadError}</p>
          )}
        </div>

        <div className="flex-1 grid grid-cols-2 gap-2 min-w-0">
          <div>
            <p className="font-technical text-[9px] text-stone-600 uppercase tracking-widest mb-1">Stock</p>
            <div className="relative">
              <select
                value={variant.stock_status}
                onChange={(e) => onChange({ stock_status: e.target.value })}
                disabled={disabled}
                className="w-full bg-[#161616] border border-white/10 text-white font-body text-xs px-2 py-2 focus:outline-none focus:border-[#ff5500] appearance-none cursor-pointer pr-6"
              >
                {STOCK_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value} className="bg-[#161616]">{o.label}</option>
                ))}
              </select>
              <span
                className="material-symbols-outlined absolute right-1 top-1/2 -translate-y-1/2 pointer-events-none text-stone-500"
                style={{ fontSize: 13 }}
              >
                expand_more
              </span>
            </div>
          </div>
          <div>
            <p className="font-technical text-[9px] text-stone-600 uppercase tracking-widest mb-1">Price Override (BDT)</p>
            <input
              type="number"
              min={0}
              step={1}
              value={variant.price}
              onChange={(e) => onChange({ price: e.target.value })}
              placeholder="—"
              disabled={disabled}
              className="w-full bg-[#161616] border border-white/10 text-white font-body text-xs px-2 py-2 focus:outline-none focus:border-[#ff5500] transition-colors placeholder:text-stone-700"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ProductFormModal({ product, onClose, onSuccess }) {
  const isEdit = product !== null;
  const initialImages = parseProductImages(product?.image, product?.images);
  const { parentCategories, subCategories } = useCategories();
  const { colors: globalColors } = useColors();

  // Product fields
  const [name, setName] = useState(product?.name ?? '');
  const [slug, setSlug] = useState(product?.slug ?? '');
  const [description, setDescription] = useState(product?.description ?? '');
  const [price, setPrice] = useState(product?.price != null ? String(product.price) : '');
  const [costPrice, setCostPrice] = useState(product?.cost_price != null ? String(product.cost_price) : '');
  const [category, setCategory] = useState(product?.category ?? '');
  const [stockStatus, setStockStatus] = useState(product?.stock_status ?? 'in_stock');
  const [featured, setFeatured] = useState(product?.featured ?? false);
  const [newArrival, setNewArrival] = useState(product?.new_arrival ?? false);
  const [imageUrls, setImageUrls] = useState(initialImages);

  // Product-level image upload
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState(null);

  // Color variants
  const [hasColorVariants, setHasColorVariants] = useState(product?.has_color_variants ?? false);
  const [variants, setVariants] = useState([]);
  const [originalVariantIds, setOriginalVariantIds] = useState([]);
  const [variantUploading, setVariantUploading] = useState({});
  const [variantUploadProgress, setVariantUploadProgress] = useState({});
  const [variantUploadError, setVariantUploadError] = useState({});
  const variantFileInputRef = useRef(null);
  const [pendingVariantIdx, setPendingVariantIdx] = useState(null);

  // Form state
  const [fieldErrors, setFieldErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);

  const fileInputRef = useRef(null);
  const nameInputRef = useRef(null);

  useEffect(() => {
    const t = setTimeout(() => nameInputRef.current?.focus(), 80);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    const onKey = (e) => {
      if (
        e.key === 'Escape' &&
        !saving &&
        !uploading &&
        !Object.values(variantUploading).some(Boolean)
      ) {
        onClose();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, saving, uploading, variantUploading]);

  // Load existing variants when editing
  useEffect(() => {
    if (!isEdit || !product?.id) return;
    supabase
      .from('product_colors')
      .select('*')
      .eq('product_id', product.id)
      .order('sort_order', { ascending: true })
      .then(({ data }) => {
        if (data && data.length > 0) {
          setVariants(
            data.map((v) => ({
              id: v.id,
              color_id: v.color_id,
              name: v.name,
              hex: v.hex,
              image: v.image,
              images: v.images ?? [],
              stock_status: v.stock_status,
              price: v.price != null ? String(v.price) : '',
              is_active: v.is_active,
            }))
          );
          setOriginalVariantIds(data.map((v) => v.id));
        }
      });
  }, [isEdit, product?.id]);

  const addVariant = () => {
    setVariants((prev) => [
      ...prev,
      {
        id: null,
        color_id: null,
        name: '',
        hex: '#888888',
        image: '',
        images: [],
        stock_status: 'in_stock',
        price: '',
        is_active: true,
      },
    ]);
  };

  const updateVariant = (idx, patch) => {
    setVariants((prev) => prev.map((v, i) => (i === idx ? { ...v, ...patch } : v)));
  };

  const removeVariant = (idx) => {
    setVariants((prev) => prev.filter((_, i) => i !== idx));
    setVariantUploading((prev) => { const n = { ...prev }; delete n[idx]; return n; });
    setVariantUploadProgress((prev) => { const n = { ...prev }; delete n[idx]; return n; });
    setVariantUploadError((prev) => { const n = { ...prev }; delete n[idx]; return n; });
  };

  const moveVariant = (from, to) => {
    if (to < 0 || to >= variants.length) return;
    setVariants((prev) => {
      const next = [...prev];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return next;
    });
  };

  const handleVariantFileSelect = (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || pendingVariantIdx === null) return;
    const idx = pendingVariantIdx;
    setPendingVariantIdx(null);

    if (!ALLOWED_TYPES.includes(file.type)) {
      setVariantUploadError((prev) => ({ ...prev, [idx]: 'JPG, PNG or WebP only.' }));
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      setVariantUploadError((prev) => ({ ...prev, [idx]: 'Max 5 MB.' }));
      return;
    }

    setVariantUploadError((prev) => ({ ...prev, [idx]: null }));
    setVariantUploading((prev) => ({ ...prev, [idx]: true }));
    setVariantUploadProgress((prev) => ({ ...prev, [idx]: 0 }));

    const folder = `layercade/products/${categoryToFolder(category)}/variants`;
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', UPLOAD_PRESET);
    formData.append('folder', folder);

    const xhr = new XMLHttpRequest();
    xhr.open('POST', `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`);

    xhr.upload.addEventListener('progress', (evt) => {
      if (evt.lengthComputable) {
        setVariantUploadProgress((prev) => ({
          ...prev,
          [idx]: Math.round((evt.loaded / evt.total) * 100),
        }));
      }
    });

    xhr.onload = () => {
      setVariantUploading((prev) => ({ ...prev, [idx]: false }));
      if (xhr.status === 200) {
        const data = JSON.parse(xhr.responseText);
        updateVariant(idx, { image: data.secure_url, images: [data.secure_url] });
      } else {
        setVariantUploadError((prev) => ({ ...prev, [idx]: 'Upload failed.' }));
      }
    };

    xhr.onerror = () => {
      setVariantUploading((prev) => ({ ...prev, [idx]: false }));
      setVariantUploadError((prev) => ({ ...prev, [idx]: 'Network error.' }));
    };

    xhr.send(formData);
  };

  const handleNameChange = (val) => {
    setName(val);
    if (!isEdit) {
      setSlug(generateSlug(val));
      setFieldErrors((prev) => ({ ...prev, slug: undefined }));
    }
  };

  const handleSlugChange = (val) => {
    const lower = val.toLowerCase();
    setSlug(lower);
    const err = validateSlug(lower);
    setFieldErrors((prev) => ({ ...prev, slug: err ?? undefined }));
  };

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    if (imageUrls.length >= MAX_IMAGE_COUNT) {
      setUploadError(`You can upload up to ${MAX_IMAGE_COUNT} images per product.`);
      return;
    }
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
    setUploadProgress(0);

    const folder = `layercade/products/${categoryToFolder(category)}`;
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', UPLOAD_PRESET);
    formData.append('folder', folder);

    const xhr = new XMLHttpRequest();
    xhr.open('POST', `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`);

    xhr.upload.addEventListener('progress', (evt) => {
      if (evt.lengthComputable) {
        setUploadProgress(Math.round((evt.loaded / evt.total) * 100));
      }
    });

    xhr.onload = () => {
      setUploading(false);
      if (xhr.status === 200) {
        const data = JSON.parse(xhr.responseText);
        setImageUrls((prev) => [...prev, data.secure_url]);
        setFieldErrors((prev) => ({ ...prev, image: undefined }));
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

  const validate = () => {
    const errors = {};
    if (!name.trim()) errors.name = 'Name is required.';
    const slugErr = validateSlug(slug);
    if (slugErr) errors.slug = slugErr;
    if (!price || isNaN(Number(price)) || Number(price) < 0) errors.price = 'Enter a valid price.';
    if (imageUrls.length === 0) errors.image = 'Upload at least one image first.';
    if (imageUrls.length > MAX_IMAGE_COUNT) {
      errors.image = `You can upload up to ${MAX_IMAGE_COUNT} images per product.`;
    }
    if (hasColorVariants && variants.length > 0) {
      const badIdx = variants.findIndex((v) => !v.name.trim());
      if (badIdx >= 0) errors.variants = `Variant ${badIdx + 1} needs a color name.`;
    }
    return errors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaveError(null);

    const errors = validate();
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }
    setFieldErrors({});
    setSaving(true);

    const row = {
      name: name.trim(),
      slug: slug.trim(),
      description: description.trim(),
      price: Number(price),
      cost_price: costPrice !== '' && !isNaN(Number(costPrice)) ? Number(costPrice) : null,
      category,
      image: imageUrls[0] ?? '',
      images: imageUrls,
      featured,
      new_arrival: newArrival,
      stock_status: stockStatus,
      has_color_variants: hasColorVariants,
    };

    let savedProductId;

    if (!isEdit) {
      const { data: existing } = await supabase
        .from('products')
        .select('id')
        .eq('slug', row.slug)
        .maybeSingle();
      if (existing) {
        setFieldErrors({ slug: 'This slug is already taken.' });
        setSaving(false);
        return;
      }
      row.sort_order = 999;
      const { data: inserted, error } = await supabase
        .from('products')
        .insert(row)
        .select('id')
        .single();
      if (error) {
        setSaveError(error.message);
        setSaving(false);
        return;
      }
      savedProductId = inserted.id;
    } else {
      if (slug !== product.slug) {
        const { data: existing } = await supabase
          .from('products')
          .select('id')
          .eq('slug', row.slug)
          .maybeSingle();
        if (existing) {
          setFieldErrors({ slug: 'This slug is already taken.' });
          setSaving(false);
          return;
        }
      }
      const { error } = await supabase.from('products').update(row).eq('id', product.id);
      if (error) {
        setSaveError(error.message);
        setSaving(false);
        return;
      }
      savedProductId = product.id;
    }

    // Upsert variants
    if (hasColorVariants && variants.length > 0) {
      const variantRows = variants.map((v, i) => {
        const vrow = {
          product_id: savedProductId,
          color_id: v.color_id ?? null,
          name: v.name.trim() || 'Color',
          hex: /^#[0-9a-fA-F]{6}$/.test(v.hex) ? v.hex : '#888888',
          image: v.image || '',
          images: v.images ?? [],
          price: v.price !== '' && !isNaN(Number(v.price)) ? Number(v.price) : null,
          stock_status: v.stock_status,
          sort_order: i,
          is_active: v.is_active ?? true,
          updated_at: new Date().toISOString(),
        };
        if (v.id) vrow.id = v.id;
        return vrow;
      });
      const { error: varErr } = await supabase.from('product_colors').upsert(variantRows);
      if (varErr) {
        setSaveError(varErr.message);
        setSaving(false);
        return;
      }
    }

    // Delete removed variants
    if (isEdit && originalVariantIds.length > 0) {
      const keptIds = variants.filter((v) => v.id).map((v) => v.id);
      const toDelete = originalVariantIds.filter((id) => !keptIds.includes(id));
      if (toDelete.length > 0) {
        await supabase.from('product_colors').delete().in('id', toDelete);
      }
    }

    onSuccess(isEdit ? 'Product updated successfully.' : 'Product added successfully.');
    setSaving(false);
    onClose();
  };

  const isAnyVariantUploading = Object.values(variantUploading).some(Boolean);
  const isFormLocked = saving;
  const isLocked = saving || uploading || isAnyVariantUploading;

  const inputClass =
    'w-full bg-[#161616] border border-white/10 text-white font-body text-sm px-3 py-4 md:py-3 ' +
    'focus:outline-none focus:border-[#ff5500] transition-colors placeholder:text-stone-700';

  const removeImageAtIndex = (index) => {
    setImageUrls((prev) => prev.filter((_, i) => i !== index));
    setFieldErrors((prev) => ({ ...prev, image: undefined }));
  };

  const moveImage = (fromIndex, toIndex) => {
    if (toIndex < 0 || toIndex >= imageUrls.length) return;
    setImageUrls((prev) => {
      const next = [...prev];
      const [moved] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, moved);
      return next;
    });
  };

  return (
    <motion.div
      className="fixed inset-0 z-[150] bg-black/70 backdrop-blur-sm overflow-y-auto flex items-start justify-center md:p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      onClick={() => { if (!isLocked) onClose(); }}
    >
      <motion.div
        className="relative w-full min-h-screen md:min-h-0 md:max-w-2xl md:my-8 bg-[#111111] border-0 md:border md:border-white/10 p-6 md:p-8"
        initial={{ opacity: 0, y: 20, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 20, scale: 0.97 }}
        transition={{ duration: 0.25, ease: 'easeOut' }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={() => { if (!isLocked) onClose(); }}
          disabled={isLocked}
          className="absolute top-4 right-4 text-stone-500 hover:text-[#ff5500] transition-colors disabled:opacity-40 disabled:pointer-events-none"
        >
          <span className="material-symbols-outlined" style={{ fontSize: 22 }}>close</span>
        </button>

        <h2
          className="text-white uppercase mb-8 pr-8"
          style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '2rem' }}
        >
          {isEdit ? 'Edit Product' : 'Add New Product'}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-5" noValidate>
          <Field label="Product Name *" error={fieldErrors.name}>
            <input
              ref={nameInputRef}
              type="text"
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder="e.g. Batman Controller Stand"
              disabled={isFormLocked}
              className={inputClass}
            />
          </Field>

          <Field label="Slug *" error={fieldErrors.slug}>
            <input
              type="text"
              value={slug}
              onChange={(e) => handleSlugChange(e.target.value)}
              placeholder="e.g. batman-controller-stand"
              disabled={isFormLocked}
              className={inputClass}
            />
            <p className="font-technical text-[10px] text-stone-600 mt-1">
              URL: /{slug || '...'}
            </p>
          </Field>

          <Field label="Description">
            <textarea
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Short product description..."
              disabled={isFormLocked}
              className={inputClass + ' resize-none'}
            />
          </Field>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Selling Price (BDT) *" error={fieldErrors.price}>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 font-body text-stone-400 text-sm select-none">BDT</span>
                <input
                  type="number"
                  min={0}
                  step={1}
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder="0"
                  disabled={isFormLocked}
                  className={inputClass + ' pl-12'}
                />
              </div>
            </Field>

            <Field label="Cost Price (BDT)">
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 font-body text-stone-400 text-sm select-none">BDT</span>
                <input
                  type="number"
                  min={0}
                  step={1}
                  value={costPrice}
                  onChange={(e) => setCostPrice(e.target.value)}
                  placeholder="Optional"
                  disabled={isFormLocked}
                  className={inputClass + ' pl-12'}
                />
              </div>
              {costPrice !== '' && price !== '' && !isNaN(Number(costPrice)) && !isNaN(Number(price)) && Number(price) > 0 && (
                <p className="font-technical text-[10px] text-stone-500 mt-1">
                  Margin: {(((Number(price) - Number(costPrice)) / Number(price)) * 100).toFixed(1)}%
                  &nbsp;·&nbsp;Profit: ৳{(Number(price) - Number(costPrice)).toLocaleString('en-IN')}
                </p>
              )}
            </Field>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Category *">
              <div className="relative">
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  disabled={isFormLocked}
                  className={inputClass + ' appearance-none cursor-pointer pr-8'}
                >
                  <option value="" className="bg-[#161616]">— Select a category —</option>
                  {parentCategories.map((parent) => {
                    const children = subCategories.filter((s) => s.parent_id === parent.id);
                    return (
                      <optgroup key={parent.id} label={parent.name}>
                        {children.map((c) => (
                          <option key={c.id} value={c.name} className="bg-[#161616]">{c.name}</option>
                        ))}
                      </optgroup>
                    );
                  })}
                </select>
                <span className="material-symbols-outlined absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-stone-500" style={{ fontSize: 16 }}>expand_more</span>
              </div>
            </Field>

            <Field label="Stock Status *">
              <div className="relative">
                <select
                  value={stockStatus}
                  onChange={(e) => setStockStatus(e.target.value)}
                  disabled={isFormLocked}
                  className={inputClass + ' appearance-none cursor-pointer pr-8'}
                >
                  {STOCK_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value} className="bg-[#161616]">{o.label}</option>
                  ))}
                </select>
                <span className="material-symbols-outlined absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-stone-500" style={{ fontSize: 16 }}>expand_more</span>
              </div>
            </Field>
          </div>

          <Field label="Product Images *" error={fieldErrors.image ?? uploadError}>
            {(imageUrls.length > 0 || uploading) && (
              <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
                {imageUrls.map((imageUrl, index) => (
                  <div key={index} className="border border-white/10 bg-[#0f0f0f] p-2">
                    <div className="aspect-square overflow-hidden">
                      <img
                        src={imageUrl}
                        alt={`Product image ${index + 1}`}
                        className="h-full w-full object-cover"
                      />
                    </div>
                    <div className="mt-2 flex items-center justify-between gap-2">
                      <span className="font-technical text-[10px] uppercase tracking-widest text-stone-500">
                        {index === 0 ? 'Primary' : `Image ${index + 1}`}
                      </span>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => moveImage(index, index - 1)}
                          disabled={isLocked || index === 0}
                          className="text-stone-500 hover:text-white transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                          aria-label={`Move image ${index + 1} left`}
                        >
                          <span className="material-symbols-outlined" style={{ fontSize: 16 }}>arrow_back</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => moveImage(index, index + 1)}
                          disabled={isLocked || index === imageUrls.length - 1}
                          className="text-stone-500 hover:text-white transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                          aria-label={`Move image ${index + 1} right`}
                        >
                          <span className="material-symbols-outlined" style={{ fontSize: 16 }}>arrow_forward</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => removeImageAtIndex(index)}
                          disabled={isLocked}
                          className="text-stone-500 hover:text-red-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          aria-label={`Remove image ${index + 1}`}
                        >
                          <span className="material-symbols-outlined" style={{ fontSize: 16 }}>delete</span>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}

                {uploading && (
                  <div className="border border-white/10 border-dashed bg-[#0f0f0f] p-2">
                    <div className="aspect-square flex flex-col items-center justify-center gap-2">
                      <svg className="animate-spin w-6 h-6 text-[#ff5500]" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                      </svg>
                      <p className="font-technical text-[10px] text-stone-400 uppercase tracking-widest">
                        {uploadProgress}%
                      </p>
                      <div className="w-3/4 h-1 bg-white/10 overflow-hidden">
                        <div
                          className="h-full bg-[#ff5500] transition-all duration-200"
                          style={{ width: `${uploadProgress}%` }}
                        />
                      </div>
                    </div>
                    <p className="mt-2 font-technical text-[10px] uppercase tracking-widest text-stone-600 text-center">
                      Uploading…
                    </p>
                  </div>
                )}
              </div>
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
              disabled={isLocked || imageUrls.length >= MAX_IMAGE_COUNT}
              className="flex items-center gap-2 font-technical text-xs uppercase tracking-widest bg-[#161616] border border-white/10 px-4 py-3 text-stone-300 hover:border-[#ff5500] hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span className="material-symbols-outlined" style={{ fontSize: 16 }}>image</span>
              {imageUrls.length >= MAX_IMAGE_COUNT
                ? 'Image Limit Reached'
                : imageUrls.length > 0
                  ? 'Add Another Image'
                  : 'Select Image'}
            </button>

            <p className="font-technical text-[10px] text-stone-700 mt-1">
              JPG, PNG or WebP · max 5 MB · up to 6 images · uploads immediately on selection
            </p>
          </Field>

          <div className="space-y-3">
            <label className="flex items-center gap-3 cursor-pointer group">
              <input
                type="checkbox"
                checked={featured}
                onChange={(e) => setFeatured(e.target.checked)}
                disabled={isFormLocked}
                className="w-4 h-4 accent-[#ff5500]"
              />
              <span className="font-body text-stone-300 text-sm group-hover:text-white transition-colors select-none">
                Show in Best Sellers section
              </span>
            </label>
            <label className="flex items-center gap-3 cursor-pointer group">
              <input
                type="checkbox"
                checked={newArrival}
                onChange={(e) => setNewArrival(e.target.checked)}
                disabled={isFormLocked}
                className="w-4 h-4 accent-[#ff5500]"
              />
              <span className="font-body text-stone-300 text-sm group-hover:text-white transition-colors select-none">
                Show in New Arrivals section
              </span>
            </label>
          </div>

          {/* Color Variants */}
          <div className="border-t border-white/10 pt-5">
            <label className="flex items-start gap-3 cursor-pointer group">
              <input
                type="checkbox"
                checked={hasColorVariants}
                onChange={(e) => setHasColorVariants(e.target.checked)}
                disabled={isFormLocked}
                className="w-4 h-4 accent-[#ff5500] mt-0.5 flex-shrink-0"
              />
              <div>
                <span className="font-body text-stone-300 text-sm group-hover:text-white transition-colors select-none">
                  Has color variants
                </span>
                <p className="font-technical text-[10px] text-stone-600 mt-0.5">
                  Each variant can have its own image, stock status and price override
                </p>
              </div>
            </label>

            {hasColorVariants && (
              <div className="mt-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-technical text-[10px] uppercase tracking-widest text-stone-500">
                    Color Variants ({variants.length})
                  </span>
                  <button
                    type="button"
                    onClick={addVariant}
                    disabled={isLocked}
                    className="flex items-center gap-1 font-technical text-[10px] uppercase tracking-widest text-[#ff5500] hover:text-white transition-colors disabled:opacity-50"
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: 14 }}>add</span>
                    Add Variant
                  </button>
                </div>

                {fieldErrors.variants && (
                  <p className="font-technical text-[10px] text-red-400">{fieldErrors.variants}</p>
                )}

                {variants.length === 0 ? (
                  <div className="border border-dashed border-white/10 p-6 text-center">
                    <p className="font-technical text-[10px] uppercase tracking-widest text-stone-600">
                      No variants yet — click Add Variant
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {variants.map((v, i) => (
                      <VariantRow
                        key={v.id ?? `new-${i}`}
                        variant={v}
                        index={i}
                        total={variants.length}
                        globalColors={globalColors}
                        uploading={!!variantUploading[i]}
                        uploadProgress={variantUploadProgress[i] ?? 0}
                        uploadError={variantUploadError[i] ?? null}
                        onChange={(patch) => updateVariant(i, patch)}
                        onRemove={() => removeVariant(i)}
                        onMoveUp={() => moveVariant(i, i - 1)}
                        onMoveDown={() => moveVariant(i, i + 1)}
                        onImageUpload={() => {
                          setPendingVariantIdx(i);
                          variantFileInputRef.current?.click();
                        }}
                        disabled={isLocked}
                      />
                    ))}
                  </div>
                )}

                <input
                  ref={variantFileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleVariantFileSelect}
                  className="hidden"
                />
              </div>
            )}
          </div>

          <AnimatePresence>
            {saveError && (
              <motion.div
                className="bg-red-950/40 border border-red-800/60 p-3 flex items-center gap-3"
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
              >
                <span
                  className="material-symbols-outlined text-red-500 flex-shrink-0"
                  style={{ fontSize: 16, fontVariationSettings: "'FILL' 1" }}
                >
                  error
                </span>
                <p className="font-body text-red-400 text-sm">{saveError}</p>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={() => { if (!isLocked) onClose(); }}
              disabled={isLocked}
              className="flex-1 py-4 md:py-3 font-technical text-xs uppercase tracking-widest bg-white/10 text-stone-300 hover:bg-white/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLocked}
              className="flex-1 clip-parallelogram bg-[#ff5500] text-white font-technical text-xs uppercase tracking-widest py-4 md:py-3 flex items-center justify-center gap-2 hover:shadow-[0_0_20px_rgba(255,85,0,0.3)] transition-all disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {saving ? (
                <>
                  <svg className="animate-spin w-3 h-3" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                  Saving...
                </>
              ) : isEdit ? 'Update Product' : 'Add Product'}
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}
