import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { parseProductImages } from '../../lib/productImages';
import { supabase } from '../../lib/supabase';
import { useCategories } from '../../lib/useCategories';

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

export default function ProductFormModal({ product, onClose, onSuccess }) {
  const isEdit = product !== null;
  const initialImages = parseProductImages(product?.image, product?.images);
  const { categories } = useCategories();

  const [name, setName] = useState(product?.name ?? '');
  const [slug, setSlug] = useState(product?.slug ?? '');
  const [description, setDescription] = useState(product?.description ?? '');
  const [price, setPrice] = useState(product?.price != null ? String(product.price) : '');
  const [category, setCategory] = useState(product?.category ?? '');
  const [stockStatus, setStockStatus] = useState(product?.stock_status ?? 'in_stock');
  const [featured, setFeatured] = useState(product?.featured ?? false);
  const [newArrival, setNewArrival] = useState(product?.new_arrival ?? false);
  const [imageUrls, setImageUrls] = useState(initialImages);

  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState(null);

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
      if (e.key === 'Escape' && !saving && !uploading) onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, saving, uploading]);

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
      category,
      image: imageUrls[0] ?? '',
      images: imageUrls,
      featured,
      new_arrival: newArrival,
      stock_status: stockStatus,
    };

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
      const { error } = await supabase.from('products').insert(row);
      if (error) {
        setSaveError(error.message);
        setSaving(false);
        return;
      }
      onSuccess('Product added successfully.');
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
      onSuccess('Product updated successfully.');
    }

    setSaving(false);
    onClose();
  };

  const inputClass =
    'w-full bg-[#161616] border border-white/10 text-white font-body text-sm px-3 py-4 md:py-3 ' +
    'focus:outline-none focus:border-[#ff5500] transition-colors placeholder:text-stone-700';

  // Only saving locks the text fields — uploading does not.
  const isFormLocked = saving;
  // Image controls and the action buttons are locked during both upload and save.
  const isLocked = saving || uploading;

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

          <Field label="Price (BDT) *" error={fieldErrors.price}>
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

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Category *">
              <div className="relative">
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  disabled={isFormLocked}
                  className={inputClass + ' appearance-none cursor-pointer pr-8'}
                >
                  {categories.map((c) => (
                    <option key={c.name} value={c.name} className="bg-[#161616]">{c.name}</option>
                  ))}
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
